// ============================================================
// Hüküm Yolu — Edge Function sunucu tipleri ve yardımcıları
// ============================================================
// Bu dosya Deno tarafında çalışır. İstemci tarafındaki
// `src/lib/multiplayer.ts` ile aynı DTO alan adlarını kullanır.
// ============================================================

import type { RedactedGameState } from '../engine/types.ts';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;
export const PRESENCE_WINDOW_MS = 45_000;
export const PRESENCE_WRITE_INTERVAL_MS = 10_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BOT_NAMES = [
  'Pusula',
  'Kartal',
  'Mercan',
  'Sedef',
  'Gölge',
  'Zeytin',
  'Kayın',
  'Deniz',
  'Kuzey',
  'Ada',
];

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  version: number | string;
  created_at: string;
  updated_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  name: string;
  avatar_id: string;
  secret_hash: string | null;
  is_host: boolean;
  is_bot: boolean;
  ready: boolean;
  connected: boolean;
  joined_at: string;
  last_seen: string;
}

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
  serverTime: string;
}

export interface AuthSnapshot extends RoomSnapshot {
  playerSecret: string;
}

export interface RpcErrorLike {
  message?: string;
  code?: string;
}

/** Beklenen, istemciye gösterilebilir sunucu hatası. */
export class EdgeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'EdgeError';
    this.status = status;
  }
}

/** Oda silinmiş veya hiç var olmamış. */
export class RoomGoneError extends Error {
  constructor() {
    super('ROOM_GONE');
    this.name = 'RoomGoneError';
  }
}

/** Oyuncu odadan çıkarılmış / ayrılmış. */
export class SessionGoneError extends Error {
  constructor() {
    super('SESSION_GONE');
    this.name = 'SessionGoneError';
  }
}

/** İyimser sürüm çakışması. İstemci yeniden denemeli. */
export class VersionConflictError extends Error {
  constructor() {
    super('VERSION_CONFLICT');
    this.name = 'VersionConflictError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function oldIso(): string {
  return new Date(Date.now() - 60_000).toISOString();
}

export function normalizeName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const normalized = input.trim().replace(/\s+/g, ' ');
  if (normalized.length < 3 || normalized.length > 16) return null;
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(normalized)) return null;
  return normalized;
}

export function validateAvatarId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  return /^avatar-(?:[1-9]|1[0-6])$/.test(input) ? input : null;
}

export function normalizeRoomCodeInput(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = [...input.toUpperCase()]
    .filter((char) => ROOM_CODE_ALPHABET.includes(char))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
  return code.length === ROOM_CODE_LENGTH ? code : null;
}

export function generateRoomCode(): string {
  const bytes = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const byte of bytes) {
    // Alfabe uzunluğu 32'dir; 256 % 32 === 0 olduğu için modulo sapması yok.
    code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

/** 32 baytlık, 64 karakterlik onaltılık oyuncu sırrı. */
export function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Sabit zamanlı karşılaştırma (hash'ler aynı uzunluktadır). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isUuid(input: unknown): input is string {
  return typeof input === 'string' && UUID_RE.test(input);
}

export function isPlayerConnected(player: PlayerRow, now = Date.now()): boolean {
  if (player.is_bot) return true;
  if (!player.connected) return false;
  const lastSeen = Date.parse(player.last_seen);
  return Number.isFinite(lastSeen) && now - lastSeen < PRESENCE_WINDOW_MS;
}

export function pickBotName(existingNames: readonly string[]): string {
  const used = new Set(existingNames.map((name) => name.toLocaleLowerCase('tr-TR')));
  const available = BOT_NAMES.filter(
    (name) => !used.has(name.toLocaleLowerCase('tr-TR')),
  );
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return `Bot ${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
}

export function randomAvatarId(): string {
  return `avatar-${1 + Math.floor(Math.random() * 16)}`;
}

export function isVersionConflict(error: RpcErrorLike): boolean {
  const message = error.message ?? '';
  return message.includes('VERSION_CONFLICT') || error.code === '40001';
}

export function mapRpcError(error: RpcErrorLike): {
  message: string;
  status: number;
} {
  const message = error.message ?? '';
  if (message.includes('ROOM_FULL')) {
    return { message: 'Oda dolu (10/10).', status: 409 };
  }
  if (message.includes('ROOM_NOT_LOBBY')) {
    return {
      message: 'Oyun başlamış; bu işlem yalnızca lobide yapılabilir.',
      status: 409,
    };
  }
  if (message.includes('ROOM_NOT_FOUND')) {
    return { message: 'Oda bulunamadı.', status: 404 };
  }
  if (isVersionConflict(error)) {
    return {
      message: 'Oyun durumu başka bir işlemle güncellendi. Yeniden deneyin.',
      status: 409,
    };
  }
  if (message.includes('INVALID_STATUS')) {
    return { message: 'Oyun durumu güncellenemedi.', status: 400 };
  }
  return {
    message: 'Sunucu işlemi tamamlanamadı. Lütfen tekrar deneyin.',
    status: 500,
  };
}
