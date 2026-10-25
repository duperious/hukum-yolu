import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({
  size = 20,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span className={cn('spinner', className)} role="status">
      <Loader2 className="spin" size={size} aria-hidden="true" />
      <span className="sr-only">{label ?? 'Yükleniyor'}</span>
    </span>
  );
}
