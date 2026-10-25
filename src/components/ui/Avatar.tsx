import { getAvatar } from '../../config/avatars';
import { cn } from '../../lib/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const ICON_SIZE: Record<AvatarSize, number> = {
  xs: 16,
  sm: 20,
  md: 28,
  lg: 38,
  xl: 52,
};

export interface AvatarProps {
  avatarId: string;
  size?: AvatarSize;
  ring?: 'gold' | 'blue' | 'red' | 'violet' | 'none';
  dimmed?: boolean;
  className?: string;
  title?: string;
}

export function Avatar({
  avatarId,
  size = 'md',
  ring = 'none',
  dimmed = false,
  className,
  title,
}: AvatarProps) {
  const avatar = getAvatar(avatarId);
  const Icon = avatar.icon;
  return (
    <span
      className={cn(
        'avatar',
        `avatar--${size}`,
        ring !== 'none' && `avatar--ring-${ring}`,
        dimmed && 'avatar--dimmed',
        className,
      )}
      style={{ background: avatar.gradient, color: avatar.tint }}
      title={title ?? avatar.label}
      aria-hidden={title ? undefined : true}
    >
      <Icon size={ICON_SIZE[size]} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}
