import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '../../hooks/useMultiplayerRoom';
import { cn } from '../../lib/cn';

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Bağlanıyor',
  live: 'Canlı',
  polling: 'Yoklama',
  offline: 'Çevrimdışı',
};

export function ConnectionPill({
  connection,
  className,
}: {
  connection: ConnectionState;
  className?: string;
}) {
  const Icon =
    connection === 'live'
      ? Wifi
      : connection === 'polling'
        ? RefreshCw
        : connection === 'offline'
          ? WifiOff
          : Loader2;
  return (
    <span
      className={cn('connection-pill', `connection-pill--${connection}`, className)}
      title={
        connection === 'live'
          ? 'Canlı güncellemeler açık'
          : connection === 'polling'
            ? 'Oda düzenli aralıklarla yoklanıyor'
            : connection === 'offline'
              ? 'Sunucuya ulaşılamıyor; yeniden denenecek'
              : 'Sunucuya bağlanılıyor'
      }
    >
      <Icon size={13} className={connection === 'connecting' ? 'spin' : undefined} />
      <span>{LABELS[connection]}</span>
    </span>
  );
}
