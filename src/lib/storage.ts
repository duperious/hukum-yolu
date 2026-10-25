export interface MultiplayerSession {
  roomCode: string;
  playerId: string;
  playerSecret: string;
  playerName: string;
  avatarId: string;
  savedAt: number;
}

const SESSION_KEY = 'hukum-yolu:session:v1';

export function loadSession(): MultiplayerSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MultiplayerSession> | null;
    if (
      !parsed ||
      typeof parsed.roomCode !== 'string' ||
      typeof parsed.playerId !== 'string' ||
      typeof parsed.playerSecret !== 'string' ||
      typeof parsed.playerName !== 'string' ||
      typeof parsed.avatarId !== 'string'
    ) {
      return null;
    }
    return {
      roomCode: parsed.roomCode,
      playerId: parsed.playerId,
      playerSecret: parsed.playerSecret,
      playerName: parsed.playerName,
      avatarId: parsed.avatarId,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveSession(session: MultiplayerSession): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Depolama kapalıysa oturum yalnızca bu sekmede yaşar; akış devam eder.
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // yoksay
  }
}
