import { AVATARS, getAvatar, randomAvatarId } from '../config/avatars';

export interface Profile {
  name: string;
  avatarId: string;
}

const PROFILE_KEY = 'hukum-yolu:profile:v1';

export function loadProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Profile> | null;
    if (!parsed || typeof parsed.name !== 'string') return null;
    return {
      name: parsed.name,
      avatarId: getAvatar(parsed.avatarId).id,
    };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        name: normalizeName(profile.name),
        avatarId: getAvatar(profile.avatarId).id,
      }),
    );
  } catch {
    // Gizli mod / depolama kapalı olabilir; oyun yine de çalışır.
  }
}

export function clearProfile(): void {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // yoksay
  }
}

export function defaultProfile(): Profile {
  return {
    name: '',
    avatarId: AVATARS[0].id,
  };
}

export function randomProfile(): Profile {
  return {
    name: '',
    avatarId: randomAvatarId(),
  };
}

/** Boşlukları normalize eder, baş/son boşlukları atar. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * İsim doğrulama. Sunucu tarafındaki doğrulamayla aynı kuralları kullanır.
 * En az 3, en fazla 16 karakter; harf, rakam, boşluk ve . _ - ' karakterleri.
 */
export function validateName(name: string): string | null {
  const normalized = normalizeName(name);
  if (normalized.length < 3) return 'İsim en az 3 karakter olmalı.';
  if (normalized.length > 16) return 'İsim en fazla 16 karakter olabilir.';
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(normalized)) {
    return "İsim yalnızca harf, sayı, boşluk ve . _ - ' içerebilir.";
  }
  return null;
}

export function isValidProfile(profile: Profile): boolean {
  return validateName(profile.name) === null && Boolean(getAvatar(profile.avatarId));
}
