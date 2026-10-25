export interface MultiplayerSession {
  roomCode: string;
  playerName: string;
  avatarId: string;
  isHost: boolean;
  savedAt: number;
}

const SESSION_KEY = 'hukum-yolu:session:v1';

export function loadSession(): MultiplayerSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MultiplayerSession> | null;
    if (
      !parsed ||
      typeof parsed.roomCode !== 'string' ||
      typeof parsed.playerName !== 'string' ||
      typeof parsed.avatarId !== 'string'
    ) {
      return null;
    }
    return {
      roomCode: parsed.roomCode,
      playerName: parsed.playerName,
      avatarId: parsed.avatarId,
      isHost: Boolean(parsed.isHost),
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Omit<MultiplayerSession, 'savedAt'>): void {
  try {
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...session, savedAt: Date.now() }),
    );
  } catch {
    // Gizli mod / depolama kapalı olabilir; oyun yine de çalışır.
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // yoksay
  }
}
