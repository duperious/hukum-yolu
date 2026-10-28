import demokratReformArt from '../assets/policies/demokrat-reform.jpg';
import otokratReformArt from '../assets/policies/otokrat-reform.jpg';
import type { PolicyCard as PolicyCardType } from '../game';
import { cn } from '../lib/cn';

const LABELS: Record<
  PolicyCardType,
  { title: string; subtitle: string; art: string }
> = {
  demokratik: {
    title: 'Demokratik Reform',
    subtitle: 'Demokratik çizelgeyi ilerletir.',
    art: demokratReformArt,
  },
  otokrat: {
    title: 'Otokrat Reform',
    subtitle: 'Otokrat çizelgeyi ilerletir.',
    art: otokratReformArt,
  },
};

export function PolicyCard({
  type,
  size = 'md',
  selected = false,
  disabled = false,
  onClick,
  className,
  showSubtitle = true,
}: {
  type: PolicyCardType;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  showSubtitle?: boolean;
}) {
  const info = LABELS[type];
  const interactive = Boolean(onClick);
  const label = showSubtitle ? `${info.title}. ${info.subtitle}` : info.title;
  const content = (
    <>
      <img
        className="policy-card__art"
        src={info.art}
        alt=""
        draggable={false}
      />
      {selected ? <span className="policy-card__check">Seçili</span> : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={cn(
          'policy-card',
          `policy-card--${type}`,
          `policy-card--${size}`,
          selected && 'policy-card--selected',
          disabled && 'policy-card--disabled',
          className,
        )}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={selected}
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'policy-card',
        `policy-card--${type}`,
        `policy-card--${size}`,
        selected && 'policy-card--selected',
        disabled && 'policy-card--disabled',
        className,
      )}
      role="img"
      aria-label={label}
    >
      {content}
    </div>
  );
}
