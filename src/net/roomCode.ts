import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../lib/validation';

const PEER_PREFIX = 'hukum-yolu-v1';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Karıştırılabilen I, O, 0 ve 1 harfleri olmayan 6 karakterlik oda kodu. */
export function makeRoomCode(): string {
  const bytes = randomBytes(ROOM_CODE_LENGTH);
  let code = '';
  for (const byte of bytes) {
    code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

/** PeerJS üzerinde çakışmayı azaltmak için oda kodunu ad alanına sarar. */
export function peerIdFor(code: string): string {
  return `${PEER_PREFIX}-${code.toLowerCase()}`;
}

export function makeToken(): string {
  return [...randomBytes(24)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function makePlayerId(prefix = 'p'): string {
  const suffix = [...randomBytes(9)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${suffix}`;
}

export function makeGameId(): string {
  return makePlayerId('game');
}
