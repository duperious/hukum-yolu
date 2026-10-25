export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

/** Kullanıcının yazdığı kodu normalize eder (büyük harf, 6 karakter). */
export function normalizeRoomCode(input: string): string {
  return [...input.toUpperCase()]
    .filter((char) => ROOM_CODE_ALPHABET.includes(char))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);
}

/**
 * Oda kodu doğrulama. Sunucu tarafıyla aynı alfabeyi kullanır.
 * Karıştırılabilen I, O, 0 ve 1 harfleri alfabede yoktur.
 */
export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  return [...code].every((char) => ROOM_CODE_ALPHABET.includes(char));
}

export function roomCodeError(code: string): string | null {
  if (!code) return 'Oda kodunu girin.';
  if (code.length !== ROOM_CODE_LENGTH) return 'Oda kodu 6 karakter olmalı.';
  if (!isValidRoomCode(code)) return 'Oda kodunda geçersiz karakter var.';
  return null;
}

export function roomInviteUrl(code: string): string {
  const url = new URL(window.location.href);
  url.hash = `#/join/${code}`;
  return url.toString();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
}
