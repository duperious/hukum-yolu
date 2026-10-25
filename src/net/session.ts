import Peer, { type DataConnection } from 'peerjs';
import { normalizeName, validateName } from '../lib/profile';
import { isValidAvatarId, randomAvatarId } from '../config/avatars';
import { peerIdFor } from './roomCode';
import {
  addHumanToRoom,
  applyGameActionToRoom,
  applyLobbyAction,
  convertPlayerToBot,
  createHostRoom,
  findPlayerByToken,
  markConnected,
  projectRoom,
  removePlayerFromRoom,
  RoomError,
  updateProfileInRoom,
} from './room';
import {
  clearRoomData,
  clearToken,
  getToken,
  loadHostState,
  saveHostState,
  saveToken,
} from './storage';
import { isClientMessage, type ClientMessage, type HostMessage } from './protocol';
import {
  isGameAction,
  isLobbyAction,
  type HostRoomState,
  type RoomAction,
  type RoomSnapshot,
} from './types';

export type SessionStatus = 'connecting' | 'online' | 'offline' | 'error' | 'closed';

export interface SessionSnapshot {
  mode: 'host' | 'client';
  status: SessionStatus;
  view: RoomSnapshot | null;
  error: string | null;
  selfId: string | null;
}

export interface RoomSession {
  readonly mode: 'host' | 'client';
  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void;
  send(action: RoomAction): void;
  retry(): void;
  clearError(): void;
  leave(): void;
  dispose(): void;
}

const DISCONNECT_GRACE_MS = 45_000;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const PEER_OPTIONS = {
  debug: 0,
  config: { iceServers: ICE_SERVERS },
};

abstract class BaseSession implements RoomSession {
  readonly mode: 'host' | 'client';
  protected readonly snap: SessionSnapshot;
  protected disposed = false;
  private readonly listeners = new Set<(snapshot: SessionSnapshot) => void>();

  protected constructor(mode: 'host' | 'client') {
    this.mode = mode;
    this.snap = {
      mode,
      status: 'connecting',
      view: null,
      error: null,
      selfId: null,
    };
  }

  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected snapshot(): SessionSnapshot {
    return { ...this.snap };
  }

  protected emit(): void {
    const value = this.snapshot();
    for (const listener of this.listeners) listener(value);
  }

  clearError(): void {
    if (this.snap.error === null) return;
    this.snap.error = null;
    this.emit();
  }

  abstract send(action: RoomAction): void;
  abstract retry(): void;
  abstract leave(): void;
  abstract dispose(): void;
}

function safeSend(conn: DataConnection | null, message: HostMessage): void {
  if (!conn || !conn.open) return;
  try {
    conn.send(message);
  } catch {
    // Bağlantı bu sırada kapanmış olabilir.
  }
}

function safeClose(conn: DataConnection | null, delay = 120): void {
  if (!conn) return;
  window.setTimeout(() => {
    try {
      conn.close();
    } catch {
      // yoksay
    }
  }, delay);
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Bağlantı sırasında bilinmeyen bir hata oluştu.';
}

export class HostSession extends BaseSession {
  private state: HostRoomState;
  private peer: Peer | null = null;
  private readonly connByPlayer = new Map<string, DataConnection>();
  private readonly playerByConn = new Map<DataConnection, string>();
  private readonly disconnectTimers = new Map<string, number>();
  private reconnectTimer: number | null = null;
  private openTimer: number | null = null;
  private peerOpenTimer: number | null = null;
  private idRetries = 0;
  private readonly beforeUnload = (event: BeforeUnloadEvent) => {
    const hasGuests = this.state.players.some(
      (player) => !player.isHost && !player.isBot && player.connected,
    );
    if (!hasGuests) return;
    event.preventDefault();
    event.returnValue = '';
  };

  constructor(code: string, profile: { name: string; avatarId: string }) {
    super('host');
    const saved = loadHostState(code);
    if (saved && saved.players.some((player) => player.id === saved.hostId && player.isHost)) {
      this.state = saved;
      if (this.state.game) {
        this.state = {
          ...this.state,
          status: this.state.game.phase === 'gameOver' ? 'finished' : 'playing',
        };
      } else if (this.state.status !== 'lobby') {
        this.state = { ...this.state, status: 'lobby' };
      }
    } else {
      this.state = createHostRoom(code, profile);
    }

    this.state = {
      ...this.state,
      players: this.state.players.map((player) =>
        player.isHost
          ? { ...player, connected: true }
          : player.isBot
            ? player
            : { ...player, connected: false },
      ),
    };
    saveHostState(this.state);
    this.snap.selfId = this.state.hostId;
    this.snap.view = projectRoom(this.state, this.state.hostId);
    window.addEventListener('beforeunload', this.beforeUnload);
    this.recoverDisconnectedPlayers();
    this.openPeer();
  }

  send(action: RoomAction): void {
    if (this.disposed) return;
    this.handleAction(this.state.hostId, action);
  }

  retry(): void {
    if (this.disposed) return;
    this.snap.error = null;
    if (this.peer && !this.peer.destroyed && !this.peer.disconnected) {
      this.snap.status = 'online';
      this.emit();
      return;
    }
    this.idRetries = 0;
    this.openPeer();
  }

  leave(): void {
    if (this.disposed) return;
    this.broadcastClosed('Oda sahibi odayı kapattı.');
    clearRoomData(this.state.code);
    this.snap.status = 'closed';
    this.snap.error = 'Oda kapatıldı.';
    this.snap.view = null;
    this.snap.selfId = null;
    this.emit();
    this.teardown();
  }

  dispose(): void {
    if (this.disposed) return;
    this.teardown();
  }

  private openPeer(): void {
    if (this.disposed) return;
    this.clearPeerTimers();
    const previous = this.peer;
    this.peer = null;
    if (previous) {
      try {
        previous.destroy();
      } catch {
        // yoksay
      }
    }
    this.snap.status = 'connecting';
    this.emit();

    const peer = new Peer(peerIdFor(this.state.code), PEER_OPTIONS);
    this.peer = peer;
    this.peerOpenTimer = window.setTimeout(() => {
      this.peerOpenTimer = null;
      if (this.peer !== peer || this.disposed || peer.open) return;
      this.snap.status = 'offline';
      this.snap.error = 'Sinyal sunucusuna ulaşılamıyor. Yeniden denenecek.';
      this.emit();
      if (this.peer === peer) this.peer = null;
      try {
        peer.destroy();
      } catch {
        // yoksay
      }
      this.scheduleOpenPeer(2200);
    }, 18_000);

    peer.on('open', () => {
      if (this.peer !== peer || this.disposed) return;
      this.clearPeerOpenTimer();
      this.idRetries = 0;
      this.snap.status = 'online';
      this.snap.error = null;
      this.emit();
    });

    peer.on('connection', (conn) => this.attach(conn));

    peer.on('disconnected', () => {
      if (this.peer !== peer || this.disposed) return;
      this.clearPeerOpenTimer();
      this.snap.status = 'offline';
      this.snap.error =
        'Sinyal sunucusu bağlantısı koptu. Mevcut oyun devam edebilir; yeni katılımlar bekleyebilir.';
      this.emit();
      this.schedulePeerReconnect();
    });

    peer.on('close', () => {
      if (this.peer !== peer || this.disposed) return;
      this.clearPeerOpenTimer();
      this.snap.status = 'offline';
      this.emit();
      this.scheduleOpenPeer(1800);
    });

    peer.on('error', (error: Error & { type?: string }) => {
      if (this.peer !== peer || this.disposed) return;
      this.onPeerError(error);
    });
  }

  private onPeerError(error: Error & { type?: string }): void {
    this.clearPeerOpenTimer();
    const type = error.type ?? '';
    if (type === 'unavailable-id') {
      this.idRetries += 1;
      if (this.idRetries <= 3) {
        this.snap.status = 'connecting';
        this.snap.error = 'Oda kodu hazırlanıyor; eski oturum kapanıyor.';
        this.emit();
        this.scheduleOpenPeer(1200);
        return;
      }
      this.fatal('Bu oda kodu şu an kullanımda. Ana sayfadan yeni bir oda kur.');
      return;
    }
    if (type === 'browser-incompatible') {
      this.fatal(
        'Tarayıcı WebRTC desteklemiyor. Güncel Chrome, Safari veya Firefox kullan.',
      );
      return;
    }
    if (
      type === 'network' ||
      type === 'server-error' ||
      type === 'socket-error' ||
      type === 'socket-closed'
    ) {
      this.snap.status = 'offline';
      this.snap.error =
        'Sinyal sunucusuna ulaşılamıyor. Oda sahibi sekmesi açık kalmalı; yeniden denenecek.';
      this.emit();
      this.schedulePeerReconnect();
      return;
    }
    this.snap.status = 'offline';
    this.snap.error = `Bağlantı hatası: ${error.message}`;
    this.emit();
  }

  private scheduleOpenPeer(delay: number): void {
    if (this.disposed || this.openTimer !== null) return;
    this.openTimer = window.setTimeout(() => {
      this.openTimer = null;
      this.openPeer();
    }, delay);
  }

  private schedulePeerReconnect(): void {
    if (this.disposed || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.disposed || !this.peer || this.peer.destroyed) {
        this.openPeer();
        return;
      }
      try {
        this.peer.reconnect();
      } catch {
        this.openPeer();
      }
    }, 1600);
  }

  private clearPeerOpenTimer(): void {
    if (this.peerOpenTimer !== null) {
      window.clearTimeout(this.peerOpenTimer);
      this.peerOpenTimer = null;
    }
  }

  private clearPeerTimers(): void {
    this.clearPeerOpenTimer();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.openTimer !== null) {
      window.clearTimeout(this.openTimer);
      this.openTimer = null;
    }
  }

  private fatal(message: string): void {
    this.clearPeerTimers();
    const peer = this.peer;
    this.peer = null;
    if (peer) {
      try {
        peer.destroy();
      } catch {
        // yoksay
      }
    }
    this.snap.status = 'error';
    this.snap.error = message;
    this.emit();
  }

  private attach(conn: DataConnection): void {
    conn.on('data', (data) => this.onData(conn, data));
    conn.on('close', () => this.onDisconnect(conn));
    conn.on('error', () => {
      // close olayı temizliği yapacak; burada yalnızca kaydı düşür.
      this.onDisconnect(conn);
    });
  }

  private onData(conn: DataConnection, raw: unknown): void {
    let data: unknown = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw) as unknown;
      } catch {
        safeSend(conn, { t: 'error', message: 'Geçersiz mesaj.' });
        return;
      }
    }
    if (!isClientMessage(data)) {
      safeSend(conn, { t: 'error', message: 'Geçersiz mesaj.' });
      return;
    }
    if (data.t === 'hello') {
      this.handleHello(conn, data);
      return;
    }
    const playerId = this.playerByConn.get(conn);
    if (!playerId) {
      safeSend(conn, { t: 'error', message: 'Önce odaya katılmalısın.' });
      return;
    }
    if (data.t === 'action') {
      this.handleAction(playerId, data.action);
      return;
    }
    if (data.t === 'leave') {
      this.handleLeave(playerId, conn);
    }
  }

  private handleHello(
    conn: DataConnection,
    message: Extract<ClientMessage, { t: 'hello' }>,
  ): void {
    if (this.playerByConn.has(conn)) {
      safeSend(conn, { t: 'error', message: 'Bu bağlantı zaten bir oyuncuya bağlı.' });
      return;
    }
    const name = normalizeName(message.name);
    const nameError = validateName(name);
    if (nameError) {
      safeSend(conn, { t: 'error', message: nameError });
      safeClose(conn, 250);
      return;
    }
    const avatarId = isValidAvatarId(message.avatarId)
      ? message.avatarId
      : randomAvatarId();

    const existing = findPlayerByToken(this.state, message.token);
    if (existing) {
      if (existing.isHost) {
        safeSend(conn, { t: 'error', message: 'Bu oturum oda sahibine ait.' });
        safeClose(conn, 250);
        return;
      }
      if (existing.isBot) {
        safeSend(conn, {
          t: 'error',
          message: 'Bu oyuncu bot tarafından devralındı. Oyun sırasında yeniden katılamazsın.',
        });
        safeClose(conn, 250);
        return;
      }
      this.cancelDisconnect(existing.id);
      let player = existing;
      if (
        this.state.status === 'lobby' &&
        (player.name !== name || player.avatarId !== avatarId)
      ) {
        try {
          this.state = updateProfileInRoom(this.state, player.id, { name, avatarId });
          player = this.state.players.find((entry) => entry.id === player.id) ?? player;
        } catch {
          // İsim çakışırsa mevcut profil korunur.
        }
      }
      this.state = markConnected(this.state, player.id, true);
      this.bindConnection(conn, player.id);
      this.sendWelcome(conn, player.id);
      this.afterStateChange();
      return;
    }

    if (this.state.status !== 'lobby') {
      safeSend(conn, {
        t: 'error',
        message: 'Oyun başladı. Yeni oyuncu katılamaz; oda sahibinden yeniden başlatmasını iste.',
      });
      safeClose(conn, 350);
      return;
    }

    try {
      const added = addHumanToRoom(this.state, { name, avatarId });
      this.state = added.state;
      this.bindConnection(conn, added.player.id);
      this.sendWelcome(conn, added.player.id);
      this.afterStateChange();
    } catch (error) {
      safeSend(conn, { t: 'error', message: messageOf(error) });
      safeClose(conn, 350);
    }
  }

  private bindConnection(conn: DataConnection, playerId: string): void {
    const previous = this.connByPlayer.get(playerId);
    if (previous && previous !== conn) {
      this.playerByConn.delete(previous);
      safeClose(previous, 0);
    }
    this.connByPlayer.set(playerId, conn);
    this.playerByConn.set(conn, playerId);
  }

  private sendWelcome(conn: DataConnection, playerId: string): void {
    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player) {
      safeSend(conn, { t: 'error', message: 'Oyuncu kaydı bulunamadı.' });
      return;
    }
    try {
      safeSend(conn, {
        t: 'welcome',
        playerId: player.id,
        token: player.token,
        view: projectRoom(this.state, player.id),
      });
    } catch (error) {
      safeSend(conn, { t: 'error', message: messageOf(error) });
    }
  }

  private handleAction(playerId: string, action: RoomAction): void {
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
      this.sendError(playerId, 'Geçersiz eylem.');
      return;
    }
    const beforeIds = new Set(this.state.players.map((player) => player.id));
    try {
      if (isLobbyAction(action)) {
        this.state = applyLobbyAction(this.state, playerId, action);
      } else if (isGameAction(action)) {
        this.state = applyGameActionToRoom(this.state, playerId, action);
      } else {
        throw new RoomError('Bilinmeyen eylem.');
      }
    } catch (error) {
      this.sendError(playerId, messageOf(error));
      this.sendSnapshotTo(playerId);
      return;
    }
    this.closeRemovedPlayers(beforeIds);
    this.afterStateChange();
  }

  private sendError(playerId: string, message: string): void {
    if (playerId === this.state.hostId) {
      this.snap.error = message;
      this.emit();
      return;
    }
    safeSend(this.connByPlayer.get(playerId) ?? null, { t: 'error', message });
  }

  private sendSnapshotTo(playerId: string): void {
    if (playerId === this.state.hostId) {
      this.refreshHostView();
      return;
    }
    const conn = this.connByPlayer.get(playerId);
    if (!conn) return;
    try {
      safeSend(conn, {
        t: 'snapshot',
        view: projectRoom(this.state, playerId),
      });
    } catch {
      // yoksay
    }
  }

  private closeRemovedPlayers(beforeIds: Set<string>): void {
    for (const playerId of beforeIds) {
      if (this.state.players.some((player) => player.id === playerId)) continue;
      this.cancelDisconnect(playerId);
      const conn = this.connByPlayer.get(playerId);
      if (!conn) continue;
      safeSend(conn, { t: 'closed', message: 'Odadan çıkarıldın.' });
      this.connByPlayer.delete(playerId);
      this.playerByConn.delete(conn);
      safeClose(conn, 180);
    }
  }

  private handleLeave(playerId: string, conn: DataConnection): void {
    this.cancelDisconnect(playerId);
    try {
      if (this.state.status === 'lobby') {
        this.state = removePlayerFromRoom(this.state, playerId);
      } else if (this.state.game && this.state.game.phase !== 'gameOver') {
        this.state = convertPlayerToBot(this.state, playerId);
      }
    } catch (error) {
      this.sendError(playerId, messageOf(error));
    }
    safeSend(conn, { t: 'closed', message: 'Odadan ayrıldın.' });
    this.connByPlayer.delete(playerId);
    this.playerByConn.delete(conn);
    safeClose(conn, 100);
    this.afterStateChange();
  }

  private onDisconnect(conn: DataConnection): void {
    const playerId = this.playerByConn.get(conn);
    if (!playerId) return;
    this.playerByConn.delete(conn);
    if (this.connByPlayer.get(playerId) === conn) {
      this.connByPlayer.delete(playerId);
    }
    if (this.disposed) return;
    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player || player.isHost || player.isBot) return;
    this.state = markConnected(this.state, playerId, false);
    this.afterStateChange();
    this.scheduleDisconnect(playerId);
  }

  private scheduleDisconnect(playerId: string): void {
    this.cancelDisconnect(playerId);
    const timer = window.setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      if (this.disposed) return;
      const player = this.state.players.find((entry) => entry.id === playerId);
      if (!player || player.connected || player.isBot || player.isHost) return;
      if (this.state.status === 'lobby') {
        try {
          this.state = removePlayerFromRoom(this.state, playerId);
          this.afterStateChange();
        } catch {
          // yoksay
        }
        return;
      }
      if (this.state.game && this.state.game.phase !== 'gameOver') {
        try {
          this.state = convertPlayerToBot(this.state, playerId);
          this.afterStateChange();
        } catch {
          // yoksay
        }
      }
    }, DISCONNECT_GRACE_MS);
    this.disconnectTimers.set(playerId, timer);
  }

  private cancelDisconnect(playerId: string): void {
    const timer = this.disconnectTimers.get(playerId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }
  }

  private recoverDisconnectedPlayers(): void {
    for (const player of this.state.players) {
      if (player.isHost || player.isBot) continue;
      this.scheduleDisconnect(player.id);
    }
  }

  private refreshHostView(): void {
    try {
      this.snap.view = projectRoom(this.state, this.state.hostId);
      this.snap.selfId = this.state.hostId;
    } catch {
      // Projeksiyon hatası oyunu durdurmasın.
    }
    this.emit();
  }

  private afterStateChange(): void {
    saveHostState(this.state);
    this.snap.view = projectRoom(this.state, this.state.hostId);
    this.snap.selfId = this.state.hostId;
    for (const [playerId, conn] of this.connByPlayer) {
      if (!conn.open) continue;
      try {
        safeSend(conn, {
          t: 'snapshot',
          view: projectRoom(this.state, playerId),
        });
      } catch {
        // Bağlantı kapanmış olabilir.
      }
    }
    this.emit();
  }

  private broadcastClosed(message: string): void {
    for (const conn of this.connByPlayer.values()) {
      safeSend(conn, { t: 'closed', message });
      safeClose(conn, 120);
    }
    this.connByPlayer.clear();
    this.playerByConn.clear();
  }

  private teardown(): void {
    this.disposed = true;
    window.removeEventListener('beforeunload', this.beforeUnload);
    this.clearPeerTimers();
    for (const timer of this.disconnectTimers.values()) window.clearTimeout(timer);
    this.disconnectTimers.clear();
    for (const conn of this.connByPlayer.values()) {
      try {
        conn.close();
      } catch {
        // yoksay
      }
    }
    this.connByPlayer.clear();
    this.playerByConn.clear();
    const peer = this.peer;
    this.peer = null;
    if (peer) {
      try {
        peer.destroy();
      } catch {
        // yoksay
      }
    }
  }
}

export class ClientSession extends BaseSession {
  private readonly code: string;
  private readonly profile: { name: string; avatarId: string };
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private attempts = 0;
  private lastLossAt = 0;
  private retryTimer: number | null = null;
  private welcomeTimer: number | null = null;
  private peerOpenTimer: number | null = null;
  private connectTimer: number | null = null;
  private readonly beforeUnload = (event: BeforeUnloadEvent) => {
    if (this.snap.view?.game) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  constructor(code: string, profile: { name: string; avatarId: string }) {
    super('client');
    this.code = code;
    this.profile = profile;
    window.addEventListener('beforeunload', this.beforeUnload);
    this.openPeer();
  }

  send(action: RoomAction): void {
    if (this.disposed) return;
    if (this.conn?.open) {
      try {
        this.conn.send({ t: 'action', action } satisfies ClientMessage);
        return;
      } catch {
        // Aşağıdaki hata mesajına düş.
      }
    }
    this.snap.error = 'Bağlantı hazır değil. Yeniden bağlanılıyor.';
    this.emit();
    this.retry();
  }

  retry(): void {
    if (this.disposed) return;
    this.attempts = 0;
    this.snap.status = 'connecting';
    this.snap.error = null;
    this.emit();
    this.openPeer();
  }

  leave(): void {
    if (this.disposed) return;
    if (this.conn?.open) {
      try {
        this.conn.send({ t: 'leave' } satisfies ClientMessage);
      } catch {
        // yoksay
      }
    }
    clearToken(this.code);
    this.snap.status = 'closed';
    this.snap.error = 'Odadan ayrıldın.';
    this.snap.view = null;
    this.snap.selfId = null;
    this.emit();
    this.teardown();
  }

  dispose(): void {
    if (this.disposed) return;
    this.teardown();
  }

  private openPeer(): void {
    if (this.disposed) return;
    this.clearTimers();
    this.closeConnection();
    const previous = this.peer;
    this.peer = null;
    if (previous) {
      try {
        previous.destroy();
      } catch {
        // yoksay
      }
    }
    this.snap.status = 'connecting';
    this.emit();

    const peer = new Peer(PEER_OPTIONS);
    this.peer = peer;
    this.peerOpenTimer = window.setTimeout(() => {
      this.peerOpenTimer = null;
      if (this.peer !== peer || this.disposed || peer.open) return;
      this.lost('Sinyal sunucusuna ulaşılamadı.', 12);
    }, 18_000);

    peer.on('open', () => {
      if (this.peer !== peer || this.disposed) return;
      this.clearPeerOpenTimer();
      this.connectToHost();
    });

    peer.on('disconnected', () => {
      if (this.peer !== peer || this.disposed) return;
      this.lost('Sinyal sunucusu bağlantısı koptu.', 12);
    });

    peer.on('close', () => {
      if (this.peer !== peer || this.disposed) return;
      this.lost('Bağlantı kapandı.', 12);
    });

    peer.on('error', (error: Error & { type?: string }) => {
      if (this.peer !== peer || this.disposed) return;
      const type = error.type ?? '';
      if (type === 'peer-unavailable') {
        this.lost('Oda bulunamadı. Kod doğru mu?', 4);
        return;
      }
      if (type === 'browser-incompatible') {
        this.fatal(
          'Tarayıcı WebRTC desteklemiyor. Güncel Chrome, Safari veya Firefox kullan.',
        );
        return;
      }
      if (
        type === 'network' ||
        type === 'server-error' ||
        type === 'socket-error' ||
        type === 'socket-closed'
      ) {
        this.lost('Sinyal sunucusuna ulaşılamıyor.', 12);
        return;
      }
      this.lost(`Bağlantı hatası: ${error.message}`, 12);
    });
  }

  private connectToHost(): void {
    if (this.disposed || !this.peer || this.peer.destroyed) return;
    let conn: DataConnection;
    try {
      conn = this.peer.connect(peerIdFor(this.code), {
        reliable: true,
        serialization: 'json',
      });
    } catch (error) {
      this.lost(`Odaya bağlanılamadı: ${messageOf(error)}`, 12);
      return;
    }
    this.conn = conn;
    this.connectTimer = window.setTimeout(() => {
      this.connectTimer = null;
      if (this.conn !== conn || this.disposed || conn.open) return;
      this.lost('Odaya ulaşılamadı.', 12);
    }, 15_000);
    conn.on('open', () => {
      if (this.conn !== conn || this.disposed) return;
      this.clearConnectTimer();
      this.sendHello();
      this.startWelcomeTimer();
    });
    conn.on('data', (data) => {
      if (this.conn !== conn || this.disposed) return;
      this.onHostMessage(data);
    });
    conn.on('close', () => {
      if (this.conn !== conn) return;
      this.conn = null;
      this.lost('Oda bağlantısı kapandı.', 12);
    });
    conn.on('error', (error) => {
      if (this.conn !== conn) return;
      this.conn = null;
      this.lost(`Oda bağlantısı hatası: ${messageOf(error)}`, 12);
    });
  }

  private sendHello(): void {
    if (!this.conn?.open) return;
    try {
      this.conn.send({
        t: 'hello',
        name: this.profile.name,
        avatarId: this.profile.avatarId,
        token: getToken(this.code),
      } satisfies ClientMessage);
    } catch {
      this.lost('Odaya katılım isteği gönderilemedi.', 12);
    }
  }

  private startWelcomeTimer(): void {
    this.clearWelcomeTimer();
    this.welcomeTimer = window.setTimeout(() => {
      this.welcomeTimer = null;
      if (this.snap.status === 'online') return;
      this.lost('Oda yanıt vermedi.', 12);
    }, 12_000);
  }

  private onHostMessage(raw: unknown): void {
    let data: unknown = raw;
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw) as unknown;
      } catch {
        return;
      }
    }
    if (!data || typeof data !== 'object') return;
    const message = data as Partial<HostMessage> & { t?: string };
    if (message.t === 'welcome') {
      const welcome = data as Extract<HostMessage, { t: 'welcome' }>;
      if (
        typeof welcome.playerId !== 'string' ||
        typeof welcome.token !== 'string' ||
        !welcome.view
      ) {
        return;
      }
      this.clearWelcomeTimer();
      saveToken(this.code, welcome.token);
      this.snap.selfId = welcome.playerId;
      this.snap.view = welcome.view;
      this.snap.status = 'online';
      this.snap.error = null;
      this.attempts = 0;
      this.emit();
      return;
    }
    if (message.t === 'snapshot') {
      const snapshot = data as Extract<HostMessage, { t: 'snapshot' }>;
      if (!snapshot.view) return;
      this.snap.view = snapshot.view;
      this.snap.status = 'online';
      this.snap.error = null;
      this.emit();
      return;
    }
    if (message.t === 'error') {
      const error = data as Extract<HostMessage, { t: 'error' }>;
      if (typeof error.message === 'string') {
        this.snap.error = error.message;
        this.emit();
      }
      return;
    }
    if (message.t === 'closed') {
      const closed = data as Extract<HostMessage, { t: 'closed' }>;
      this.fatal(closed.message || 'Oda kapandı.');
    }
  }

  private lost(message: string, fatalAfter: number): void {
    if (this.disposed) return;
    const at = Date.now();
    if (at - this.lastLossAt < 450) return;
    this.lastLossAt = at;
    this.clearTimers();
    this.closeConnection();
    const previous = this.peer;
    this.peer = null;
    if (previous) {
      try {
        previous.destroy();
      } catch {
        // yoksay
      }
    }
    this.attempts += 1;
    if (this.attempts >= fatalAfter) {
      this.fatal(
        fatalAfter <= 4
          ? 'Oda bulunamadı veya kapandı. Kodu ve oda sahibinin sekmeyi açık tuttuğunu kontrol et.'
          : 'Odaya bağlanılamadı. Oda sahibinin sekmeyi açık tutması gerekiyor.',
      );
      return;
    }
    this.snap.status = 'offline';
    this.snap.error = `${message} Yeniden denenecek (${this.attempts}/${fatalAfter}).`;
    this.emit();
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.openPeer();
    }, Math.min(1200 + this.attempts * 500, 5000));
  }

  private fatal(message: string): void {
    this.clearTimers();
    this.closeConnection();
    const peer = this.peer;
    this.peer = null;
    if (peer) {
      try {
        peer.destroy();
      } catch {
        // yoksay
      }
    }
    this.snap.status = 'error';
    this.snap.error = message;
    this.emit();
  }

  private closeConnection(): void {
    this.clearConnectTimer();
    const conn = this.conn;
    this.conn = null;
    if (conn) {
      try {
        conn.close();
      } catch {
        // yoksay
      }
    }
  }

  private clearWelcomeTimer(): void {
    if (this.welcomeTimer !== null) {
      window.clearTimeout(this.welcomeTimer);
      this.welcomeTimer = null;
    }
  }

  private clearPeerOpenTimer(): void {
    if (this.peerOpenTimer !== null) {
      window.clearTimeout(this.peerOpenTimer);
      this.peerOpenTimer = null;
    }
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      window.clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearWelcomeTimer();
    this.clearPeerOpenTimer();
    this.clearConnectTimer();
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private teardown(): void {
    this.disposed = true;
    window.removeEventListener('beforeunload', this.beforeUnload);
    this.clearTimers();
    this.closeConnection();
    const peer = this.peer;
    this.peer = null;
    if (peer) {
      try {
        peer.destroy();
      } catch {
        // yoksay
      }
    }
  }
}

export function createRoomSession(
  mode: 'host' | 'client',
  code: string,
  profile: { name: string; avatarId: string },
): RoomSession {
  return mode === 'host'
    ? new HostSession(code, profile)
    : new ClientSession(code, profile);
}
