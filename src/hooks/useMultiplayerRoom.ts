import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction } from '../game';
import {
  fetchRoom,
  heartbeat,
  leaveRoom,
  sendGameAction,
  sendLobbyAction,
  type LobbyAction,
  type RoomSnapshot,
} from '../lib/multiplayer';
import { supabase } from '../lib/supabase';
import { clearSession, type MultiplayerSession } from '../lib/storage';

export type ConnectionState = 'connecting' | 'live' | 'polling' | 'offline';

const FATAL_PATTERNS = [
  'oturum',
  'oyuncu bulunamadı',
  'geçersiz',
  'oda bulunamadı',
  'oda kodu',
  'bu oda',
];

function isFatalRoomError(message: string): boolean {
  const lower = message.toLocaleLowerCase('tr-TR');
  return FATAL_PATTERNS.some((pattern) => lower.includes(pattern));
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.';
}

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

export function useMultiplayerRoom(
  session: MultiplayerSession | null,
): MultiplayerRoomController {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  const snapshotRef = useRef<RoomSnapshot | null>(null);
  const inFlightRef = useRef(false);
  const realtimeRef = useRef(false);
  const mountedRef = useRef(true);
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const applySnapshot = useCallback((next: RoomSnapshot) => {
    snapshotRef.current = next;
    if (!mountedRef.current) return;
    setSnapshot(next);
    setLoading(false);
  }, []);

  const markFatal = useCallback((message: string) => {
    clearSession();
    if (!mountedRef.current) return;
    setFatalError(message);
    setLoading(false);
    setConnection('offline');
  }, []);

  const refresh = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const next = await fetchRoom(session);
      applySnapshot(next);
      setError(null);
      setFatalError(null);
      setConnection(realtimeRef.current ? 'live' : 'polling');
    } catch (caught) {
      const message = errorMessage(caught);
      if (isFatalRoomError(message)) {
        markFatal(message);
      } else {
        if (mountedRef.current) {
          setError(message);
          setConnection('offline');
          setLoading(false);
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [applySnapshot, markFatal, session]);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      setFatalError('Bu oda için oturum bulunamadı. Ana sayfadan yeni bir oda kurun veya katılın.');
      return;
    }
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [refresh, session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => {
      void heartbeat(session).catch(() => {
        // Sessiz yoklama; bağlantı durumu get_state üzerinden güncellenir.
      });
    }, 20000);
    return () => {
      window.clearInterval(timer);
    };
  }, [session]);

  const roomId = snapshot?.room.id;

  useEffect(() => {
    const client = supabase;
    if (!client || !roomId) return;
    const channel = client
      .channel(`room:${roomId}:${channelSuffixRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_versions',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeRef.current = true;
          if (mountedRef.current) setConnection('live');
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          realtimeRef.current = false;
          if (mountedRef.current) setConnection('polling');
        }
      });

    return () => {
      realtimeRef.current = false;
      void client.removeChannel(channel);
    };
  }, [refresh, roomId]);

  const runLobbyAction = useCallback(
    async (action: LobbyAction) => {
      if (!session || actionPending) return;
      setActionPending(true);
      setError(null);
      try {
        const next = await sendLobbyAction(session, action);
        applySnapshot(next);
        setFatalError(null);
      } catch (caught) {
        const message = errorMessage(caught);
        if (isFatalRoomError(message)) {
          markFatal(message);
        } else {
          setError(message);
          void refresh();
        }
      } finally {
        if (mountedRef.current) setActionPending(false);
      }
    },
    [actionPending, applySnapshot, markFatal, refresh, session],
  );

  const sendGame = useCallback(
    async (action: GameAction) => {
      if (!session || actionPending) return;
      setActionPending(true);
      setError(null);
      try {
        const next = await sendGameAction(session, action);
        applySnapshot(next);
        setFatalError(null);
      } catch (caught) {
        const message = errorMessage(caught);
        if (isFatalRoomError(message)) {
          markFatal(message);
        } else {
          setError(message);
          void refresh();
        }
      } finally {
        if (mountedRef.current) setActionPending(false);
      }
    },
    [actionPending, applySnapshot, markFatal, refresh, session],
  );

  const sendLobby = useCallback(
    async (action: LobbyAction) => {
      await runLobbyAction(action);
    },
    [runLobbyAction],
  );

  const restart = useCallback(async () => {
    await runLobbyAction({ type: 'restart' });
  }, [runLobbyAction]);

  const claimHost = useCallback(async () => {
    await runLobbyAction({ type: 'claim_host' });
  }, [runLobbyAction]);

  const leave = useCallback(async () => {
    if (!session) {
      clearSession();
      return;
    }
    try {
      await leaveRoom(session);
    } catch {
      // Ağ hatası olsa da istemci oturumunu temizle.
    }
    clearSession();
    snapshotRef.current = null;
    if (mountedRef.current) {
      setSnapshot(null);
      setConnection('offline');
    }
  }, [session]);

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
    dismissError: () => setError(null),
  };
}
