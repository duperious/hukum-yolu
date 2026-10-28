import { Crown, LogOut, RefreshCw, Scale, Sparkles, Swords, Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { ROLE_INFO } from '../game';
import type { PublicGameState, Winner } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

const WINNER_META: Record<
  Winner,
  { label: string; subtitle: string; icon: typeof Crown; tone: string }
> = {
  demokrat: {
    label: 'Demokratlar kazandı',
    subtitle: 'Hüküm maviye geçti.',
    icon: Scale,
    tone: 'blue',
  },
  otokrat: {
    label: 'Otokratlar kazandı',
    subtitle: 'Hüküm kırmızıya geçti.',
    icon: Swords,
    tone: 'red',
  },
  notr: {
    label: 'Nötr kazandı',
    subtitle: 'Tek başına hüküm sürdü.',
    icon: Sparkles,
    tone: 'violet',
  },
};

export function EndScreen({
  game,
  viewerId,
  isHost,
  onRestart,
  onLeave,
  onOpenRole,
  restartPending = false,
}: {
  game: PublicGameState;
  viewerId: string;
  isHost: boolean;
  onRestart?: () => void;
  onLeave: () => void;
  onOpenRole?: () => void;
  restartPending?: boolean;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const winner = game.winner;
  const meta = winner ? WINNER_META[winner] : null;
  const Icon = meta?.icon ?? Trophy;
  const viewerWon = game.winnerIds.includes(viewerId);
  const viewer = game.players.find((player) => player.id === viewerId);
  const winners = game.players.filter((player) => game.winnerIds.includes(player.id));

  return (
    <div className={cn('end-screen', meta && `end-screen--${meta.tone}`)}>
      <div className="end-screen__panel">
        <div className="end-screen__hero">
          <span className="end-screen__icon" aria-hidden="true">
            <Icon size={42} strokeWidth={1.5} />
          </span>
          <p className="eyebrow">Hüküm verildi</p>
          <h1>{meta?.label ?? 'Oyun sona erdi'}</h1>
          <p className="end-screen__subtitle">{meta?.subtitle ?? game.winReason}</p>
          {game.winReason ? (
            <p className="end-screen__reason">{game.winReason}</p>
          ) : null}
          <div className={cn('outcome-badge', viewerWon ? 'outcome-badge--win' : 'outcome-badge--lose')}>
            {viewerWon ? <Crown size={16} /> : null}
            {`${viewerWon ? 'Kazandın' : 'Kaybettin'}${viewer ? `, ${viewer.name}` : ''}`}
          </div>
        </div>

        <div className="end-screen__grid">
          <section className="end-screen__section">
            <h2>Kazananlar</h2>
            {winners.length > 0 ? (
              <ul className="winner-list">
                {winners.map((player) => (
                  <li key={player.id}>
                    <Avatar avatarId={player.avatarId} size="sm" ring="gold" />
                    <span>{player.name}</span>
                    {!player.alive ? <small>ölü</small> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Kazanan bulunamadı.</p>
            )}
          </section>

          <section className="end-screen__section">
            <h2>Tüm roller</h2>
            <ul className="reveal-list">
              {game.players.map((player) => {
                const role = player.revealedRole;
                const info = role ? ROLE_INFO[role] : null;
                return (
                  <li key={player.id} className={cn(info && `reveal-list__item--${info.accent}`)}>
                    <Avatar avatarId={player.avatarId} size="sm" dimmed={!player.alive} />
                    <div>
                      <strong>{player.name}</strong>
                      <span>{info?.name ?? 'Bilinmiyor'}</span>
                    </div>
                    {game.winnerIds.includes(player.id) ? (
                      <Crown size={15} className="reveal-list__crown" aria-label="Kazandı" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="end-screen__actions">
          {onRestart ? (
            <Button
              variant="gold"
              size="lg"
              onClick={onRestart}
              loading={restartPending}
              icon={<RefreshCw size={17} />}
            >
              Yeniden Oyna
            </Button>
          ) : (
            <p className="end-screen__wait">
              {isHost
                ? 'Yeniden başlatmak için hazır olduğunda butona bas.'
                : 'Host’un yeniden başlatması bekleniyor.'}
            </p>
          )}
          {onOpenRole ? (
            <Button variant="outline" onClick={onOpenRole}>
              Rol kartım
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={onLeave}
            icon={<LogOut size={16} />}
          >
            Odadan Ayrıl
          </Button>
        </div>
      </div>
    </div>
  );
}
