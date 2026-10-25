import type { HostRoomState, NetPlayer } from './types';

const HOST_PREFIX = 'hukum-yolu:net:host:v1:';
const TOKEN_PREFIX = 'hukum-yolu:net:token:v1:';

function hostKey(code: string): string {
  return `${HOST_PREFIX}${code}`;
}

function tokenKey(code: string): string {
  return `${TOKEN_PREFIX}${code}`;
}

function isPlayer(value: unknown): value is NetPlayer {
  if (!value || typeof value !== 'object') return false;
  const player = value as Partial<NetPlayer>;
  return (
    typeof player.id === 'string' &&
    typeof player.token === 'string' &&
    typeof player.name === 'string' &&
    typeof player.avatarId === 'string' &&
    typeof player.isBot === 'boolean' &&
    typeof player.isHost === 'boolean' &&
    typeof player.ready === 'boolean' &&
    typeof player.connected === 'boolean' &&
    typeof player.joinedAt === 'number'
  );
}

function isHostState(value: unknown, code: string): value is HostRoomState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<HostRoomState>;
  return (
    state.code === code &&
    typeof state.hostId === 'string' &&
    (state.status === 'lobby' || state.status === 'playing' || state.status === 'finished') &&
    Array.isArray(state.players) &&
    state.players.length > 0 &&
    state.players.every(isPlayer) &&
    (state.game === null || (typeof state.game === 'object' && state.game !== null)) &&
    typeof state.createdAt === 'number' &&
    typeof state.updatedAt === 'number' &&
    typeof state.version === 'number'
  );
}

export function loadHostState(code: string): HostRoomState | null {
  try {
    const raw = window.localStorage.getItem(hostKey(code));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isHostState(parsed, code)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveHostState(state: HostRoomState): void {
  try {
    window.localStorage.setItem(hostKey(state.code), JSON.stringify(state));
  } catch {
    // Depolama kapalı olabilir; oyun bu sekmede yine de devam eder.
  }
}

export function clearHostState(code: string): void {
  try {
    window.localStorage.removeItem(hostKey(code));
  } catch {
    // yoksay
  }
}

export function getToken(code: string): string | null {
  try {
    return window.localStorage.getItem(tokenKey(code));
  } catch {
    return null;
  }
}

export function saveToken(code: string, token: string): void {
  try {
    window.localStorage.setItem(tokenKey(code), token);
  } catch {
    // yoksay
  }
}

export function clearToken(code: string): void {
  try {
    window.localStorage.removeItem(tokenKey(code));
  } catch {
    // yoksay
  }
}

export function clearRoomData(code: string): void {
  clearHostState(code);
  clearToken(code);
}
