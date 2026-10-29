import {
  applyPlayerAction,
  autoResolveBots,
  GAME_CONFIG,
  GameError,
  redactGameState,
  restartGame,
  startGame,
} from '../game';
import type {
  GameAction,
  GameState,
  RedactedGameState,
  StartGamePlayer,
} from '../game';
import {
  AVATARS,
  getAvatar,
  isValidAvatarId,
  randomAvatarId,
} from '../config/avatars';
import { normalizeName, validateName } from '../lib/profile';
import { makePlayerId, makeToken } from './roomCode';
import type {
  HostRoomState,
  LobbyAction,
  LobbyDto,
  NetPlayer,
  RoomSnapshot,
  RoomStatus,
} from './types';

const BOT_NAMES = [
  'Selin',
  'Kaan',
  'Derya',
  'Mert',
  'Ece',
  'Barış',
  'Zeynep',
  'Emir',
  'Defne',
  'Arda',
  'İpek',
  'Kerem',
];

export class RoomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomError';
  }
}

function now(): number {
  return Date.now();
}

function touch(state: HostRoomState): HostRoomState {
  return {
    ...state,
    updatedAt: now(),
    version: state.version + 1,
  };
}

function sameName(a: string, b: string): boolean {
  return a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR');
}

function pickAvatar(desired: string, players: NetPlayer[]): string {
  const used = new Set(players.map((player) => player.avatarId));
  if (isValidAvatarId(desired) && !used.has(desired)) return desired;
  const free = AVATARS.find((avatar) => !used.has(avatar.id));
  return free?.id ?? randomAvatarId();
}

function uniqueBotName(players: NetPlayer[]): string {
  const used = new Set(players.map((player) => player.name.toLocaleLowerCase('tr-TR')));
  const free = BOT_NAMES.find((name) => !used.has(name.toLocaleLowerCase('tr-TR')));
  if (free) return free;
  let index = 2;
  while (used.has(`bot ${index}`)) index += 1;
  return `Bot ${index}`;
}

function requirePlayer(state: HostRoomState, playerId: string): NetPlayer {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) throw new RoomError('Oyuncu bu odada bulunamadı.');
  return player;
}

function requireHost(state: HostRoomState, playerId: string): void {
  if (state.hostId !== playerId) {
    throw new RoomError('Bu işlemi yalnızca oda sahibi yapabilir.');
  }
}

function validateProfile(name: string, avatarId: string): { name: string; avatarId: string } {
  const normalized = normalizeName(name);
  const nameError = validateName(normalized);
  if (nameError) throw new RoomError(nameError);
  return {
    name: normalized,
    avatarId: getAvatar(isValidAvatarId(avatarId) ? avatarId : randomAvatarId()).id,
  };
}

export function createHostRoom(
  code: string,
  profile: { name: string; avatarId: string },
): HostRoomState {
  const valid = validateProfile(profile.name, profile.avatarId);
  const createdAt = now();
  const host: NetPlayer = {
    id: makePlayerId('p'),
    token: makeToken(),
    name: valid.name,
    avatarId: valid.avatarId,
    isBot: false,
    isHost: true,
    ready: true,
    connected: true,
    joinedAt: createdAt,
  };
  return {
    code,
    hostId: host.id,
    status: 'lobby',
    players: [host],
    game: null,
    createdAt,
    updatedAt: createdAt,
    version: 1,
  };
}

export function findPlayerByToken(
  state: HostRoomState,
  token: string | null | undefined,
): NetPlayer | null {
  const clean = token?.trim();
  if (!clean) return null;
  return state.players.find((player) => player.token === clean) ?? null;
}

export function addHumanToRoom(
  state: HostRoomState,
  input: { name: string; avatarId: string },
): { state: HostRoomState; player: NetPlayer } {
  if (state.status !== 'lobby') {
    throw new RoomError('Oyun başladıktan sonra yeni oyuncu katılamaz.');
  }
  if (state.players.length >= GAME_CONFIG.maxPlayers) {
    throw new RoomError('Oda dolu.');
  }
  const valid = validateProfile(input.name, input.avatarId);
  if (state.players.some((player) => sameName(player.name, valid.name))) {
    throw new RoomError('Bu isim zaten kullanılıyor. Başka bir isim dene.');
  }
  const player: NetPlayer = {
    id: makePlayerId('p'),
    token: makeToken(),
    name: valid.name,
    avatarId: pickAvatar(valid.avatarId, state.players),
    isBot: false,
    isHost: false,
    ready: false,
    connected: true,
    joinedAt: now(),
  };
  return {
    state: touch({ ...state, players: [...state.players, player] }),
    player,
  };
}

export function addBotToRoom(state: HostRoomState): HostRoomState {
  if (state.status !== 'lobby') {
    throw new RoomError('Bot yalnızca lobide eklenebilir.');
  }
  if (state.players.length >= GAME_CONFIG.maxPlayers) {
    throw new RoomError('Oda dolu.');
  }
  const bot: NetPlayer = {
    id: makePlayerId('bot'),
    token: '',
    name: uniqueBotName(state.players),
    avatarId: pickAvatar('', state.players),
    isBot: true,
    isHost: false,
    ready: true,
    connected: true,
    joinedAt: now(),
  };
  return touch({ ...state, players: [...state.players, bot] });
}

export function removePlayerFromRoom(
  state: HostRoomState,
  playerId: string,
): HostRoomState {
  const player = requirePlayer(state, playerId);
  if (player.isHost) {
    throw new RoomError('Oda sahibi odadan çıkarılamaz.');
  }
  return touch({
    ...state,
    players: state.players.filter((entry) => entry.id !== playerId),
  });
}

export function toggleReadyInRoom(
  state: HostRoomState,
  playerId: string,
): HostRoomState {
  if (state.status !== 'lobby') {
    throw new RoomError('Hazır durumu yalnızca lobide değiştirilebilir.');
  }
  const player = requirePlayer(state, playerId);
  if (player.isBot) throw new RoomError('Botlar zaten hazırdır.');
  return touch({
    ...state,
    players: state.players.map((entry) =>
      entry.id === playerId ? { ...entry, ready: !entry.ready } : entry,
    ),
  });
}

export function updateProfileInRoom(
  state: HostRoomState,
  playerId: string,
  input: { name: string; avatarId: string },
): HostRoomState {
  if (state.status !== 'lobby') {
    throw new RoomError('Profil yalnızca lobide değiştirilebilir.');
  }
  const player = requirePlayer(state, playerId);
  const valid = validateProfile(input.name, input.avatarId);
  if (
    state.players.some(
      (entry) => entry.id !== playerId && sameName(entry.name, valid.name),
    )
  ) {
    throw new RoomError('Bu isim zaten kullanılıyor. Başka bir isim dene.');
  }
  return touch({
    ...state,
    players: state.players.map((entry) =>
      entry.id === playerId
        ? {
            ...entry,
            name: valid.name,
            avatarId: pickAvatar(valid.avatarId, state.players.filter((p) => p.id !== playerId)),
          }
        : entry,
    ),
  });
}

export function markConnected(
  state: HostRoomState,
  playerId: string,
  connected: boolean,
): HostRoomState {
  return touch({
    ...state,
    players: state.players.map((entry) =>
      entry.id === playerId ? { ...entry, connected } : entry,
    ),
  });
}

export function convertPlayerToBot(
  state: HostRoomState,
  playerId: string,
  options: { reclaimable?: boolean } = {},
): HostRoomState {
  const player = requirePlayer(state, playerId);
  if (player.isHost) throw new RoomError('Oda sahibi bota devredilemez.');
  if (player.isBot) return state;

  let game = state.game;
  if (game && game.phase !== 'gameOver') {
    const nextGame: GameState = {
      ...game,
      players: game.players.map((entry) =>
        entry.id === playerId ? { ...entry, isBot: true } : entry,
      ),
      updatedAt: now(),
      version: game.version + 1,
    };
    game = autoResolveBots(nextGame);
  }

  return touch({
    ...state,
    status: game?.phase === 'gameOver' ? 'finished' : game ? 'playing' : 'lobby',
    game,
    players: state.players.map((entry) =>
      entry.id === playerId
        ? {
            ...entry,
            isBot: true,
            connected: false,
            // Kopma kaynaklı devirde token korunur; oyuncu dönerse
            // botun devraldığı koltuğu geri alabilir. Bilerek ayrılan
            // oyuncunun token'ı ise silinir.
            token: options.reclaimable ? entry.token : '',
            ready: true,
          }
        : entry,
    ),
  });
}

/**
 * Kopma nedeniyle bota devredilen insan koltuğunu eski sahibine geri verir.
 * Yalnızca token'ı korunmuş botlar geri alınabilir.
 */
export function reclaimBotSeat(
  state: HostRoomState,
  playerId: string,
): HostRoomState {
  const player = requirePlayer(state, playerId);
  if (player.isHost || !player.isBot) {
    throw new RoomError('Bu koltuk geri alınamaz.');
  }
  if (!player.token) {
    throw new RoomError('Bu bot koltuğu bir oyuncuya ait değil.');
  }

  let game = state.game;
  if (game && game.phase !== 'gameOver') {
    game = {
      ...game,
      players: game.players.map((entry) =>
        entry.id === playerId ? { ...entry, isBot: false } : entry,
      ),
      updatedAt: now(),
      version: game.version + 1,
    };
  }

  return touch({
    ...state,
    status: game?.phase === 'gameOver' ? 'finished' : game ? 'playing' : 'lobby',
    game,
    players: state.players.map((entry) =>
      entry.id === playerId
        ? { ...entry, isBot: false, connected: true, ready: true }
        : entry,
    ),
  });
}

export function startRoomGame(state: HostRoomState, actorId: string): HostRoomState {
  requireHost(state, actorId);
  if (state.status !== 'lobby') throw new RoomError('Oyun zaten başladı.');
  const reason = startBlockReason(state);
  if (reason) throw new RoomError(reason);
  const players: StartGamePlayer[] = [...state.players]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((player) => ({
      id: player.id,
      name: player.name,
      avatarId: player.avatarId,
      isBot: player.isBot,
      isHost: player.isHost,
      joinedAt: player.joinedAt,
    }));
  try {
    const game = autoResolveBots(startGame({ players, mode: 'multiplayer' }));
    return touch({ ...state, status: 'playing', game });
  } catch (error) {
    if (error instanceof GameError) throw new RoomError(error.message);
    throw error;
  }
}

export function restartRoomGame(state: HostRoomState, actorId: string): HostRoomState {
  requireHost(state, actorId);
  if (!state.game) throw new RoomError('Yeniden başlatılacak oyun yok.');
  if (state.game.phase !== 'gameOver') {
    throw new RoomError('Oyun bitmeden yeniden başlatılamaz.');
  }
  try {
    const game = autoResolveBots(restartGame(state.game));
    return touch({ ...state, status: 'playing', game });
  } catch (error) {
    if (error instanceof GameError) throw new RoomError(error.message);
    throw error;
  }
}

export function applyGameActionToRoom(
  state: HostRoomState,
  actorId: string,
  action: GameAction,
): HostRoomState {
  if (!state.game) throw new RoomError('Oyun henüz başlamadı.');
  if (state.game.phase === 'gameOver') {
    throw new RoomError('Oyun bitti. Yeni oyun için yeniden başlatın.');
  }
  const member = state.players.find((player) => player.id === actorId);
  if (!member) throw new RoomError('Oyuncu bu odada bulunamadı.');
  if (member.isBot) throw new RoomError('Bu oyuncu artık bot tarafından oynanıyor.');
  try {
    const game = applyPlayerAction(state.game, actorId, action);
    return touch({
      ...state,
      status: game.phase === 'gameOver' ? 'finished' : 'playing',
      game,
    });
  } catch (error) {
    if (error instanceof GameError) throw new RoomError(error.message);
    throw error;
  }
}

export function applyLobbyAction(
  state: HostRoomState,
  actorId: string,
  action: LobbyAction,
): HostRoomState {
  switch (action.type) {
    case 'toggle_ready':
      return toggleReadyInRoom(state, actorId);
    case 'update_profile':
      return updateProfileInRoom(state, actorId, {
        name: action.name,
        avatarId: action.avatarId,
      });
    case 'add_bot':
      requireHost(state, actorId);
      return addBotToRoom(state);
    case 'remove_bot': {
      requireHost(state, actorId);
      const target = requirePlayer(state, action.botId);
      if (!target.isBot) throw new RoomError('Bu oyuncu bot değil.');
      return removePlayerFromRoom(state, action.botId);
    }
    case 'kick': {
      requireHost(state, actorId);
      const target = requirePlayer(state, action.playerId);
      if (target.isHost) throw new RoomError('Oda sahibi odadan çıkarılamaz.');
      if (target.isBot) throw new RoomError('Botu çıkarmak için bot kaldırma işlemini kullan.');
      return removePlayerFromRoom(state, action.playerId);
    }
    case 'start':
      return startRoomGame(state, actorId);
    case 'restart':
      return restartRoomGame(state, actorId);
    case 'claim_host':
      throw new RoomError(
        'Bu sürümde oda sahibi doğrudan tarayıcıda çalışır; host devri desteklenmiyor.',
      );
    default:
      throw new RoomError('Bilinmeyen lobi işlemi.');
  }
}

export function startBlockReason(state: HostRoomState): string | null {
  if (state.status !== 'lobby') return 'Oyun zaten başladı.';
  const total = state.players.length;
  if (total < GAME_CONFIG.minPlayers) {
    return `En az ${GAME_CONFIG.minPlayers} oyuncu gerekli. Şu an ${total}.`;
  }
  if (total > GAME_CONFIG.maxPlayers) {
    return `En fazla ${GAME_CONFIG.maxPlayers} oyuncu olabilir.`;
  }
  const waiting = state.players.filter((player) => !player.isBot && !player.ready);
  if (waiting.length > 0) {
    return `Hazır olmayan: ${waiting.map((player) => player.name).join(', ')}.`;
  }
  return null;
}

function publicStatus(state: HostRoomState): RoomStatus {
  if (!state.game) return 'lobby';
  return state.game.phase === 'gameOver' ? 'finished' : 'playing';
}

function safeRedact(game: GameState, viewerId: string): RedactedGameState | null {
  try {
    return redactGameState(game, viewerId);
  } catch {
    return null;
  }
}

export function projectRoom(
  state: HostRoomState,
  viewerId: string,
): RoomSnapshot {
  const viewer = requirePlayer(state, viewerId);
  const status = publicStatus(state);
  const reason = startBlockReason(state);
  const iso = (value: number) => new Date(value).toISOString();
  const lobby: LobbyDto | null =
    status === 'lobby'
      ? {
          code: state.code,
          hostId: state.hostId,
          players: state.players.map((player) => ({
            id: player.id,
            name: player.name,
            avatarId: player.avatarId,
            isBot: player.isBot,
            isHost: player.isHost,
            ready: player.isBot ? true : player.ready,
            connected: player.connected,
            joinedAt: iso(player.joinedAt),
            lastSeen: iso(state.updatedAt),
          })),
          minPlayers: GAME_CONFIG.minPlayers,
          maxPlayers: GAME_CONFIG.maxPlayers,
          canStart: status === 'lobby' && reason === null,
          startBlockReason: reason,
          canClaimHost: false,
        }
      : null;

  return {
    room: {
      id: state.code,
      code: state.code,
      hostId: state.hostId,
      status,
      version: state.version,
      createdAt: iso(state.createdAt),
      updatedAt: iso(state.updatedAt),
    },
    lobby,
    game: state.game ? safeRedact(state.game, viewerId) : null,
    you: {
      playerId: viewer.id,
      name: viewer.name,
      avatarId: viewer.avatarId,
      isHost: viewer.isHost,
    },
    serverTime: iso(now()),
  };
}
