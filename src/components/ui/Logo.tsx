import { Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';

export function Logo({
  compact = false,
  className,
  linked = true,
}: {
  compact?: boolean;
  className?: string;
  linked?: boolean;
}) {
  const content = (
    <span className={cn('brand', compact && 'brand--compact', className)}>
      <span className="brand__mark" aria-hidden="true">
        <Scale size={compact ? 18 : 24} strokeWidth={1.7} />
      </span>
      <span className="brand__text">
        <span className="brand__title">HÜKÜM YOLU</span>
        {!compact ? (
          <span className="brand__tagline">Gizli roller · Tek hüküm</span>
        ) : null}
      </span>
    </span>
  );

  if (!linked) return content;
  return (
    <Link to="/" className="brand-link" aria-label="Hüküm Yolu ana sayfa">
      {content}
    </Link>
  );
}
