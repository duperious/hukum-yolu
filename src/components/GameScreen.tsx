import { Copy, Eye, LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { ConnectionState } from '../hooks/useMultiplayerRoom';
import type { GameAction, RedactedGameState } from '../game';
import { FASCIST_TRACK_LABELS } from '../game';
import { copyText, roomInviteUrl } from '../lib/validation';
import { ActionPanel } from './ActionPanel';
import { EndScreen } from './EndScreen';
import { GameLog } from './GameLog';
import { GovernmentPanel } from './GovernmentPanel';
import { PlayerCircle } from './PlayerCircle';
import { PolicyTrack } from './PolicyTrack';
import { PowerPanel } from './PowerPanel';
import { PrivacyGate } from './PrivacyGate';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { ConnectionPill } from './ui/ConnectionPill';
import { Logo } from './ui/Logo';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

export function GameScreen({
  redacted,
  viewerId,
  mode,
  roomCode,
  connection,
  actionPending = false,
  error = null,
  onDismissError,
  onAction,
  onLeave,
  onRestart,
  restartPending = false,
  isHost,
}: {
  redacted: RedactedGameState;
  viewerId: string;
  mode: 'local' | 'multiplayer';
  roomCode?: string;
  connection?: ConnectionState;
  actionPending?: boolean;
  error?: string | null;
  onDismissError?: () => void;
  onAction: (action: GameAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  restartPending?: boolean;
  isHost?: boolean;
}) {
  const { public: game, private: view } = redacted;
  const [roleGate, setRoleGate] = useState<'reveal' | 'inspect' | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const toast = useToast();
  const viewer = game.players.find((player) => player.id === viewerId);

  const openRole = (preferred?: 'reveal' | 'inspect') => {
    if (preferred) {
      setRoleGate(preferred);
      return;
    }
    setRoleGate(
      game.phase === 'roleReveal' && !view.roleRevealAcknowledged
        ? 'reveal'
        : 'inspect',
    );
  };

  const copyInvite = async () => {
    if (!roomCode) return;
    const ok = await copyText(roomInviteUrl(roomCode));
    toast.push(
      ok ? 'Davet bağlantısı kopyalandı.' : 'Bağlantı kopyalanamadı. Kodu elle paylaşabilirsin.',
      ok ? 'success' : 'error',
    );
  };

  return (
    <div className={`game-screen game-screen--${mode}`}>
      <header className="game-topbar">
        <div className="game-topbar__left">
          <Logo compact />
          {mode === 'multiplayer' && roomCode ? (
            <button
              type="button"
              className="room-code-pill"
              onClick={copyInvite}
              title="Davet bağlantısını kopyala"
            >
              <span className="room-code-pill__label">Oda</span>
              <strong>{roomCode}</strong>
              <Copy size={13} />
            </button>
          ) : (
            <span className="chip chip--gold">
              <ShieldCheck size={13} /> Yerel test
            </span>
          )}
          {mode === 'multiplayer' && connection ? (
            <ConnectionPill connection={connection} />
          ) : null}
        </div>

        <div className="game-topbar__right">
          {viewer ? (
            <span className="viewer-identity">
              <Avatar avatarId={viewer.avatarId} size="sm" ring="violet" />
              <span>{viewer.name}</span>
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openRole()}
            icon={<Eye size={15} />}
          >
            Rolüm
          </Button>
          <button
            type="button"
            className="icon-btn game-topbar__leave"
            onClick={() => setLeaveOpen(true)}
            aria-label={mode === 'multiplayer' ? 'Odadan ayrıl' : 'Oyundan çık'}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="game-layout">
        <aside className="game-aside">
          <ActionPanel
            game={game}
            view={view}
            onAction={onAction}
            actionPending={actionPending}
            error={error}
            onDismissError={onDismissError}
            onOpenRole={() => openRole()}
          />
          <PowerPanel
            view={view}
            game={game}
            onAction={onAction}
            disabled={actionPending}
          />
          <GameLog entries={game.log} />
        </aside>

        <div className="game-main">
          <div className="game-tracks">
            <PolicyTrack
              type="demokratik"
              enacted={game.enacted.democratic}
              length={game.democraticWinThreshold}
            />
            <PolicyTrack
              type="otokrat"
              enacted={game.enacted.fascist}
              length={game.fascistTrackLength}
              labels={FASCIST_TRACK_LABELS}
            />
          </div>
          <GovernmentPanel game={game} />
          <PlayerCircle game={game} viewerId={viewerId} />
        </div>
      </main>

      <PrivacyGate
        open={roleGate !== null}
        role={view.role}
        view={view}
        players={game.players}
        mode={roleGate ?? 'inspect'}
        acknowledged={view.roleRevealAcknowledged}
        onClose={() => setRoleGate(null)}
        onAcknowledge={() => onAction({ type: 'ack_role' })}
      />

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={mode === 'multiplayer' ? 'Odadan ayrıl?' : 'Oyundan çık?'}
        eyebrow={mode === 'multiplayer' ? 'Bağlantı' : 'Yerel test'}
        subtitle={
          mode === 'multiplayer'
            ? 'Oturumun bu cihazdan kapatılacak. Oyun sırasında ayrılırsan rolün bot tarafından devralınır.'
            : 'Yerel test oyunu bu cihazda saklanmıyor. Çıkarsan oyun kaybolur.'
        }
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
              {mode === 'multiplayer' ? 'Ayrıl' : 'Çık'}
            </Button>
          </div>
        }
      >
        <p className="muted">
          {mode === 'multiplayer'
            ? 'Bağlantın koparsa oturumun cihazda kalır ve ana sayfadaki “Devam eden oda” kartından dönebilirsin. “Ayrıl” seçersen oturum silinir; oyun sırasındaysa yerini bot alır.'
            : 'Ana sayfaya dönüp yeni bir test oyunu başlatabilirsin.'}
        </p>
      </Modal>

      {game.phase === 'gameOver' ? (
        <EndScreen
          game={game}
          viewerId={viewerId}
          mode={mode}
          isHost={isHost ?? view.isHost}
          onRestart={onRestart}
          onLeave={onLeave}
          onOpenRole={() => openRole('inspect')}
          restartPending={restartPending}
        />
      ) : null}
    </div>
  );
}
