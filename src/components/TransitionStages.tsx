import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Gavel,
  Landmark,
  Lock,
  ScrollText,
  ShieldCheck,
  Vote,
  X,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { GameAction, PublicGameState, VoteTally } from '../game';
import { cn } from '../lib/cn';
import { PolicyCard } from './PolicyCard';
import { Button } from './ui/Button';

type GateTone = 'gold' | 'blue' | 'red' | 'violet';

function playerName(game: PublicGameState, id: string | null | undefined): string {
  if (!id) return '—';
  return game.players.find((player) => player.id === id)?.name ?? '—';
}

function timerLabel(secondsLeft: number | null): string | null {
  if (secondsLeft === null) return null;
  return secondsLeft > 0
    ? `${secondsLeft} sn içinde otomatik ilerler`
    : 'Otomatik ilerleme hazırlanıyor…';
}

function GateShell({
  tone,
  kicker,
  title,
  lead,
  children,
  footer,
  secondsLeft,
  error,
}: {
  tone: GateTone;
  kicker: string;
  title: string;
  lead?: string;
  children: ReactNode;
  footer: ReactNode;
  secondsLeft: number | null;
  error?: string | null;
}) {
  return (
    <div
      className={cn('gate-overlay', `gate-overlay--${tone}`)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={cn('gate-stage', `gate-stage--${tone}`)}>
        <span className="gate-stage__kicker">{kicker}</span>
        <h2 className="gate-stage__title">{title}</h2>
        {lead ? <p className="gate-stage__lead">{lead}</p> : null}

        {error ? (
          <div className="gate-stage__error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {children}

        <div className="gate-stage__footer">
          <span className="gate-stage__timer">
            <Clock3 size={13} aria-hidden="true" />
            {timerLabel(secondsLeft) ?? 'Geçiş bekleniyor'}
          </span>
          {footer}
        </div>
      </div>
    </div>
  );
}

function TallyDisplay({
  tally,
  open,
}: {
  tally: VoteTally | null;
  open: boolean;
}) {
  return (
    <div className="gate-tally" aria-label="Oy sonucu">
      <div className="gate-tally__side gate-tally__side--yes">
        <span>
          <Check size={13} /> Evet
        </span>
        <strong>{tally?.yes ?? 0}</strong>
      </div>
      <span className="gate-tally__divider" aria-hidden="true">
        —
      </span>
      <div className="gate-tally__side gate-tally__side--no">
        <span>
          <X size={13} /> Hayır
        </span>
        <strong>{tally?.no ?? 0}</strong>
      </div>
      {tally?.blockedPlayerId ? (
        <span className="gate-tally__blocked">
          <ShieldCheck size={12} /> Bir oy engellendi
        </span>
      ) : null}
      <span className={cn('gate-tally__mode', open && 'gate-tally__mode--open')}>
        {open ? 'Açık oylama' : 'Gizli oylama'}
      </span>
    </div>
  );
}

function VoteBreakdown({
  game,
  tally,
}: {
  game: PublicGameState;
  tally: VoteTally | null;
}) {
  if (!tally || tally.entries.length === 0) {
    return (
      <p className="gate-reveal__secrecy">
        <Lock size={14} aria-hidden="true" />
        Bireysel oylar gizli kaldı; yalnızca ağırlıklı toplam açıklandı.
      </p>
    );
  }

  const entries = [...tally.entries].sort((a, b) => {
    if (a.choice !== b.choice) return a.choice ? -1 : 1;
    return b.weight - a.weight;
  });

  return (
    <ul className="gate-vote-list" aria-label="Bireysel oylar">
      {entries.map((entry) => {
        const player = game.players.find((item) => item.id === entry.playerId);
        if (!player) return null;
        return (
          <li
            key={entry.playerId}
            className={cn(
              'gate-vote-list__row',
              entry.choice ? 'gate-vote-list__row--yes' : 'gate-vote-list__row--no',
            )}
          >
            <span className="gate-vote-list__name">
              {player.name}
              {player.isBot ? <em>bot</em> : null}
            </span>
            {entry.weight === 0 ? (
              <span className="gate-vote-list__blocked">Oy engellendi</span>
            ) : entry.weight > 1 ? (
              <span className="gate-vote-list__weight">{entry.weight} oy</span>
            ) : null}
            <span className="gate-vote-list__stamp">
              {entry.choice ? (
                <>
                  <Check size={12} /> Evet
                </>
              ) : (
                <>
                  <X size={12} /> Hayır
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function VoteResultStage({
  game,
  onAction,
  actionPending = false,
  error = null,
  canContinue,
  secondsLeft,
}: {
  game: PublicGameState;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
  canContinue: boolean;
  secondsLeft: number | null;
}) {
  const accepted = game.lastVoteResult === 'kabul';
  const tally = game.lastVoteTally;
  const willAutoPolicy =
    !accepted &&
    game.failedVotes + 1 >= 3 &&
    game.phase === 'voteResult';
  const label = willAutoPolicy
    ? 'Otomatik Reformu Aç'
    : accepted
      ? 'Yasamayı Aç'
      : 'Yeni Döneme Geç';

  return (
    <GateShell
      tone={accepted ? 'gold' : 'red'}
      kicker={`Dönem ${game.round} · Hükümet Oylaması`}
      title={accepted ? 'Hükümet Kabul Edildi' : 'Hükümet Reddedildi'}
      lead={
        accepted
          ? `${playerName(game, game.presidentId)} başkanlığında ${playerName(
              game,
              game.chancellorId,
            )} hükümeti güvenoyu aldı.`
          : `${playerName(game, game.presidentId)} başkanlığında ${playerName(
              game,
              game.chancellorId,
            )} hükümeti güvenoyu alamadı.`
      }
      secondsLeft={secondsLeft}
      error={error}
      footer={
        canContinue ? (
          <Button
            variant={accepted ? 'primary' : 'secondary'}
            size="lg"
            loading={actionPending}
            onClick={() => onAction({ type: 'continue' })}
            icon={accepted ? <Landmark size={17} /> : <ArrowRight size={17} />}
          >
            {label}
          </Button>
        ) : (
          <span className="gate-stage__wait">
            <Vote size={14} aria-hidden="true" />
            Başkan veya host geçişi açacak
          </span>
        )
      }
    >
      <div className="gate-reveal">
        <span
          className={cn(
            'gate-reveal__seal',
            accepted ? 'gate-reveal__seal--yes' : 'gate-reveal__seal--no',
          )}
          aria-hidden="true"
        >
          {accepted ? <CheckCircle2 size={34} /> : <XCircle size={34} />}
        </span>
        <TallyDisplay tally={tally} open={game.lastVoteOpen} />
      </div>

      <VoteBreakdown game={game} tally={tally} />

      {willAutoPolicy ? (
        <p className="gate-stage__warning">
          <AlertTriangle size={14} aria-hidden="true" />
          Bu, üst üste üçüncü ret. Hükümet kurulamayacak ve destenin üstündeki
          reform otomatik yürürlüğe girecek.
        </p>
      ) : null}
    </GateShell>
  );
}

export function PolicyRevealStage({
  game,
  onAction,
  actionPending = false,
  error = null,
  canContinue,
  secondsLeft,
}: {
  game: PublicGameState;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
  canContinue: boolean;
  secondsLeft: number | null;
}) {
  const policy = game.lastEnactedPolicy;
  const isOtokrat = policy === 'otokrat';
  const win =
    game.enacted.democratic >= game.democraticWinThreshold ||
    game.enacted.fascist >= game.fascistTrackLength;

  return (
    <GateShell
      tone={isOtokrat ? 'red' : 'blue'}
      kicker={`Dönem ${game.round} · Yasama`}
      title="Reform Yürürlüğe Girdi"
      lead={
        game.lastPolicyAuto
          ? 'Üst üste üç ret nedeniyle destenin üstündeki kart hükümet kurulmadan yürürlüğe girdi.'
          : `${playerName(game, game.chancellorId)} reformu meclisten geçirdi.`
      }
      secondsLeft={secondsLeft}
      error={error}
      footer={
        canContinue ? (
          <Button
            variant={win ? 'gold' : 'primary'}
            size="lg"
            loading={actionPending}
            onClick={() => onAction({ type: 'continue' })}
            icon={win ? <Gavel size={17} /> : <ArrowRight size={17} />}
          >
            {win ? 'Sonucu Açıkla' : 'Devam Et'}
          </Button>
        ) : (
          <span className="gate-stage__wait">
            <ScrollText size={14} aria-hidden="true" />
            Başkan, Başbakan veya host devam edecek
          </span>
        )
      }
    >
      {policy ? (
        <div className="gate-policy">
          <PolicyCard type={policy} size="lg" showSubtitle={false} />
          <div className="gate-policy__counts">
            <div className="gate-policy__count gate-policy__count--blue">
              <span>Demokratik</span>
              <strong>
                {game.enacted.democratic}
                <small>/{game.democraticWinThreshold}</small>
              </strong>
            </div>
            <div className="gate-policy__count gate-policy__count--red">
              <span>Otokrat</span>
              <strong>
                {game.enacted.fascist}
                <small>/{game.fascistTrackLength}</small>
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      <p className="gate-stage__note">
        Reform açıklandı ve ilerleme kâğıdına kondu. Özel yetkiler ve dönem
        kapanışı sırada.
      </p>
    </GateShell>
  );
}

export function TermSummaryStage({
  game,
  onAction,
  actionPending = false,
  error = null,
  canEndTerm,
  secondsLeft,
}: {
  game: PublicGameState;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
  canEndTerm: boolean;
  secondsLeft: number | null;
}) {
  const summary = game.termSummary;
  if (!summary) return null;

  const outcomeLabel =
    summary.outcome === 'legislative'
      ? 'Yasama Tamamlandı'
      : summary.outcome === 'autoPolicy'
        ? 'Otomatik Reform'
        : 'Hükümet Reddedildi';

  return (
    <GateShell
      tone={summary.outcome === 'rejected' ? 'red' : 'gold'}
      kicker={`Dönem ${summary.round} · Dönem Özeti`}
      title="Dönem Kapandı"
      lead="Oy, yasama ve özel yetkiler çözüldü. Kapanış tutanağı aşağıda."
      secondsLeft={secondsLeft}
      error={error}
      footer={
        canEndTerm ? (
          <Button
            variant="gold"
            size="lg"
            loading={actionPending}
            onClick={() => onAction({ type: 'end_term' })}
            icon={<ArrowRight size={17} />}
          >
            Dönemi Kapat
          </Button>
        ) : (
          <span className="gate-stage__wait">
            <Clock3 size={14} aria-hidden="true" />
            Başkan dönemi kapatacak; host 45 sn sonra devreye girer
          </span>
        )
      }
    >
      <span
        className={cn(
          'gate-summary__outcome',
          summary.outcome === 'rejected'
            ? 'gate-summary__outcome--red'
            : 'gate-summary__outcome--gold',
        )}
      >
        {outcomeLabel}
      </span>

      <div className="gate-summary__grid">
        <div className="gate-summary__cell">
          <span>Başkan</span>
          <strong>{playerName(game, summary.presidentId)}</strong>
        </div>
        <div className="gate-summary__cell">
          <span>Başbakan</span>
          <strong>{playerName(game, summary.chancellorId)}</strong>
        </div>
        <div className="gate-summary__cell">
          <span>Oylama</span>
          <strong
            className={cn(
              summary.voteResult === 'kabul'
                ? 'gate-summary__accept'
                : 'gate-summary__reject',
            )}
          >
            {summary.voteResult === 'kabul' ? 'Kabul' : 'Ret'}
            {summary.tally
              ? ` · ${summary.tally.yes} – ${summary.tally.no}`
              : ''}
          </strong>
        </div>
        <div className="gate-summary__cell">
          <span>Reform</span>
          <strong>
            {summary.policy
              ? summary.policy === 'otokrat'
                ? 'Otokrat Reform'
                : 'Demokratik Reform'
              : 'Yok'}
            {summary.policyAuto ? ' (otomatik)' : ''}
          </strong>
        </div>
        <div className="gate-summary__cell">
          <span>Üst üste ret</span>
          <strong>{summary.failedVotes}/3</strong>
        </div>
        <div className="gate-summary__cell">
          <span>Sıradaki Başkan</span>
          <strong>{playerName(game, summary.nextPresidentId)}</strong>
        </div>
      </div>

      {summary.policy ? (
        <div className="gate-summary__policy">
          <PolicyCard
            type={summary.policy}
            size="sm"
            showSubtitle={false}
          />
        </div>
      ) : null}

      {summary.notes.length > 0 ? (
        <ul className="gate-summary__notes">
          {summary.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </GateShell>
  );
}
