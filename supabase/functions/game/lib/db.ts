// ============================================================
// Hüküm Yolu — Edge Function veri erişimi
// ============================================================
// Tüm sorgular service_role istemcisiyle yapılır. Bu dosya istemciye
// asla doğrudan açılmaz; yalnızca Edge Function içinde çalışır.
// ============================================================

import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.47.10';
import { redactGameState } from '../engine/index.ts';
import type { GameState } from '../engine/types.ts';
import {
  EdgeError,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RoomGoneError,
  SessionGoneError,
  VersionConflictError,
  isPlayerConnected,
  isVersionConflict,
  mapRpcError,
  nowIso,
  type LobbyDto,
  type PlayerRow,
  type RoomDto,
  type RoomRow,
  type RoomSnapshot,
  type RoomStatus,
  type YouDto,
} from './server-types.ts';

export function createAdminClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function loadRoom(
  admin: SupabaseClient,
  roomId: string,
): Promise<RoomRow> {
  const { data, error } = await admin
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new RoomGoneError();
  return data as RoomRow;
}

export async function findRoomByCode(
  admin: SupabaseClient,
  code: string,
): Promise<RoomRow | null> {
  const { data, error } = await admin
    .from('rooms')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomRow | null) ?? null;
}

export async function loadPlayers(
  admin: SupabaseClient,
  roomId: string,
): Promise<PlayerRow[]> {
  const { data, error } = await admin
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data as PlayerRow[] | null) ?? [];
}

export async function findPlayer(
  admin: SupabaseClient,
  roomId: string,
  playerId: string,
): Promise<PlayerRow | null> {
  const { data, error } = await admin
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('id', playerId)
    .maybeSingle();
  if (error) throw error;
  return (data as PlayerRow | null) ?? null;
}

export async function loadViewer(
  admin: SupabaseClient,
  roomId: string,
  viewerId: string,
): Promise<PlayerRow> {
  const player = await findPlayer(admin, roomId, viewerId);
  if (!player) throw new SessionGoneError();
  return player;
}

export async function loadState(
  admin: SupabaseClient,
  roomId: string,
): Promise<GameState | null> {
  const { data, error } = await admin
    .from('room_state')
    .select('state')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.state === null || data.state === undefined) return null;
  return data.state as GameState;
}

export function buildLobbyDto(
  room: RoomRow,
  players: PlayerRow[],
  viewerId: string,
): LobbyDto {
  const host = players.find((player) => player.id === room.host_id) ?? null;
  const hostConnected = host ? isPlayerConnected(host) : false;
  const humans = players.filter((player) => !player.is_bot);
  const allReady = humans.every((player) => player.ready);

  let startBlockReason: string | null = null;
  if (players.length < MIN_PLAYERS) {
    startBlockReason = `En az ${MIN_PLAYERS} oyuncu gerekli. Şu an ${players.length}.`;
  } else if (players.length > MAX_PLAYERS) {
    startBlockReason = `En fazla ${MAX_PLAYERS} oyuncu olabilir.`;
  } else if (!host) {
    startBlockReason = 'Host bulunamadı.';
  } else if (!hostConnected) {
    startBlockReason = "Host bağlı değil. Host'luğu devralın.";
  } else if (!allReady) {
    startBlockReason = 'Tüm insan oyuncular hazır olmalı.';
  }

  const canStart = startBlockReason === null;
  const canClaimHost =
    viewerId !== room.host_id && (!host || !hostConnected);

  return {
    code: room.code,
    hostId: room.host_id,
    players: players.map((player) => ({
      id: player.id,
      name: player.name,
      avatarId: player.avatar_id,
      isBot: player.is_bot,
      isHost: player.id === room.host_id,
      ready: player.is_bot ? true : player.ready,
      connected: isPlayerConnected(player),
      joinedAt: player.joined_at,
      lastSeen: player.last_seen,
    })),
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    canStart,
    startBlockReason,
    canClaimHost,
  };
}

function buildRoomDto(room: RoomRow): RoomDto {
  return {
    id: room.id,
    code: room.code,
    hostId: room.host_id,
    status: room.status,
    version: Number(room.version),
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

function buildYouDto(room: RoomRow, viewer: PlayerRow): YouDto {
  return {
    playerId: viewer.id,
    name: viewer.name,
    avatarId: viewer.avatar_id,
    isHost: viewer.id === room.host_id,
  };
}

export async function loadSnapshot(
  admin: SupabaseClient,
  roomId: string,
  viewerId: string,
): Promise<RoomSnapshot> {
  const [room, viewer, players, state] = await Promise.all([
    loadRoom(admin, roomId),
    loadViewer(admin, roomId, viewerId),
    loadPlayers(admin, roomId),
    loadState(admin, roomId),
  ]);

  let game = null;
  if (room.status !== 'lobby' && state) {
    try {
      game = redactGameState(state, viewerId);
    } catch {
      throw new EdgeError(
        'Oyun durumu yüklenemedi. Lütfen sayfayı yenileyin.',
        409,
      );
    }
  }

  return {
    room: buildRoomDto(room),
    lobby: room.status === 'lobby' ? buildLobbyDto(room, players, viewerId) : null,
    game,
    you: buildYouDto(room, viewer),
    serverTime: nowIso(),
  };
}

export async function updatePresence(
  admin: SupabaseClient,
  player: PlayerRow,
): Promise<void> {
  if (player.is_bot) return;
  const lastSeen = Date.parse(player.last_seen);
  const shouldWrite =
    !player.connected ||
    !Number.isFinite(lastSeen) ||
    Date.now() - lastSeen > 10_000;
  if (!shouldWrite) return;

  const { error } = await admin
    .from('room_players')
    .update({ connected: true, last_seen: nowIso() })
    .eq('id', player.id);
  if (error) throw error;
}

export async function bumpRoom(
  admin: SupabaseClient,
  roomId: string,
  status?: RoomStatus,
): Promise<number> {
  const { data, error } = await admin.rpc('bump_room_version', {
    p_room_id: roomId,
    p_status: status ?? null,
  });
  if (error) {
    const mapped = mapRpcError(error);
    throw new EdgeError(mapped.message, mapped.status);
  }
  return Number(data);
}

export interface AddRoomMemberInput {
  roomId: string;
  playerId: string;
  name: string;
  avatarId: string;
  secretHash: string | null;
  isBot: boolean;
  ready: boolean;
  isHost: boolean;
}

export async function addRoomMember(
  admin: SupabaseClient,
  input: AddRoomMemberInput,
): Promise<number> {
  const { data, error } = await admin.rpc('add_room_member', {
    p_room_id: input.roomId,
    p_player_id: input.playerId,
    p_name: input.name,
    p_avatar_id: input.avatarId,
    p_secret_hash: input.secretHash,
    p_is_bot: input.isBot,
    p_ready: input.ready,
    p_is_host: input.isHost,
    p_max_players: MAX_PLAYERS,
  });
  if (error) {
    const mapped = mapRpcError(error);
    throw new EdgeError(mapped.message, mapped.status);
  }
  return Number(data);
}

export async function commitState(
  admin: SupabaseClient,
  roomId: string,
  expectedVersion: number,
  state: GameState,
  status: 'playing' | 'finished',
): Promise<number> {
  const { data, error } = await admin.rpc('commit_room_state', {
    p_room_id: roomId,
    p_expected_version: expectedVersion,
    p_state: state,
    p_status: status,
  });
  if (error) {
    if (isVersionConflict(error)) throw new VersionConflictError();
    const mapped = mapRpcError(error);
    throw new EdgeError(mapped.message, mapped.status);
  }
  return Number(data);
}

export async function promoteHost(
  admin: SupabaseClient,
  roomId: string,
  newHostId: string,
): Promise<void> {
  const { error: roomError } = await admin
    .from('rooms')
    .update({ host_id: newHostId, updated_at: nowIso() })
    .eq('id', roomId);
  if (roomError) throw roomError;

  const { error: clearError } = await admin
    .from('room_players')
    .update({ is_host: false })
    .eq('room_id', roomId);
  if (clearError) throw clearError;

  const { error: setError } = await admin
    .from('room_players')
    .update({ is_host: true })
    .eq('room_id', roomId)
    .eq('id', newHostId);
  if (setError) throw setError;
}
