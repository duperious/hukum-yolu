import { Scale, Swords } from 'lucide-react';
import type { PolicyCard as PolicyCardType } from '../game';
import { cn } from '../lib/cn';

const DEFAULT_FASCIST_LABELS = [
  'Özel yetki yok',
  'Soruşturma',
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
  const Icon = type === 'demokratik' ? Scale : Swords;
  const resolvedLabels =
    labels ??
    (type === 'demokratik'
      ? DEFAULT_DEMOCRATIC_LABELS.slice(0, length)
      : DEFAULT_FASCIST_LABELS.slice(0, length));
  const title = type === 'demokratik' ? 'Demokratik Reformlar' : 'Otokrat Reformlar';
  const kicker = type === 'demokratik' ? 'Mavi hat' : 'Kızıl hat';
  const safeEnacted = Math.max(0, Math.min(enacted, length));

  return (
    <section className={cn('policy-track', `policy-track--${type}`, className)}>
      <Icon className="policy-track__watermark" size={180} strokeWidth={0.7} aria-hidden="true" />

      <header className="policy-track__header">
        <div className="policy-track__title">
          <span className="policy-track__icon" aria-hidden="true">
            <Icon size={19} strokeWidth={1.8} />
          </span>
          <div>
            <span className="policy-track__kicker">{kicker}</span>
            <h3>{title}</h3>
          </div>
        </div>
        <span className="policy-track__count">
          <strong key={safeEnacted}>{safeEnacted}</strong>
          <span>/ {length}</span>
        </span>
      </header>

      <div
        className="policy-track__steps"
        role="list"
        aria-label={`${title}: ${safeEnacted} / ${length}`}
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
              <span className="policy-step__num">{index + 1}</span>
              <span className="policy-step__label">{resolvedLabels[index]}</span>
            </div>
          );
        })}
      </div>

      <p className="policy-track__hint">
        {type === 'demokratik'
          ? `${length}. reform Demokratik zaferi getirir.`
          : `${length}. reform Otokrat zaferi getirir. 4. reformdan sonra Lider Başbakan seçilirse Otokratlar kazanır.`}
      </p>
    </section>
  );
}
