import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction } from '../game';
import { createRoomSession, type RoomSession } from '../net/session';
import type { LobbyAction, RoomSnapshot } from '../net/types';
import { clearSession, type MultiplayerSession } from '../lib/storage';

export type ConnectionState = 'connecting' | 'live' | 'polling' | 'offline';

export interface MultiplayerRoomController {
  snapshot: RoomSnapshot | null;
  loading: boolean;
  actionPending: boolean;
  error: string | null;
  fatalError: string | null;
  connection: ConnectionState;
  refresh: () => Promise<void>;
  sendGame: (action: GameAction) => Promise<void>;
  sendLobby: (action: LobbyAction) => Promise<void>;
  restart: () => Promise<void>;
  claimHost: () => Promise<void>;
  leave: () => Promise<void>;
  dismissError: () => void;
}

function mapConnection(status: string): ConnectionState {
  if (status === 'online') return 'live';
  if (status === 'connecting') return 'connecting';
  return 'offline';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Bağlantı sırasında bilinmeyen bir hata oluştu.';
}

export function useMultiplayerRoom(
  session: MultiplayerSession | null,
): MultiplayerRoomController {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  const sessionRef = useRef<RoomSession | null>(null);
  const mountedRef = useRef(true);
  const lastVersionRef = useRef(-1);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearPending = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    if (mountedRef.current) setActionPending(false);
  }, []);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      setFatalError(
        'Bu oda için oturum bulunamadı. Ana sayfadan yeni bir oda kurun veya katılın.',
      );
      return;
    }

    setLoading(true);
    setFatalError(null);
    setError(null);
    setSnapshot(null);
    setConnection('connecting');
    setActionPending(false);
    lastVersionRef.current = -1;

    let roomSession: RoomSession;
    try {
      roomSession = createRoomSession(
        session.isHost ? 'host' : 'client',
        session.roomCode,
        { name: session.playerName, avatarId: session.avatarId },
      );
    } catch (caught) {
      setLoading(false);
      setFatalError(errorMessage(caught));
      return;
    }

    sessionRef.current = roomSession;
    let active = true;
    const unsubscribe = roomSession.subscribe((next) => {
      if (!active) return;
      if (next.view) {
        setSnapshot(next.view);
        setLoading(false);
      }
      const fatal = next.status === 'error' || next.status === 'closed';
      setFatalError(fatal ? next.error ?? 'Oda kapandı.' : null);
      setError(fatal ? null : next.error);
      setConnection(mapConnection(next.status));
      if (next.error) clearPending();
      if (next.view && next.view.room.version !== lastVersionRef.current) {
        lastVersionRef.current = next.view.room.version;
        clearPending();
      }
      if (!next.view && next.status === 'error') setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
      roomSession.dispose();
      if (sessionRef.current === roomSession) sessionRef.current = null;
      clearPending();
    };
  }, [clearPending, session]);

  const beginPending = useCallback(() => {
    if (pendingTimerRef.current !== null) {
      window.clearTimeout(pendingTimerRef.current);
    }
    setActionPending(true);
    pendingTimerRef.current = window.setTimeout(() => {
      pendingTimerRef.current = null;
      if (mountedRef.current) setActionPending(false);
    }, 6000);
  }, []);

  const dispatch = useCallback(
    (action: LobbyAction | GameAction) => {
      const roomSession = sessionRef.current;
      if (!roomSession) {
        setError('Oda bağlantısı hazır değil. Yeniden dene.');
        return;
      }
      setError(null);
      beginPending();
      roomSession.send(action);
    },
    [beginPending],
  );

  const sendGame = useCallback(
    async (action: GameAction) => {
      dispatch(action);
    },
    [dispatch],
  );

  const sendLobby = useCallback(
    async (action: LobbyAction) => {
      dispatch(action);
    },
    [dispatch],
  );

  const restart = useCallback(async () => {
    dispatch({ type: 'restart' });
  }, [dispatch]);

  const refresh = useCallback(async () => {
    sessionRef.current?.retry();
  }, []);

  const claimHost = useCallback(async () => {
    setError('Bu sürümde oda sahibi doğrudan tarayıcıda çalışır; host devri desteklenmiyor.');
  }, []);

  const leave = useCallback(async () => {
    const roomSession = sessionRef.current;
    sessionRef.current = null;
    roomSession?.leave();
    clearSession();
    if (mountedRef.current) {
      setSnapshot(null);
      setConnection('offline');
      setLoading(false);
      setActionPending(false);
    }
  }, []);

  const dismissError = useCallback(() => {
    sessionRef.current?.clearError();
    setError(null);
  }, []);

  return {
    snapshot,
    loading,
    actionPending,
    error,
    fatalError,
    connection,
    refresh,
    sendGame,
    sendLobby,
    restart,
    claimHost,
    leave,
    dismissError,
  };
}
