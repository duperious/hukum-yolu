import { Bot, Crown, Gavel, ShieldCheck, Skull } from 'lucide-react';
import { ROLE_INFO } from '../game';
import type { PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';

export function PlayerCircle({
  game,
  viewerId,
  className,
}: {
  game: PublicGameState;
  viewerId: string;
  className?: string;
}) {
  return (
    <section className={cn('player-stage', className)} aria-label="Oyuncular">
      <h2 className="sr-only">Oyuncular</h2>
      <div className="player-stage__rail">
        {game.players.map((player) => {
          const isViewer = player.id === viewerId;
          const isWinner =
            game.winner !== null && game.winnerIds.includes(player.id);
          const roleInfo = player.revealedRole
            ? ROLE_INFO[player.revealedRole]
            : null;
          const office = player.isPresident
            ? 'president'
            : player.isChancellor
              ? 'chancellor'
              : null;

          return (
            <article
              key={player.id}
              className={cn(
                'seat-card',
                !player.alive && 'seat-card--dead',
                isViewer && 'seat-card--viewer',
                isWinner && 'seat-card--winner',
                office && `seat-card--${office}`,
              )}
              aria-label={`${player.name}${isViewer ? ' (sen)' : ''}`}
            >
              <span className="seat-card__portrait">
                <Avatar
                  avatarId={player.avatarId}
                  size="lg"
                  ring={
                    player.isPresident
                      ? 'gold'
                      : player.isChancellor
                        ? 'blue'
                        : isViewer
                          ? 'violet'
                          : 'none'
                  }
                  dimmed={!player.alive}
                />
                {!player.alive ? (
                  <span className="seat-card__stamp seat-card__stamp--dead">
                    <Skull size={10} /> Ölü
                  </span>
                ) : null}
                {isWinner ? (
                  <Crown className="seat-card__crown" size={13} aria-label="Kazandı" />
                ) : null}
              </span>

              <div className="seat-card__info">
                <strong className="seat-card__name">
                  {player.name}
                  {isViewer ? <em className="seat-card__you"> (sen)</em> : null}
                </strong>
                <span className="seat-card__meta">
                  <span className="seat-card__kind">
                    {player.isBot ? (
                      <>
                        <Bot size={10} /> Bot
                      </>
                    ) : (
                      'Oyuncu'
                    )}
                  </span>
                  {roleInfo ? (
                    <span className={`seat-card__role seat-card__role--${roleInfo.accent}`}>
                      {roleInfo.name}
                    </span>
                  ) : null}
                </span>
              </div>

              {office ? (
                <span className={cn('seat-card__office', `seat-card__office--${office}`)}>
                  {player.isPresident ? (
                    <>
                      <ShieldCheck size={11} /> Başkan
                    </>
                  ) : (
                    <>
                      <Gavel size={11} /> Başbakan
                    </>
                  )}
                </span>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
