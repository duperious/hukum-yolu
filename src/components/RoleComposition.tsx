import { ROLE_INFO, ROLE_ORDER, getRoleCounts } from '../game';
import { cn } from '../lib/cn';

export function RoleComposition({
  totalPlayers,
  compact = false,
  className,
}: {
  totalPlayers: number;
  compact?: boolean;
  className?: string;
}) {
  if (totalPlayers < 5 || totalPlayers > 10) {
    return (
      <p className={cn('muted', className)}>
        Rol dağılımı için 5-10 oyuncu gerekir. Şu an {totalPlayers} oyuncu var.
      </p>
    );
  }

  const counts = getRoleCounts(totalPlayers);
  const roles = ROLE_ORDER.filter((role) => counts[role] > 0);

  return (
    <div className={cn('role-composition', compact && 'role-composition--compact', className)}>
      {roles.map((role) => {
        const info = ROLE_INFO[role];
        return (
          <span key={role} className={`role-chip role-chip--${info.accent}`}>
            <strong>{counts[role]}×</strong>
            <span>{info.name}</span>
          </span>
        );
      })}
    </div>
  );
}
