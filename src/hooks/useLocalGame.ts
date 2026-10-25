import { useCallback, useMemo, useRef, useState } from 'react';
import { applyPlayerAction, autoResolveBots, GameError, redactGameState, restartGame, startGame } from '../game';
import type { GameAction, GameState, StartGamePlayer } from '../game';
import type { RedactedGameState } from '../game';
import { randomAvatarId } from '../config/avatars';
import { normalizeName, type Profile } from '../lib/profile';

const HUMAN_ID = 'human-local';

const BOT_NAMES = [
  'Selin',
  'Kaan',
  'Derya',
  'Mert',
  'Ece',
  'Barış',
  'Zeynep',
  'Emir',
  'Defne',
  'Arda',
  'İpek',
  'Kerem',
];

export interface LocalGameController {
  redacted: RedactedGameState | null;
  viewerId: string | null;
  viewerName: string | null;
  error: string | null;
  clearError: () => void;
  start: (profile: Profile, botCount: number) => void;
  act: (action: GameAction) => void;
  restart: () => void;
  reset: () => void;
}

export function useLocalGame(): LocalGameController {
  const [game, setGame] = useState<GameState | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const [viewerName, setViewerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const start = useCallback(
    (profile: Profile, botCount: number) => {
      const safeBotCount = Math.min(9, Math.max(4, Math.round(botCount)));
      const humanName = normalizeName(profile.name) || 'Oyuncu';
      const usedNames = new Set([humanName.toLocaleLowerCase('tr-TR')]);
      const botNames: string[] = [];
      for (const candidate of BOT_NAMES) {
        if (botNames.length >= safeBotCount) break;
        if (usedNames.has(candidate.toLocaleLowerCase('tr-TR'))) continue;
        botNames.push(candidate);
        usedNames.add(candidate.toLocaleLowerCase('tr-TR'));
      }
      while (botNames.length < safeBotCount) {
        botNames.push(`Bot ${botNames.length + 1}`);
      }

      const now = Date.now();
      const players: StartGamePlayer[] = [
        {
          id: HUMAN_ID,
          name: humanName,
          avatarId: profile.avatarId,
          isBot: false,
          isHost: true,
          joinedAt: now,
        },
        ...botNames.map((name, index) => ({
          id: `bot-local-${index + 1}`,
          name,
          avatarId: randomAvatarId(),
          isBot: true,
          isHost: false,
          joinedAt: now + index + 1,
        })),
      ];

      try {
        const created = startGame({ players, mode: 'local' });
        const resolved = autoResolveBots(created);
        commit(resolved);
        setViewerName(humanName);
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof GameError
            ? caught.message
            : 'Oyun başlatılamadı. Lütfen tekrar deneyin.',
        );
      }
    },
    [commit],
  );

  const act = useCallback(
    (action: GameAction) => {
      const current = gameRef.current;
      if (!current) return;
      try {
        const next = applyPlayerAction(current, HUMAN_ID, action);
        const resolved = autoResolveBots(next);
        commit(resolved);
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof GameError
            ? caught.message
            : 'Hamle uygulanamadı. Lütfen tekrar deneyin.',
        );
      }
    },
    [commit],
  );

  const restart = useCallback(() => {
    const current = gameRef.current;
    if (!current) return;
    try {
      const restarted = restartGame(current);
      const resolved = autoResolveBots(restarted);
      commit(resolved);
      setError(null);
    } catch {
      setError('Oyun yeniden başlatılamadı.');
    }
  }, [commit]);

  const reset = useCallback(() => {
    gameRef.current = null;
    setGame(null);
    setViewerName(null);
    setError(null);
  }, []);

  const redacted = useMemo(() => {
    if (!game) return null;
    try {
      return redactGameState(game, HUMAN_ID);
    } catch {
      return null;
    }
  }, [game]);

  return {
    redacted,
    viewerId: game ? HUMAN_ID : null,
    viewerName,
    error,
    clearError: () => setError(null),
    start,
    act,
    restart,
    reset,
  };
}
