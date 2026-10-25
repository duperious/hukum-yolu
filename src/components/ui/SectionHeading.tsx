import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('section-heading', `section-heading--${align}`, className)}>
      <div className="section-heading__main">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="section-heading__title">{title}</h2>
        {description ? (
          <p className="section-heading__description">{description}</p>
        ) : null}
      </div>
      {action ? <div className="section-heading__action">{action}</div> : null}
    </div>
  );
}
