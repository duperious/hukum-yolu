import {
  Bot,
  Crown,
  Gavel,
  Info,
  RefreshCw,
  ScrollText,
  Skull,
  Vote,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { LogEntry, LogKind } from '../game';
import { cn } from '../lib/cn';

export const LOG_ICONS: Record<LogKind, LucideIcon> = {
  system: Info,
  government: Gavel,
  vote: Vote,
  policy: ScrollText,
  power: Zap,
  death: Skull,
  transition: RefreshCw,
  bot: Bot,
  win: Crown,
};

export function GameLog({
  entries,
  className,
}: {
  entries: LogEntry[];
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries.length]);

  return (
    <section className={cn('game-log panel', className)}>
      <header className="panel__header">
        <div>
          <p className="eyebrow">Herkese açık</p>
          <h3 className="panel__title">Oyun Günlüğü</h3>
        </div>
        <span className="chip">{entries.length} kayıt</span>
      </header>

      <div className="game-log__scroll" ref={scrollRef} role="log" aria-live="polite">
        {entries.length === 0 ? (
          <p className="muted">Henüz kayıt yok. İlk hamleyle birlikte burası dolacak.</p>
        ) : (
          entries.map((entry) => {
            const Icon = LOG_ICONS[entry.kind] ?? Info;
            return (
              <div key={entry.id} className={`log-entry log-entry--${entry.kind}`}>
                <span className="log-entry__icon" aria-hidden="true">
                  <Icon size={14} />
                </span>
                <span className="log-entry__round">T{entry.round || 0}</span>
                <p className="log-entry__text">{entry.text}</p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
