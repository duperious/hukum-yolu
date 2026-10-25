// ============================================================
// Hüküm Yolu — Edge Function işlemleri
// ============================================================
// Lobi, oyun ve oturum işlemlerinin sunucu tarafı. İstemciden gelen
// hiçbir rol/oy/sonuç bilgisi doğrudan kabul edilmez; tüm kurallar
// `engine` kopyasındaki saf TypeScript motorunda çalışır.
// ============================================================

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.47.10';
import {
  GameError,
  applyPlayerAction,
  autoResolveBots,
  startGame,
} from '../engine/index.ts';
import type { GameAction, GameState } from '../engine/types.ts';
import {
  EdgeError,
  MAX_PLAYERS,
  MIN_PLAYERS,
  SessionGoneError,
  VersionConflictError,
  asString,
  generateRoomCode,
  generateSecret,
  isPlayerConnected,
  isRecord,
  isUuid,
  normalizeName,
  normalizeRoomCodeInput,
  nowIso,
  oldIso,
  pickBotName,
  randomAvatarId,
  safeEqual,
  sha256Hex,
  validateAvatarId,
  type AuthSnapshot,
  type PlayerRow,
  type RoomRow,
  type RoomSnapshot,
} from './server-types.ts';
import {
  addRoomMember,
  bumpRoom,
  commitState,
  findPlayer,
  findRoomByCode,
  loadPlayers,
  loadRoom,
  loadSnapshot,
  loadState,
  promoteHost,
  updatePresence,
} from './db.ts';

export interface AuthContext {
  room: RoomRow;
  player: PlayerRow;
}

// ------------------------------------------------------------
// Oturum doğrulama
// ------------------------------------------------------------

export async function authenticate(
  admin: SupabaseClient,
  body: Record<string, unknown>,
): Promise<AuthContext> {
  const roomCode = normalizeRoomCodeInput(body.roomCode);
  const playerId = body.playerId;
  const playerSecret = body.playerSecret;

  if (
    !roomCode ||
    !isUuid(playerId) ||
    typeof playerSecret !== 'string' ||
    playerSecret.length < 32 ||
    playerSecret.length > 256
  ) {
    throw new EdgeError(
      'Oturum bilgileri eksik veya geçersiz. Odaya yeniden katılın.',
      401,
    );
  }

  const room = await findRoomByCode(admin, roomCode);
  if (!room) throw new EdgeError('Oda bulunamadı.', 404);

  const player = await findPlayer(admin, room.id, playerId);
  if (!player) {
    throw new EdgeError('Oyuncu bulunamadı. Odaya yeniden katılın.', 401);
  }
  if (player.is_bot || !player.secret_hash) {
    throw new EdgeError('Oturum doğrulanamadı. Odaya yeniden katılın.', 401);
  }

  const hash = await sha256Hex(playerSecret);
  if (!safeEqual(hash, player.secret_hash)) {
    throw new EdgeError('Oturum doğrulanamadı. Odaya yeniden katılın.', 401);
  }

  await updatePresence(admin, player);
  return { room, player };
}

// ------------------------------------------------------------
// Oda kurma / katılma
// ------------------------------------------------------------

export async function createRoom(
  admin: SupabaseClient,
  body: Record<string, unknown>,
): Promise<AuthSnapshot> {
  const name = normalizeName(body.name);
  const avatarId = validateAvatarId(body.avatarId);
  if (!name) {
    throw new EdgeError(
      "Görünen ad 3-16 karakter olmalı ve yalnızca harf, sayı, boşluk, . _ - ' içerebilir.",
      400,
    );
  }
  if (!avatarId) {
    throw new EdgeError('Avatar seçimi kabul edilmedi.', 400);
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateRoomCode();
    const playerId = crypto.randomUUID();
    const secret = generateSecret();
    const secretHash = await sha256Hex(secret);

    const { data: roomData, error: roomError } = await admin
      .from('rooms')
      .insert({ code, host_id: playerId, status: 'lobby', version: 1 })
      .select('*')
      .single();

    if (roomError) {
      if (roomError.code === '23505') continue;
      throw roomError;
    }

    const room = roomData as RoomRow;
    try {
      await addRoomMember(admin, {
        roomId: room.id,
        playerId,
        name,
        avatarId,
        secretHash,
        isBot: false,
        ready: false,
        isHost: true,
      });
      const snapshot = await loadSnapshot(admin, room.id, playerId);
      return { ...snapshot, playerSecret: secret };
    } catch (error) {
      await admin.from('rooms').delete().eq('id', room.id);
      throw error;
    }
  }

  throw new EdgeError('Oda kodu üretilemedi. Lütfen tekrar deneyin.', 503);
}

export async function joinRoom(
  admin: SupabaseClient,
  body: Record<string, unknown>,
): Promise<AuthSnapshot> {
  const code = normalizeRoomCodeInput(body.roomCode);
  if (!code) throw new EdgeError('Oda kodu geçersiz.', 400);

  const name = normalizeName(body.name);
  const avatarId = validateAvatarId(body.avatarId);
  if (!name) {
    throw new EdgeError(
      "Görünen ad 3-16 karakter olmalı ve yalnızca harf, sayı, boşluk, . _ - ' içerebilir.",
      400,
    );
  }
  if (!avatarId) {
    throw new EdgeError('Avatar seçimi kabul edilmedi.', 400);
  }

  const room = await findRoomByCode(admin, code);
  if (!room) throw new EdgeError('Oda bulunamadı.', 404);
  if (room.status !== 'lobby') {
    throw new EdgeError('Oyun başlamış; yeni bir oda kurun.', 409);
  }

  const playerId = crypto.randomUUID();
  const secret = generateSecret();
  const secretHash = await sha256Hex(secret);

  try {
    await addRoomMember(admin, {
      roomId: room.id,
      playerId,
      name,
      avatarId,
      secretHash,
      isBot: false,
      ready: false,
      isHost: false,
    });

    const snapshot = await loadSnapshot(admin, room.id, playerId);
    return { ...snapshot, playerSecret: secret };
  } catch (error) {
    // Yanıt üretilemezse yarım kalmış üyeliği temizle.
    await admin.from('room_players').delete().eq('id', playerId);
    throw error;
  }
}

// ------------------------------------------------------------
// Durum okuma / bağlantı
// ------------------------------------------------------------

export async function getState(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<RoomSnapshot> {
  return loadSnapshot(admin, auth.room.id, auth.player.id);
}

export function heartbeat(): { ok: true; serverTime: string } {
  return { ok: true, serverTime: nowIso() };
}

// ------------------------------------------------------------
// Lobiden ayrılma / oyun sırasında bot devri
// ------------------------------------------------------------

function pickNewHost(humans: PlayerRow[]): PlayerRow | null {
  const connected = humans.filter((player) => isPlayerConnected(player));
  return connected[0] ?? humans[0] ?? null;
}

async function convertPlayerToBot(
  admin: SupabaseClient,
  roomId: string,
  playerId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const room = await loadRoom(admin, roomId);
    if (room.status !== 'playing') return;

    const state = await loadState(admin, roomId);
    if (!state) return;

    const target = state.players.find((player) => player.id === playerId);
    if (!target || target.isBot) return;

    let next: GameState = {
      ...state,
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, isBot: true } : player,
      ),
    };
    next = autoResolveBots(next);
    next.version = Number(room.version) + 1;
    const status = next.winner ? 'finished' : 'playing';

    try {
      await commitState(admin, roomId, Number(room.version), next, status);
      return;
    } catch (error) {
      if (error instanceof VersionConflictError) continue;
      throw error;
    }
  }

  throw new VersionConflictError();
}

export async function leaveRoom(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<{ ok: true }> {
  const room = await loadRoom(admin, auth.room.id);
  const players = await loadPlayers(admin, room.id);
  const otherHumans = players.filter(
    (player) => player.id !== auth.player.id && !player.is_bot,
  );
  const wasHost = room.host_id === auth.player.id;
  const newHost = wasHost ? pickNewHost(otherHumans) : null;

  if (room.status === 'playing') {
    if (otherHumans.length === 0) {
      const { error } = await admin.from('rooms').delete().eq('id', room.id);
      if (error) throw error;
      return { ok: true };
    }

    await convertPlayerToBot(admin, room.id, auth.player.id);

    if (newHost) await promoteHost(admin, room.id, newHost.id);

    const { error } = await admin
      .from('room_players')
      .update({
        is_bot: true,
        secret_hash: null,
        connected: false,
        last_seen: oldIso(),
      })
      .eq('id', auth.player.id);
    if (error) throw error;

    return { ok: true };
  }

  const { error: deleteError } = await admin
    .from('room_players')
    .delete()
    .eq('id', auth.player.id);
  if (deleteError) throw deleteError;

  if (otherHumans.length === 0) {
    const { error } = await admin.from('rooms').delete().eq('id', room.id);
    if (error) throw error;
    return { ok: true };
  }

  if (newHost) await promoteHost(admin, room.id, newHost.id);
  await bumpRoom(admin, room.id);
  return { ok: true };
}

// ------------------------------------------------------------
// Lobi işlemleri
// ------------------------------------------------------------

export async function handleLobbyAction(
  admin: SupabaseClient,
  auth: AuthContext,
  body: Record<string, unknown>,
): Promise<RoomSnapshot> {
  const action = body.lobbyAction;
  if (!isRecord(action) || typeof action.type !== 'string') {
    throw new EdgeError('Lobi işlemi kabul edilmedi.', 400);
  }

  // Yeniden başlatma bitmiş oyunda çalışır; diğerleri yalnızca lobide.
  if (action.type === 'restart') {
    return restartMultiplayerGame(admin, auth);
  }
  if (auth.room.status !== 'lobby') {
    throw new EdgeError('Lobi artık açık değil.', 409);
  }

  switch (action.type) {
    case 'toggle_ready':
      return toggleReady(admin, auth);
    case 'update_profile':
      return updateProfile(admin, auth, action);
    case 'add_bot':
      return addBot(admin, auth);
    case 'remove_bot':
      return removeBot(admin, auth, action);
    case 'kick':
      return kickPlayer(admin, auth, action);
    case 'start':
      return startMultiplayerGame(admin, auth);
    case 'claim_host':
      return claimHost(admin, auth);
    default:
      throw new EdgeError('Lobi işlemi kabul edilmedi.', 400);
  }
}

async function toggleReady(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.status !== 'lobby') {
    throw new EdgeError('Lobi artık açık değil.', 409);
  }
  const player = await findPlayer(admin, room.id, auth.player.id);
  if (!player) throw new SessionGoneError();

  const { error } = await admin
    .from('room_players')
    .update({ ready: !player.ready })
    .eq('id', player.id);
  if (error) throw error;

  await bumpRoom(admin, room.id);
  return loadSnapshot(admin, room.id, auth.player.id);
}

async function updateProfile(
  admin: SupabaseClient,
  auth: AuthContext,
  action: Record<string, unknown>,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.status !== 'lobby') {
    throw new EdgeError('Lobi artık açık değil.', 409);
  }

  const name = normalizeName(action.name);
  const avatarId = validateAvatarId(action.avatarId);
  if (!name) {
    throw new EdgeError(
      "Görünen ad 3-16 karakter olmalı ve yalnızca harf, sayı, boşluk, . _ - ' içerebilir.",
      400,
    );
  }
  if (!avatarId) {
    throw new EdgeError('Avatar seçimi kabul edilmedi.', 400);
  }

  const { error } = await admin
    .from('room_players')
    .update({ name, avatar_id: avatarId })
    .eq('id', auth.player.id);
  if (error) throw error;

  await bumpRoom(admin, room.id);
  return loadSnapshot(admin, room.id, auth.player.id);
}

async function addBot(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.host_id !== auth.player.id) {
    throw new EdgeError('Yalnızca host bot ekleyebilir.', 403);
  }
  if (room.status !== 'lobby') {
    throw new EdgeError('Oyun başlamış; bot eklenemez.', 409);
  }

  const players = await loadPlayers(admin, room.id);
  const name = pickBotName(players.map((player) => player.name));
  const avatarId = randomAvatarId();
  const botId = crypto.randomUUID();

  await addRoomMember(admin, {
    roomId: room.id,
    playerId: botId,
    name,
    avatarId,
    secretHash: null,
    isBot: true,
    ready: true,
    isHost: false,
  });

  return loadSnapshot(admin, room.id, auth.player.id);
}

async function removeBot(
  admin: SupabaseClient,
  auth: AuthContext,
  action: Record<string, unknown>,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.host_id !== auth.player.id) {
    throw new EdgeError('Yalnızca host bot çıkarabilir.', 403);
  }
  if (room.status !== 'lobby') {
    throw new EdgeError('Lobi artık açık değil.', 409);
  }

  const targetId = asString(action.playerId);
  if (!targetId) throw new EdgeError('Bot seçilmedi.', 400);

  const target = await findPlayer(admin, room.id, targetId);
  if (!target) throw new EdgeError('Bot artık odada değil.', 404);
  if (!target.is_bot) throw new EdgeError('Bu oyuncu bot değil.', 400);

  const { error } = await admin
    .from('room_players')
    .delete()
    .eq('id', target.id);
  if (error) throw error;

  await bumpRoom(admin, room.id);
  return loadSnapshot(admin, room.id, auth.player.id);
}

async function kickPlayer(
  admin: SupabaseClient,
  auth: AuthContext,
  action: Record<string, unknown>,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.host_id !== auth.player.id) {
    throw new EdgeError('Yalnızca host oyuncu çıkarabilir.', 403);
  }
  if (room.status !== 'lobby') {
    throw new EdgeError('Lobi artık açık değil.', 409);
  }

  const targetId = asString(action.playerId);
  if (!targetId) throw new EdgeError('Hedef oyuncu seçilmedi.', 400);
  if (targetId === auth.player.id) {
    throw new EdgeError('Kendini çıkaramazsın.', 400);
  }

  const target = await findPlayer(admin, room.id, targetId);
  if (!target) throw new EdgeError('Hedef oyuncu artık odada değil.', 404);
  if (target.id === room.host_id) {
    throw new EdgeError("Host çıkarılamaz. Önce host'luğu devret.", 400);
  }

  const { error } = await admin
    .from('room_players')
    .delete()
    .eq('id', target.id);
  if (error) throw error;

  await bumpRoom(admin, room.id);
  return loadSnapshot(admin, room.id, auth.player.id);
}

async function claimHost(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.host_id === auth.player.id) {
    throw new EdgeError("Zaten host'sun.", 400);
  }
  if (room.status !== 'lobby') {
    throw new EdgeError('Host devri yalnızca lobide yapılabilir.', 409);
  }

  const players = await loadPlayers(admin, room.id);
  const host = players.find((player) => player.id === room.host_id);
  if (host && isPlayerConnected(host)) {
    throw new EdgeError('Host hâlâ bağlı.', 409);
  }

  const { data: updated, error } = await admin
    .from('rooms')
    .update({ host_id: auth.player.id, updated_at: nowIso() })
    .eq('id', room.id)
    .eq('host_id', room.host_id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!updated) throw new EdgeError('Host değişti. Yeniden deneyin.', 409);

  await promoteHost(admin, room.id, auth.player.id);
  await bumpRoom(admin, room.id);
  return loadSnapshot(admin, room.id, auth.player.id);
}

async function startMultiplayerGame(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<RoomSnapshot> {
  const snapshot = await loadSnapshot(admin, auth.room.id, auth.player.id);
  if (!snapshot.you.isHost) {
    throw new EdgeError('Yalnızca host oyunu başlatabilir.', 403);
  }
  if (!snapshot.lobby) {
    throw new EdgeError('Lobi artık açık değil.', 409);
  }
  if (!snapshot.lobby.canStart) {
    throw new EdgeError(
      snapshot.lobby.startBlockReason ?? 'Oyun başlatılamaz.',
      409,
    );
  }

  const players = snapshot.lobby.players.map((player) => ({
    id: player.id,
    name: player.name,
    avatarId: player.avatarId,
    isBot: player.isBot,
    isHost: player.isHost,
    joinedAt: new Date(player.joinedAt).getTime(),
  }));

  let state = startGame({
    players,
    mode: 'multiplayer',
    id: snapshot.room.id,
  });
  state = autoResolveBots(state);
  state.version = snapshot.room.version + 1;

  await commitState(
    admin,
    snapshot.room.id,
    snapshot.room.version,
    state,
    'playing',
  );
  return loadSnapshot(admin, snapshot.room.id, auth.player.id);
}

async function restartMultiplayerGame(
  admin: SupabaseClient,
  auth: AuthContext,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.host_id !== auth.player.id) {
    throw new EdgeError('Yalnızca host yeniden başlatabilir.', 403);
  }
  if (room.status !== 'finished') {
    throw new EdgeError('Oyun henüz bitmedi.', 409);
  }

  const players = await loadPlayers(admin, room.id);
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new EdgeError(
      `Yeniden başlatmak için ${MIN_PLAYERS}-${MAX_PLAYERS} oyuncu gerekli.`,
      409,
    );
  }

  const startPlayers = players.map((player) => ({
    id: player.id,
    name: player.name,
    avatarId: player.avatar_id,
    isBot: player.is_bot,
    isHost: player.is_host,
    joinedAt: new Date(player.joined_at).getTime(),
  }));

  let state = startGame({
    players: startPlayers,
    mode: 'multiplayer',
    id: room.id,
  });
  state = autoResolveBots(state);
  state.version = Number(room.version) + 1;

  await commitState(admin, room.id, Number(room.version), state, 'playing');
  return loadSnapshot(admin, room.id, auth.player.id);
}

// ------------------------------------------------------------
// Oyun işlemleri
// ------------------------------------------------------------

function isPolicyCard(value: unknown): value is 'demokratik' | 'otokrat' {
  return value === 'demokratik' || value === 'otokrat';
}

function parseGameAction(input: unknown): GameAction | null {
  if (!isRecord(input) || typeof input.type !== 'string') return null;

  switch (input.type) {
    case 'ack_role':
      return { type: 'ack_role' };
    case 'nominate':
      return typeof input.targetId === 'string'
        ? { type: 'nominate', targetId: input.targetId }
        : null;
    case 'vote':
      return typeof input.choice === 'boolean'
        ? { type: 'vote', choice: input.choice }
        : null;
    case 'president_discard':
      return isPolicyCard(input.card)
        ? { type: 'president_discard', card: input.card }
        : null;
    case 'chancellor_enact':
      return isPolicyCard(input.card)
        ? { type: 'chancellor_enact', card: input.card }
        : null;
    case 'investigate':
      return typeof input.targetId === 'string'
        ? { type: 'investigate', targetId: input.targetId }
        : null;
    case 'use_block':
      return typeof input.targetId === 'string'
        ? { type: 'use_block', targetId: input.targetId }
        : null;
    case 'skip_block':
      return { type: 'skip_block' };
    case 'choose_notr_side':
      return input.side === 'mavi' || input.side === 'kirmizi'
        ? { type: 'choose_notr_side', side: input.side }
        : null;
    case 'assassinate':
      return typeof input.targetId === 'string'
        ? { type: 'assassinate', targetId: input.targetId }
        : null;
    case 'ack_peek':
      return { type: 'ack_peek' };
    default:
      return null;
  }
}

export async function handleGameAction(
  admin: SupabaseClient,
  auth: AuthContext,
  body: Record<string, unknown>,
): Promise<RoomSnapshot> {
  const room = await loadRoom(admin, auth.room.id);
  if (room.status !== 'playing') {
    throw new EdgeError('Oyun şu anda oynanmıyor.', 409);
  }

  const state = await loadState(admin, room.id);
  if (!state) {
    throw new EdgeError(
      'Oyun durumu hazır değil. Lütfen yeniden deneyin.',
      409,
    );
  }

  const actor = state.players.find((player) => player.id === auth.player.id);
  if (!actor) throw new EdgeError('Bu oyunun oyuncusu değilsin.', 403);
  if (actor.isBot) throw new EdgeError('Botlar adına işlem yapılamaz.', 403);

  const gameAction = parseGameAction(body.gameAction);
  if (!gameAction) throw new EdgeError('Oyun işlemi kabul edilmedi.', 400);

  let next: GameState;
  try {
    next = applyPlayerAction(state, auth.player.id, gameAction);
  } catch (error) {
    if (error instanceof GameError) {
      throw new EdgeError(error.message, 400);
    }
    if (error instanceof Error && error.message === 'Oyuncu bulunamadı.') {
      throw new EdgeError('Hedef oyuncu artık oyunda değil.', 400);
    }
    throw error;
  }

  const status = next.winner ? 'finished' : 'playing';
  next.version = Number(room.version) + 1;
  await commitState(admin, room.id, Number(room.version), next, status);

  return loadSnapshot(admin, room.id, auth.player.id);
}
