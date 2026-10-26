import { Bot, Crown, Gavel, ShieldCheck, Skull, Users } from 'lucide-react';
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
              <div className={cn('seat-card__office', office && `seat-card__office--${office}`)}>
                {player.isPresident ? (
                  <>
                    <ShieldCheck size={12} /> Başkan
                  </>
                ) : player.isChancellor ? (
                  <>
                    <Gavel size={12} /> Başbakan
                  </>
                ) : (
                  <span className="seat-card__office-empty" aria-hidden="true" />
                )}
              </div>

              <div className="seat-card__portrait">
                <span className="seat-card__portrait-glow" aria-hidden="true" />
                <Avatar
                  avatarId={player.avatarId}
                  size="xl"
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
                    <Skull size={12} /> Ölü
                  </span>
                ) : null}
                {isViewer && player.alive ? (
                  <span className="seat-card__stamp seat-card__stamp--you">Sen</span>
                ) : null}
                {isWinner ? (
                  <Crown className="seat-card__crown" size={16} aria-label="Kazandı" />
                ) : null}
              </div>

              <div className="seat-card__info">
                <strong className="seat-card__name">{player.name}</strong>
                <span className="seat-card__meta">
                  {player.isBot ? (
                    <>
                      <Bot size={11} /> Bot
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
              </div>
            </article>
          );
        })}
      </div>

      <p className="player-stage__count">
        <Users size={12} />
        {game.livingPlayers} / {game.totalPlayers} hayatta
      </p>
    </section>
  );
}
