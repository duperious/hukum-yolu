import { Scale, Swords } from 'lucide-react';
import type { PolicyCard as PolicyCardType } from '../game';
import { cn } from '../lib/cn';

const LABELS: Record<PolicyCardType, { title: string; subtitle: string }> = {
  demokratik: {
    title: 'Demokratik Reform',
    subtitle: 'Demokratik çizelgeyi ilerletir.',
  },
  otokrat: {
    title: 'Otokrat Reform',
    subtitle: 'Otokrat çizelgeyi ilerletir.',
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
  const Icon = type === 'demokratik' ? Scale : Swords;
  const interactive = Boolean(onClick);
  const content = (
    <>
      <span className="policy-card__icon" aria-hidden="true">
        <Icon size={size === 'lg' ? 30 : size === 'md' ? 24 : 18} strokeWidth={1.8} />
      </span>
      <span className="policy-card__text">
        <span className="policy-card__title">{info.title}</span>
        {showSubtitle ? (
          <span className="policy-card__subtitle">{info.subtitle}</span>
        ) : null}
      </span>
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
    >
      {content}
    </div>
  );
}
