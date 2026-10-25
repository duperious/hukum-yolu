import type { RoomAction, RoomSnapshot } from './types';

export type ClientMessage =
  | {
      t: 'hello';
      name: string;
      avatarId: string;
      token?: string | null;
    }
  | { t: 'action'; action: RoomAction }
  | { t: 'leave' };

export type HostMessage =
  | {
      t: 'welcome';
      playerId: string;
      token: string;
      view: RoomSnapshot;
    }
  | { t: 'snapshot'; view: RoomSnapshot }
  | { t: 'error'; message: string }
  | { t: 'closed'; message: string };

export function isClientMessage(value: unknown): value is ClientMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as { t?: unknown };
  if (message.t === 'hello') {
    const hello = value as { name?: unknown; avatarId?: unknown; token?: unknown };
    return (
      typeof hello.name === 'string' &&
      typeof hello.avatarId === 'string' &&
      (hello.token === undefined || hello.token === null || typeof hello.token === 'string')
    );
  }
  if (message.t === 'action') {
    const action = (value as { action?: unknown }).action;
    return Boolean(action && typeof action === 'object');
  }
  return message.t === 'leave';
}
