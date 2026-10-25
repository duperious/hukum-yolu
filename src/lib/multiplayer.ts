import type { GameAction, RedactedGameState } from '../game';
import { supabase } from './supabase';
import type { MultiplayerSession } from './storage';

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface RoomDto {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface LobbyPlayerDto {
  id: string;
  name: string;
  avatarId: string;
  isBot: boolean;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  joinedAt: string;
  lastSeen: string;
}

export interface LobbyDto {
  code: string;
  hostId: string;
  players: LobbyPlayerDto[];
  minPlayers: number;
  maxPlayers: number;
  canStart: boolean;
  startBlockReason: string | null;
  canClaimHost: boolean;
}

export interface YouDto {
  playerId: string;
  name: string;
  avatarId: string;
  isHost: boolean;
}

export interface RoomSnapshot {
  room: RoomDto;
  lobby: LobbyDto | null;
  game: RedactedGameState | null;
  you: YouDto;
  serverTime?: string;
}

export interface AuthSnapshot extends RoomSnapshot {
  playerSecret: string;
}

export type LobbyAction =
  | { type: 'toggle_ready' }
  | { type: 'update_profile'; name: string; avatarId: string }
  | { type: 'add_bot' }
  | { type: 'remove_bot'; botId: string }
  | { type: 'kick'; playerId: string }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'claim_host' };

interface AuthBody {
  roomCode: string;
  playerId: string;
  playerSecret: string;
}

function assertSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase yapılandırılmadı. Çok oyunculu mod için ortam değişkenlerini ayarlayın.',
    );
  }
  return supabase;
}

async function readFunctionError(error: unknown): Promise<string> {
  const fallback =
    error instanceof Error ? error.message : 'Sunucuya ulaşılamadı.';
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: unknown };
      if (typeof body?.error === 'string' && body.error.trim()) {
        return body.error;
      }
    } catch {
      // Gövde JSON değilse genel mesajı kullan.
    }
  }
  return fallback;
}

async function callGame<T>(body: Record<string, unknown>): Promise<T> {
  const client = assertSupabase();
  const { data, error } = await client.functions.invoke('game', { body });
  if (error) {
    throw new Error(await readFunctionError(error));
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === 'string' && message.trim()) {
      throw new Error(message);
    }
  }
  return data as T;
}

function authBody(session: MultiplayerSession): AuthBody {
  return {
    roomCode: session.roomCode,
    playerId: session.playerId,
    playerSecret: session.playerSecret,
  };
}

export async function createRoom(input: {
  name: string;
  avatarId: string;
}): Promise<AuthSnapshot> {
  return callGame<AuthSnapshot>({
    action: 'create_room',
    name: input.name,
    avatarId: input.avatarId,
  });
}

export async function joinRoom(input: {
  roomCode: string;
  name: string;
  avatarId: string;
}): Promise<AuthSnapshot> {
  return callGame<AuthSnapshot>({
    action: 'join_room',
    roomCode: input.roomCode,
    name: input.name,
    avatarId: input.avatarId,
  });
}

export async function fetchRoom(
  session: MultiplayerSession,
): Promise<RoomSnapshot> {
  return callGame<RoomSnapshot>({
    action: 'get_state',
    ...authBody(session),
  });
}

export async function sendLobbyAction(
  session: MultiplayerSession,
  lobbyAction: LobbyAction,
): Promise<RoomSnapshot> {
  return callGame<RoomSnapshot>({
    action: 'lobby_action',
    ...authBody(session),
    lobbyAction,
  });
}

export async function sendGameAction(
  session: MultiplayerSession,
  gameAction: GameAction,
): Promise<RoomSnapshot> {
  return callGame<RoomSnapshot>({
    action: 'game_action',
    ...authBody(session),
    gameAction,
  });
}

export async function heartbeat(
  session: MultiplayerSession,
): Promise<{ ok: boolean; serverTime: string }> {
  return callGame<{ ok: boolean; serverTime: string }>({
    action: 'heartbeat',
    ...authBody(session),
  });
}

export async function leaveRoom(
  session: MultiplayerSession,
): Promise<{ ok: boolean }> {
  return callGame<{ ok: boolean }>({
    action: 'leave',
    ...authBody(session),
  });
}
