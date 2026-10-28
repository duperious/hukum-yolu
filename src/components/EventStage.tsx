import {
  Check,
  CheckCircle2,
  Crown,
  Eye,
  Gavel,
  Info,
  Layers,
  RefreshCw,
  Scale,
  ScrollText,
  ShieldCheck,
  Skull,
  Trash2,
  UserPlus,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { LogEntry, LogKind, PolicyCard as PolicyCardType } from '../game';
import { cn } from '../lib/cn';
import { PolicyCard } from './PolicyCard';

type EventTone = 'gold' | 'blue' | 'red' | 'violet';
type EventVisual = 'icon' | 'cards3' | 'cards2' | 'policy' | 'vote-yes' | 'vote-no';

interface StageInfo {
  title: string;
  kicker: string;
  tone: EventTone;
  Icon: LucideIcon;
  visual: EventVisual;
  policy?: PolicyCardType;
}

const KICKERS: Record<LogKind, string> = {
  system: 'Dönem',
  government: 'Hükümet',
  vote: 'Oylama',
  policy: 'Reform',
  power: 'Özel Yetki',
  death: 'Suikast',
  transition: 'Dönüm',
  bot: 'Bot',
  win: 'Sonuç',
};

function describeEvent(entry: LogEntry): StageInfo {
  const text = entry.text;

  switch (entry.kind) {
    case 'vote':
      if (text.includes('kabul edildi')) {
        return {
          title: 'Hükümet Kuruldu',
          kicker: KICKERS.vote,
          tone: 'gold',
          Icon: CheckCircle2,
          visual: 'vote-yes',
        };
      }
      if (text.includes('reddedildi')) {
        return {
          title: 'Hükümet Reddedildi',
          kicker: KICKERS.vote,
          tone: 'red',
          Icon: XCircle,
          visual: 'vote-no',
        };
      }
      return {
        title: 'Ret Sayacı Arttı',
        kicker: KICKERS.vote,
        tone: 'red',
        Icon: RefreshCw,
        visual: 'icon',
      };

    case 'government':
      if (text.includes('Başbakan adayı gösterdi')) {
        return {
          title: 'Başbakan Adayı Belirlendi',
          kicker: KICKERS.government,
          tone: 'blue',
          Icon: UserPlus,
          visual: 'icon',
        };
      }
      if (text.includes('üç reform kartı çekti')) {
        return {
          title: 'Başkan 3 Kart Çekti',
          kicker: KICKERS.government,
          tone: 'gold',
          Icon: Layers,
          visual: 'cards3',
        };
      }
      if (text.includes('bir reform kartını eledi')) {
        return {
          title: 'Başkan 1 Kart Eledi',
          kicker: KICKERS.government,
          tone: 'gold',
          Icon: Trash2,
          visual: 'cards2',
        };
      }
      if (text.includes('değerlendiriyor')) {
        return {
          title: 'Başbakan 2 Kartı Değerlendiriyor',
          kicker: KICKERS.government,
          tone: 'blue',
          Icon: ScrollText,
          visual: 'cards2',
        };
      }
      return {
        title: 'Hükümet Hamlesi',
        kicker: KICKERS.government,
        tone: 'gold',
        Icon: Gavel,
        visual: 'icon',
      };

    case 'policy': {
      const isOtokrat = text.includes('Otokrat Reform');
      return {
        title: isOtokrat ? 'Otokrat Reform Yürürlükte' : 'Demokratik Reform Yürürlükte',
        kicker: KICKERS.policy,
        tone: isOtokrat ? 'red' : 'blue',
        Icon: ScrollText,
        visual: 'policy',
        policy: isOtokrat ? 'otokrat' : 'demokratik',
      };
    }

    case 'power':
      if (text.includes('Suikast') || text.includes('suikast')) {
        return {
          title: 'Suikast',
          kicker: KICKERS.power,
          tone: 'red',
          Icon: Skull,
          visual: 'icon',
        };
      }
      if (text.includes('sorguya çekti')) {
        return {
          title: 'Soruşturma',
          kicker: KICKERS.power,
          tone: 'violet',
          Icon: Eye,
          visual: 'icon',
        };
      }
      if (text.includes('engelledi') || text.includes('engelleme')) {
        return {
          title: 'Oy Engelleme',
          kicker: KICKERS.power,
          tone: 'violet',
          Icon: ShieldCheck,
          visual: 'icon',
        };
      }
      if (text.includes('incele')) {
        return {
          title: 'Kart İnceleme',
          kicker: KICKERS.power,
          tone: 'gold',
          Icon: Eye,
          visual: 'icon',
        };
      }
      return {
        title: 'Özel Yetki',
        kicker: KICKERS.power,
        tone: 'violet',
        Icon: Zap,
        visual: 'icon',
      };

    case 'transition':
      if (text.includes('Monarşi')) {
        return {
          title: 'Monarşi Sona Erdi',
          kicker: KICKERS.transition,
          tone: 'gold',
          Icon: Crown,
          visual: 'icon',
        };
      }
      if (text.includes('Nötr') && text.includes('seçti')) {
        return {
          title: 'Nötr Tarafını Seçti',
          kicker: KICKERS.transition,
          tone: 'violet',
          Icon: Scale,
          visual: 'icon',
        };
      }
      return {
        title: 'Yeni Dönem',
        kicker: KICKERS.transition,
        tone: 'gold',
        Icon: RefreshCw,
        visual: 'icon',
      };

    case 'death':
      return {
        title: 'Suikast Sonucu',
        kicker: KICKERS.death,
        tone: 'red',
        Icon: Skull,
        visual: 'icon',
      };

    case 'win':
      return {
        title: 'Oyun Bitti',
        kicker: KICKERS.win,
        tone: 'gold',
        Icon: Crown,
        visual: 'icon',
      };

    case 'system':
      return {
        title: text.includes('başladı') ? `Dönem ${entry.round} Başladı` : 'Oyun Notu',
        kicker: KICKERS.system,
        tone: 'gold',
        Icon: Info,
        visual: 'icon',
      };

    default:
      return {
        title: 'Olay',
        kicker: KICKERS[entry.kind] ?? 'Olay',
        tone: 'gold',
        Icon: Info,
        visual: 'icon',
      };
  }
}

function isCenterEvent(entry: LogEntry): boolean {
  if (entry.kind === 'bot') return false;
  if (entry.kind === 'system') {
    return entry.text.includes('başladı') || entry.text.includes('kısıtı gevşetildi');
  }
  return true;
}

const CARD_OFFSETS = {
  2: [-11, 11],
  3: [-21, 0, 21],
} as const;

const CARD_ROTATIONS = {
  2: [-6, 6],
  3: [-9, 0, 9],
} as const;

function EventVisual({ info }: { info: StageInfo }) {
  if (info.visual === 'cards3' || info.visual === 'cards2') {
    const count = info.visual === 'cards3' ? 3 : 2;
    const offsets = CARD_OFFSETS[count];
    const rotations = CARD_ROTATIONS[count];
    return (
      <div className="event-stage__stack" aria-hidden="true">
        {offsets.map((offset, index) => (
          <span
            key={`${info.visual}-${offset}`}
            className="event-stage__card-back"
            style={
              {
                '--x': `${offset}px`,
                '--r': `${rotations[index]}deg`,
                '--d': `${index * 90}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );
  }

  if (info.visual === 'policy' && info.policy) {
    return (
      <PolicyCard
        type={info.policy}
        size="sm"
        showSubtitle={false}
        className="event-stage__policy"
      />
    );
  }

  const Icon = info.visual === 'vote-yes' ? Check : info.visual === 'vote-no' ? XCircle : info.Icon;
  return (
    <span
      className={cn(
        'event-stage__seal',
        info.visual === 'vote-yes' && 'event-stage__seal--yes',
        info.visual === 'vote-no' && 'event-stage__seal--no',
      )}
      aria-hidden="true"
    >
      <Icon size={info.visual === 'vote-yes' || info.visual === 'vote-no' ? 34 : 30} />
    </span>
  );
}

/**
 * Önemli oyun olaylarını ekranın ortasında sırayla, animasyonlu bir kart
 * olarak gösterir. Botlar hamlelerini tek seferde bitirse bile kayıtlar
 * kuyruğa alınır; oyuncu olayları tek tek takip edebilir.
 */
const EVENT_FRESH_MS = 15_000;

export function EventStage({
  entries,
  gameKey,
  round,
  paused = false,
}: {
  entries: LogEntry[];
  gameKey: string;
  round: number;
  paused?: boolean;
}) {
  const [current, setCurrent] = useState<LogEntry | null>(null);
  const [queue, setQueue] = useState<LogEntry[]>([]);
  const [leaving, setLeaving] = useState(false);
  const seenRef = useRef<string | null>(null);
  const gameKeyRef = useRef(gameKey);
  const queueRef = useRef<LogEntry[]>([]);
  const skipAllRef = useRef(false);
  const skipUntilRef = useRef(0);
  const pausedRef = useRef(paused);
  const roundRef = useRef(round);
  // Modal açıkken biriken olayların yalnızca en yenisi, kapatınca ve hâlâ
  // güncelse gösterilir. Böylece eski dönem bildirimleri sonradan ekrana düşmez.
  const pendingRef = useRef<LogEntry | null>(null);

  useEffect(() => {
    if (gameKeyRef.current === gameKey) return;
    gameKeyRef.current = gameKey;
    seenRef.current = null;
    skipAllRef.current = false;
    skipUntilRef.current = 0;
    pendingRef.current = null;
    setCurrent(null);
    setQueue([]);
    setLeaving(false);
  }, [gameKey]);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      pendingRef.current = null;
      setCurrent(null);
      setQueue([]);
      setLeaving(false);
      return;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (
      pending &&
      pending.round >= roundRef.current &&
      Date.now() - pending.at < EVENT_FRESH_MS
    ) {
      setLeaving(false);
      setCurrent(pending);
    }
  }, [paused]);

  useEffect(() => {
    if (roundRef.current === round) return;
    roundRef.current = round;
    pendingRef.current = null;
    setCurrent((previous) => (previous && previous.round < round ? null : previous));
    setQueue((previous) => previous.filter((entry) => entry.round >= round));
  }, [round]);

  useEffect(() => {
    const last = entries[entries.length - 1];
    if (!last) return;
    if (seenRef.current === null) {
      seenRef.current = last.id;
      return;
    }
    if (seenRef.current === last.id) return;
    const seenIndex = entries.findIndex((entry) => entry.id === seenRef.current);
    seenRef.current = last.id;
    if (seenIndex < 0) return;
    const fresh = entries
      .slice(seenIndex + 1)
      .filter(isCenterEvent)
      .filter((entry) => entry.round >= roundRef.current)
      .filter((entry) => entry.at > skipUntilRef.current);
    if (fresh.length === 0) return;
    skipAllRef.current = false;
    if (pausedRef.current) {
      pendingRef.current = fresh[fresh.length - 1];
      return;
    }
    setQueue((previous) => [...previous, ...fresh].slice(-20));
  }, [entries]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (paused || skipAllRef.current || current || queue.length === 0) return;
    setLeaving(false);
    setCurrent(queue[0]);
    setQueue((previous) => previous.slice(1));
  }, [paused, current, queue]);

  useEffect(() => {
    if (!current || paused) return;
    setLeaving(false);
    const pending = queueRef.current.length;
    const readingTime = Math.min(4400, 2400 + current.text.length * 16);
    const duration = pending > 2 ? Math.min(3200, readingTime - 700) : readingTime;
    const outAt = Math.max(duration - 260, 900);
    const outTimer = window.setTimeout(() => setLeaving(true), outAt);
    const doneTimer = window.setTimeout(() => {
      setCurrent(null);
      setLeaving(false);
    }, duration);
    return () => {
      window.clearTimeout(outTimer);
      window.clearTimeout(doneTimer);
    };
  }, [current, paused]);

  const skipAll = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    skipAllRef.current = true;
    skipUntilRef.current = Date.now() + 50;
    pendingRef.current = null;
    const last = entries[entries.length - 1];
    if (last) seenRef.current = last.id;
    setCurrent(null);
    setQueue([]);
  };

  if (!current || paused) return null;

  const info = describeEvent(current);

  return createPortal(
    <div
      className="event-stage"
      aria-live="polite"
      aria-atomic="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) setCurrent(null);
      }}
    >
      <div
        key={current.id}
        className={cn(
          'event-stage__card',
          `event-stage__card--${info.tone}`,
          leaving && 'event-stage__card--leaving',
        )}
        role="status"
        onClick={() => setCurrent(null)}
        title="Kapatmak için tıkla"
      >
        <div className="event-stage__visual">
          <EventVisual info={info} />
        </div>
        <div className="event-stage__body">
          <span className="event-stage__kicker">
            Dönem {current.round || 1}, {info.kicker}
          </span>
          <h2 className="event-stage__title">{info.title}</h2>
          <p className="event-stage__text">{current.text}</p>
          <div className="event-stage__meta">
            {queue.length > 0 ? (
              <>
                <span className="event-stage__queue">{queue.length} olay sırada</span>
                <button type="button" className="event-stage__skip" onClick={skipAll}>
                  Tümünü geç
                </button>
              </>
            ) : null}
            <span className="event-stage__hint">Karta tıkla, geç</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
