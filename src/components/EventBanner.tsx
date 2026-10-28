import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '../game';
import { cn } from '../lib/cn';
import { LOG_ICONS } from './GameLog';

const HIDE_MS = 3600;

/**
 * Oyun günlüğündeki yeni kayıtları ekranın üstünde kısa bir animasyonlu
 * bant olarak duyurur. Sayfa ilk açıldığında mevcut kayıtları sessizce
 * "görülmüş" sayar; yalnızca canlı oyunda gelen yeni olayları gösterir.
 */
export function EventBanner({ entries }: { entries: LogEntry[] }) {
  const [event, setEvent] = useState<LogEntry | null>(null);
  const seenRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const last = entries[entries.length - 1];
    if (!last) return;
    if (seenRef.current === null) {
      seenRef.current = last.id;
      return;
    }
    if (seenRef.current === last.id) return;
    seenRef.current = last.id;
    setEvent(last);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setEvent(null), HIDE_MS);
  }, [entries]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const Icon = event ? LOG_ICONS[event.kind] : null;

  return (
    <div className="event-banner-region" aria-live="polite">
      {event && Icon ? (
        <div
          key={event.id}
          className={cn('event-banner', `event-banner--${event.kind}`)}
          role="status"
        >
          <span className="event-banner__icon" aria-hidden="true">
            <Icon size={17} />
          </span>
          <div className="event-banner__body">
            <span className="event-banner__round">Dönem {event.round}</span>
            <p>{event.text}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
