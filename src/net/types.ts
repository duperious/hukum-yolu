import type { GameAction, RedactedGameState } from '../game';

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

export type LobbyAction =
  | { type: 'toggle_ready' }
  | { type: 'update_profile'; name: string; avatarId: string }
  | { type: 'add_bot' }
  | { type: 'remove_bot'; botId: string }
  | { type: 'kick'; playerId: string }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'claim_host' };

export type RoomAction = LobbyAction | GameAction;

/** Host tarafında tutulan, istemciye asla ham hâlde gönderilmeyen oyuncu kaydı. */
export interface NetPlayer {
  id: string;
  token: string;
  name: string;
  avatarId: string;
  isBot: boolean;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

/** Oda sahibinin tarayıcısında tutulan yetkili oda durumu. */
export interface HostRoomState {
  code: string;
  hostId: string;
  status: RoomStatus;
  players: NetPlayer[];
  game: import('../game').GameState | null;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export const LOBBY_ACTION_TYPES = new Set<string>([
  'toggle_ready',
  'update_profile',
  'add_bot',
  'remove_bot',
  'kick',
  'start',
  'restart',
  'claim_host',
]);

export const GAME_ACTION_TYPES = new Set<string>([
  'ack_role',
  'nominate',
  'vote',
  'president_discard',
  'chancellor_enact',
  'investigate',
  'use_block',
  'skip_block',
  'choose_notr_side',
  'assassinate',
  'ack_peek',
]);

export function isLobbyAction(value: unknown): value is LobbyAction {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && LOBBY_ACTION_TYPES.has(type);
}

export function isGameAction(value: unknown): value is GameAction {
  if (!value || typeof value !== 'object') return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && GAME_ACTION_TYPES.has(type);
}
