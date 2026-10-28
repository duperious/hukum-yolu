import { ArrowRight, Gavel, ShieldCheck, Vote } from 'lucide-react';
import type { PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';

export function GovernmentPanel({ game }: { game: PublicGameState }) {
  const byId = new Map(game.players.map((player) => [player.id, player]));
  const president = game.presidentId ? byId.get(game.presidentId) : null;
  const chancellor = game.chancellorId ? byId.get(game.chancellorId) : null;
  const previous = game.previousChancellorId
    ? byId.get(game.previousChancellorId)
    : null;
  const dpp = game.democraticPartyPresidentId
    ? byId.get(game.democraticPartyPresidentId)
    : null;
  const showVotes =
    game.phase === 'voting' && game.totalVoters > 0 && game.votesSubmitted > 0;

  return (
    <section className="government-panel panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Dönem {game.round}</p>
          <h3 className="panel__title">Hükümet</h3>
        </div>
        {showVotes ? (
          <span className="chip chip--blue">
            <Vote size={13} />
            {game.votesSubmitted}/{game.totalVoters} oy
          </span>
        ) : null}
      </header>

      <div className="government-panel__row">
        <div className="government-seat">
          <span className="government-seat__label">
            <ShieldCheck size={13} /> Başkan
          </span>
          {president ? (
            <div className="government-seat__person">
              <Avatar avatarId={president.avatarId} size="md" ring="gold" />
              <div>
                <strong>{president.name}</strong>
                <span>{president.alive ? 'Görevde' : 'Ölü'}</span>
              </div>
            </div>
          ) : (
            <span className="muted">Belirlenmedi</span>
          )}
        </div>

        <ArrowRight className="government-panel__arrow" size={20} aria-hidden="true" />

        <div className="government-seat">
          <span className="government-seat__label">
            <Gavel size={13} /> Başbakan
          </span>
          {chancellor ? (
            <div className="government-seat__person">
              <Avatar
                avatarId={chancellor.avatarId}
                size="md"
                ring={chancellor.alive ? 'blue' : 'none'}
                dimmed={!chancellor.alive}
              />
              <div>
                <strong>{chancellor.name}</strong>
                <span>{chancellor.alive ? 'Aday' : 'Ölü'}</span>
              </div>
            </div>
          ) : (
            <span className="muted">Aday bekleniyor</span>
          )}
        </div>
      </div>

      <div className="government-panel__meta">
        <div className={cn('failed-votes', game.failedVotes >= 3 && 'failed-votes--danger')}>
          <span className="failed-votes__label">Üst üste ret</span>
          <span className="failed-votes__dots" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className={cn(
                  'failed-votes__dot',
                  index < game.failedVotes && 'failed-votes__dot--filled',
                )}
              />
            ))}
          </span>
          <strong>{game.failedVotes}/3</strong>
        </div>

        {game.lastVoteResult ? (
          <span
            className={cn(
              'result-badge',
              game.lastVoteResult === 'kabul'
                ? 'result-badge--accept'
                : 'result-badge--reject',
            )}
          >
            Son oylama: {game.lastVoteResult === 'kabul' ? 'Kabul' : 'Ret'}
          </span>
        ) : null}
      </div>

      {previous && previous.id !== game.chancellorId ? (
        <p className="government-panel__note">
          Önceki Başbakan: <strong>{previous.name}</strong> — bu dönem aday gösterilemez.
        </p>
      ) : null}

      {dpp ? (
        <p className="government-panel__note">
          Demokrat Parti Başkanı: <strong>{dpp.name}</strong>
          {!dpp.alive ? ' (ölü)' : ''}
        </p>
      ) : null}
    </section>
  );
}
