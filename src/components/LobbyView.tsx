import {
  AlertTriangle,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Info,
  LogOut,
  Pencil,
  Play,
  Plus,
  Share2,
  Trash2,
  UserMinus,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GAME_CONFIG } from '../game';
import type { ConnectionState } from '../hooks/useMultiplayerRoom';
import type { LobbyAction, LobbyPlayerDto, RoomSnapshot } from '../lib/multiplayer';
import { cn } from '../lib/cn';
import { copyText, roomInviteUrl } from '../lib/validation';
import { RoleComposition } from './RoleComposition';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { ConnectionPill } from './ui/ConnectionPill';
import { Logo } from './ui/Logo';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

function LobbyPlayerCard({
  player,
  viewerId,
  isHostViewer,
  actionPending,
  onRemoveBot,
  onKick,
}: {
  player: LobbyPlayerDto;
  viewerId: string;
  isHostViewer: boolean;
  actionPending: boolean;
  onRemoveBot: (botId: string) => void;
  onKick: (player: LobbyPlayerDto) => void;
}) {
  const isViewer = player.id === viewerId;
  return (
    <article
      className={cn(
        'lobby-player-card',
        player.isHost && 'lobby-player-card--host',
        isViewer && 'lobby-player-card--viewer',
        !player.connected && 'lobby-player-card--offline',
      )}
    >
      <div className="lobby-player-card__top">
        <Avatar
          avatarId={player.avatarId}
          size="lg"
          ring={player.isHost ? 'gold' : isViewer ? 'violet' : 'none'}
          dimmed={!player.connected}
        />
        <div className="lobby-player-card__identity">
          <strong>
            {player.name}
            {isViewer ? <span className="you-badge">Sen</span> : null}
          </strong>
          <span className="lobby-player-card__meta">
            {player.isBot ? (
              <>
                <Bot size={12} /> Bot
              </>
            ) : player.isHost ? (
              <>
                <Crown size={12} /> Host
              </>
            ) : (
              'Oyuncu'
            )}
          </span>
        </div>
        {isHostViewer && !isViewer ? (
          player.isBot ? (
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              onClick={() => onRemoveBot(player.id)}
              aria-label={`${player.name} botunu çıkar`}
              disabled={actionPending}
            >
              <Trash2 size={15} />
            </button>
          ) : (
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              onClick={() => onKick(player)}
              aria-label={`${player.name} oyuncusunu çıkar`}
              disabled={actionPending}
            >
              <UserMinus size={15} />
            </button>
          )
        ) : null}
      </div>

      <div className="lobby-player-card__status">
        {!player.connected && !player.isBot ? (
          <span className="ready-badge ready-badge--offline">
            <WifiOff size={12} /> Bağlantı koptu
          </span>
        ) : player.ready || player.isBot ? (
          <span className="ready-badge ready-badge--ready">
            <CheckCircle2 size={12} /> Hazır
          </span>
        ) : (
          <span className="ready-badge ready-badge--waiting">
            <Clock size={12} /> Bekliyor
          </span>
        )}
        {player.isBot ? <span className="muted">Botlar otomatik hazırdır.</span> : null}
      </div>
    </article>
  );
}

export function LobbyView({
  snapshot,
  connection,
  actionPending,
  error,
  onDismissError,
  onLobbyAction,
  onClaimHost,
  onLeave,
  onEditProfile,
}: {
  snapshot: RoomSnapshot;
  connection: ConnectionState;
  actionPending: boolean;
  error: string | null;
  onDismissError: () => void;
  onLobbyAction: (action: LobbyAction) => void;
  onClaimHost: () => void;
  onLeave: () => void;
  onEditProfile: () => void;
}) {
  const lobby = snapshot.lobby;
  const toast = useToast();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<LobbyPlayerDto | null>(null);

  if (!lobby) {
    return (
      <div className="page-shell">
        <p className="muted">Lobi bilgisi yüklenemedi.</p>
      </div>
    );
  }

  const viewerId = snapshot.you.playerId;
  const isHost = lobby.hostId === viewerId;
  const viewer = lobby.players.find((player) => player.id === viewerId);
  const total = lobby.players.length;
  const hostPlayer = lobby.players.find((player) => player.isHost);
  const isReady = Boolean(viewer?.ready);

  const copyCode = async () => {
    const ok = await copyText(lobby.code);
    toast.push(
      ok ? 'Oda kodu kopyalandı.' : 'Kod kopyalanamadı. Kodu elle paylaşabilirsin.',
      ok ? 'success' : 'error',
    );
  };

  const copyInvite = async () => {
    const ok = await copyText(roomInviteUrl(lobby.code));
    toast.push(
      ok ? 'Davet bağlantısı kopyalandı.' : 'Bağlantı kopyalanamadı.',
      ok ? 'success' : 'error',
    );
  };

  return (
    <div className="lobby-page">
      <header className="game-topbar">
        <div className="game-topbar__left">
          <Logo compact />
          <button
            type="button"
            className="room-code-pill"
            onClick={copyInvite}
            title="Davet bağlantısını kopyala"
          >
            <span className="room-code-pill__label">Oda</span>
            <strong>{lobby.code}</strong>
            <Copy size={13} />
          </button>
          <ConnectionPill connection={connection} />
        </div>
        <div className="game-topbar__right">
          {viewer ? (
            <span className="viewer-identity">
              <Avatar avatarId={viewer.avatarId} size="sm" ring="violet" />
              <span>{viewer.name}</span>
            </span>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            onClick={onEditProfile}
            aria-label="Profilini düzenle"
            disabled={actionPending}
          >
            <Pencil size={17} />
          </button>
          <Link to="/guide" className="icon-btn" aria-label="Nasıl oynanır?">
            <BookOpen size={17} />
          </Link>
          <button
            type="button"
            className="icon-btn game-topbar__leave"
            onClick={() => setLeaveOpen(true)}
            aria-label="Odadan ayrıl"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="lobby-main">
        {error ? (
          <div className="form-alert form-alert--error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button type="button" className="icon-btn" onClick={onDismissError} aria-label="Hatayı kapat">
              <X size={14} />
            </button>
          </div>
        ) : null}

        <section className="lobby-hero">
          <div className="lobby-hero__intro">
            <p className="eyebrow">Çok oyunculu</p>
            <h1>Oda lobisi</h1>
            <p>
              Arkadaşların oda kodunu girsin. En az 5, en fazla 10 oyuncu. Tüm insan
              oyuncular hazır olduğunda host oyunu başlatır.
            </p>
            <div className="lobby-hero__meta">
              <span className="chip">
                <Users size={13} /> {total}/{lobby.maxPlayers} oyuncu
              </span>
              <span className="chip">
                <CheckCircle2 size={13} /> {lobby.players.filter((p) => p.ready || p.isBot).length} hazır
              </span>
              {hostPlayer && !hostPlayer.connected ? (
                <span className="chip chip--red">
                  <WifiOff size={13} /> Host bağlantısı koptu
                </span>
              ) : null}
            </div>
          </div>

          <div className="lobby-code-card">
            <span className="lobby-code-card__label">Oda kodu</span>
            <strong className="lobby-code-card__code">{lobby.code}</strong>
            <div className="lobby-code-card__actions">
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                icon={<Copy size={14} />}
              >
                Kodu kopyala
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyInvite}
                icon={<Share2 size={14} />}
              >
                Davet linki
              </Button>
            </div>
            <p className="lobby-code-card__hint">
              Bağlantıyı paylaş veya kodu arkadaşlarına söyle.
            </p>
          </div>
        </section>

        <section className="lobby-section">
          <header className="lobby-section__header">
            <div>
              <p className="eyebrow">Masa</p>
              <h2>Oyuncular</h2>
            </div>
            <span className="muted">{lobby.minPlayers}-{lobby.maxPlayers} oyuncu</span>
          </header>

          <div className="lobby-player-grid">
            {lobby.players.map((player) => (
              <LobbyPlayerCard
                key={player.id}
                player={player}
                viewerId={viewerId}
                isHostViewer={isHost}
                actionPending={actionPending}
                onRemoveBot={(botId) => onLobbyAction({ type: 'remove_bot', botId })}
                onKick={(target) => setKickTarget(target)}
              />
            ))}
            {isHost && total < lobby.maxPlayers ? (
              <button
                type="button"
                className="lobby-add-bot"
                onClick={() => onLobbyAction({ type: 'add_bot' })}
                disabled={actionPending}
              >
                <span className="lobby-add-bot__icon">
                  <Plus size={20} />
                </span>
                <strong>Bot ekle</strong>
                <span>Eksik oyuncuyu botla tamamla.</span>
              </button>
            ) : null}
          </div>
        </section>

        <section className="lobby-controls panel">
          <div className="lobby-controls__main">
            <Button
              variant={isReady ? 'outline' : 'primary'}
              size="lg"
              onClick={() => onLobbyAction({ type: 'toggle_ready' })}
              disabled={actionPending}
              icon={isReady ? <CheckCircle2 size={17} /> : <Clock size={17} />}
            >
              {isReady ? 'Hazırım (beklemede)' : 'Hazırım'}
            </Button>
            {isHost ? (
              <Button
                variant="gold"
                size="lg"
                onClick={() => onLobbyAction({ type: 'start' })}
                disabled={!lobby.canStart || actionPending}
                loading={actionPending}
                icon={<Play size={17} />}
              >
                Oyunu Başlat
              </Button>
            ) : (
              <p className="lobby-controls__wait">
                Host’un oyunu başlatması bekleniyor.
              </p>
            )}
            {lobby.canClaimHost ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={onClaimHost}
                disabled={actionPending}
                icon={<Crown size={17} />}
              >
                Host’luğu Devral
              </Button>
            ) : null}
          </div>
          {isHost && !lobby.canStart && lobby.startBlockReason ? (
            <p className="lobby-controls__reason">
              <Info size={14} /> {lobby.startBlockReason}
            </p>
          ) : null}
        </section>

        <div className="lobby-info-grid">
          <section className="panel">
            <header className="panel__header">
              <div>
                <p className="eyebrow">Bu oda</p>
                <h3 className="panel__title">Rol dağılımı</h3>
              </div>
            </header>
            <RoleComposition totalPlayers={total} />
            <p className="muted">
              Roller oyun başlarken rastgele dağıtılır. Herkes yalnızca kendi rolünü ve
              kuralların izin verdiği bilgileri görür.
            </p>
          </section>

          <section className="panel">
            <header className="panel__header">
              <div>
                <p className="eyebrow">Özet</p>
                <h3 className="panel__title">Oda kuralları</h3>
              </div>
            </header>
            <ul className="rule-list">
              <li>5-10 oyuncu. Botlar eksikleri tamamlayabilir.</li>
              <li>{GAME_CONFIG.democraticWinThreshold} Demokratik Reform Demokrat zaferini getirir.</li>
              <li>7 Otokrat Reform Otokrat zaferini getirir.</li>
              <li>3 üst üste ret, destenin üst kartını otomatik yürürlüğe sokar.</li>
              <li>İlk üç reforma kadar oylar gizlidir; sonrasında açık oylama başlar.</li>
              <li>Büyük Vezir başlangıçta 2 oy gücüne sahiptir.</li>
            </ul>
            <Link to="/guide" className="text-link">
              <BookOpen size={14} /> Kuralların tamamını oku
            </Link>
          </section>
        </div>
      </main>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Odadan ayrıl?"
        eyebrow="Lobi"
        subtitle="Lobiden ayrılırsan oturumun bu cihazdan kapatılır."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLeaveOpen(false);
                onLeave();
              }}
              icon={<LogOut size={16} />}
            >
              Ayrıl
            </Button>
          </div>
        }
      >
        <p className="muted">
          Oda devam ederse aynı odaya yeniden katılmak için davet bağlantısına ihtiyacın
          olabilir.
        </p>
      </Modal>

      <Modal
        open={kickTarget !== null}
        onClose={() => setKickTarget(null)}
        title="Oyuncuyu çıkar?"
        eyebrow="Host işlemi"
        subtitle={
          kickTarget
            ? `${kickTarget.name} odadan çıkarılacak.`
            : 'Oyuncu odadan çıkarılacak.'
        }
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setKickTarget(null)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!kickTarget) return;
                onLobbyAction({ type: 'kick', playerId: kickTarget.id });
                setKickTarget(null);
              }}
              icon={<UserMinus size={16} />}
            >
              Çıkar
            </Button>
          </div>
        }
      >
        <p className="muted">Bu işlem geri alınamaz. Oyuncu isterse davet linkiyle yeniden katılabilir.</p>
      </Modal>
    </div>
  );
}
