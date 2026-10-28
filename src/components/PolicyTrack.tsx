import { Crown, Landmark, Scale, Swords } from 'lucide-react';
import type { PolicyCard as PolicyCardType } from '../game';
import { cn } from '../lib/cn';

const DEFAULT_FASCIST_LABELS = [
  'Özel yetki yok',
  'Özel yetki yok',
  '3. reform yetkisi',
  'Lider PM ise zafer',
  'Suikast',
  'Suikast',
  'Otokrat zaferi',
];

const DEFAULT_DEMOCRATIC_LABELS = [
  '1. reform',
  '2. reform',
  '3. reform',
  '4. reform',
  '5. reform',
  'Demokratik zafer',
];

const TRACK_META = {
  demokratik: {
    title: 'Demokratik Reformlar',
    kicker: 'Mavi Hat · Reform Tutanağı',
    crest: Scale,
    emblem: Landmark,
  },
  otokrat: {
    title: 'Otokrat Reformlar',
    kicker: 'Kızıl Hat · Reform Tutanağı',
    crest: Swords,
    emblem: Crown,
  },
} as const;

function LaurelBranch({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      className={cn('policy-track__laurel', flipped && 'policy-track__laurel--flipped')}
      viewBox="0 0 22 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M17 46C8 37 5 26 8 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        <ellipse cx="8" cy="6" rx="2" ry="4.2" transform="rotate(-28 8 6)" />
        <ellipse cx="4.5" cy="12" rx="2" ry="4.2" transform="rotate(-52 4.5 12)" />
        <ellipse cx="11.5" cy="13" rx="2" ry="4.2" transform="rotate(22 11.5 13)" />
        <ellipse cx="4" cy="20" rx="2" ry="4.4" transform="rotate(-58 4 20)" />
        <ellipse cx="11" cy="21" rx="2" ry="4.4" transform="rotate(30 11 21)" />
        <ellipse cx="5.5" cy="29" rx="2" ry="4.4" transform="rotate(-40 5.5 29)" />
        <ellipse cx="12" cy="29.5" rx="2" ry="4.4" transform="rotate(40 12 29.5)" />
        <ellipse cx="8" cy="37" rx="2" ry="4.2" transform="rotate(-22 8 37)" />
        <ellipse cx="14" cy="37.5" rx="2" ry="4.2" transform="rotate(54 14 37.5)" />
      </g>
    </svg>
  );
}

export function PolicyTrack({
  type,
  enacted,
  length,
  labels,
  className,
}: {
  type: PolicyCardType;
  enacted: number;
  length: number;
  labels?: string[];
  className?: string;
}) {
  const meta = TRACK_META[type];
  const CrestIcon = meta.crest;
  const EmblemIcon = meta.emblem;
  const resolvedLabels =
    labels ??
    (type === 'demokratik'
      ? DEFAULT_DEMOCRATIC_LABELS.slice(0, length)
      : DEFAULT_FASCIST_LABELS.slice(0, length));
  const safeEnacted = Math.max(0, Math.min(enacted, length));

  return (
    <section className={cn('policy-track', `policy-track--${type}`, className)}>
      <div className="policy-track__inner">
        <header className="policy-track__header">
          <span className="policy-track__crest" aria-hidden="true">
            <CrestIcon size={22} strokeWidth={1.7} />
          </span>

          <div className="policy-track__title">
            <span className="policy-track__kicker">{meta.kicker}</span>
            <h3>{meta.title}</h3>
          </div>

          <span className="policy-track__emblem" aria-hidden="true">
            <EmblemIcon size={62} strokeWidth={0.9} />
          </span>

          <span className="policy-track__count" aria-hidden="true">
            <strong key={safeEnacted}>{String(safeEnacted).padStart(2, '0')}</strong>
            <span>/ {String(length).padStart(2, '0')}</span>
          </span>
        </header>

        <div
          className="policy-track__steps"
          role="list"
          aria-label={`${meta.title}: ${safeEnacted} / ${length}`}
        >
          {Array.from({ length }, (_, index) => {
            const filled = index < safeEnacted;
            const current = index === safeEnacted;
            const just = index === safeEnacted - 1;
            const win = index === length - 1;
            return (
              <div
                key={index}
                role="listitem"
                className={cn(
                  'policy-step',
                  filled && 'policy-step--filled',
                  current && 'policy-step--current',
                  just && 'policy-step--just',
                  win && 'policy-step--win',
                )}
                title={resolvedLabels[index]}
              >
                <span className="policy-step__num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="policy-step__label">{resolvedLabels[index]}</span>
                <span className="policy-step__mark" aria-hidden="true">
                  {filled ? '✓' : current ? '•' : ''}
                </span>
              </div>
            );
          })}
        </div>

        <footer className="policy-track__footer">
          <LaurelBranch />
          <p className="policy-track__hint">
            {type === 'demokratik'
              ? `${length}. reform Demokratik zaferi getirir.`
              : `${length}. reform Otokrat zaferi getirir. 4. reformdan sonra Lider Başbakan seçilirse Otokratlar kazanır.`}
          </p>
          <LaurelBranch flipped />
        </footer>
      </div>
    </section>
  );
}
