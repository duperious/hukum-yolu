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
    <section className={cn('player-panel panel', className)}>
      <header className="panel__header">
        <div>
          <p className="eyebrow">Masa</p>
          <h3 className="panel__title">Oyuncular</h3>
        </div>
        <span className="chip">
          <Users size={13} />
          {game.livingPlayers} / {game.totalPlayers} hayatta
        </span>
      </header>

      <div className="player-grid">
        {game.players.map((player) => {
          const isViewer = player.id === viewerId;
          const isWinner =
            game.winner !== null && game.winnerIds.includes(player.id);
          const roleInfo = player.revealedRole
            ? ROLE_INFO[player.revealedRole]
            : null;
          return (
            <article
              key={player.id}
              className={cn(
                'player-tile',
                !player.alive && 'player-tile--dead',
                isViewer && 'player-tile--viewer',
                isWinner && 'player-tile--winner',
              )}
              aria-label={`${player.name}${isViewer ? ' (sen)' : ''}`}
            >
              <div className="player-tile__top">
                <Avatar
                  avatarId={player.avatarId}
                  size="md"
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
                <div className="player-tile__identity">
                  <strong className="player-tile__name">
                    {player.name}
                    {isViewer ? <span className="you-badge">Sen</span> : null}
                  </strong>
                  <span className="player-tile__sub">
                    {player.isBot ? (
                      <>
                        <Bot size={12} /> Bot
                      </>
                    ) : (
                      'Oyuncu'
                    )}
                  </span>
                </div>
                {isWinner ? (
                  <Crown className="player-tile__winner" size={18} aria-label="Kazandı" />
                ) : null}
              </div>

              <div className="player-tile__badges">
                {player.isPresident ? (
                  <span className="mini-badge mini-badge--gold">
                    <ShieldCheck size={11} /> Başkan
                  </span>
                ) : null}
                {player.isChancellor ? (
                  <span className="mini-badge mini-badge--blue">
                    <Gavel size={11} /> Başbakan
                  </span>
                ) : null}
                {!player.alive ? (
                  <span className="mini-badge mini-badge--dead">
                    <Skull size={11} /> Ölü
                  </span>
                ) : null}
                {roleInfo ? (
                  <span className={`mini-badge mini-badge--${roleInfo.accent}`}>
                    {roleInfo.name}
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
