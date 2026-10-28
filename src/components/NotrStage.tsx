import { AlertTriangle, Scale, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import cumhuriyetYolu from '../assets/vote/cumhuriyet-yolu.jpg';
import imparatorlukYolu from '../assets/vote/imparatorluk-yolu.jpg';
import type { GameAction, NotrSide, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Button } from './ui/Button';

/**
 * Nötr'ün (Kararsız) demokrat/otokrat taraf seçimini ekranın ortasında
 * iki yol kartıyla sunar. Sıra geldiğinde otomatik açılır; oyuncu kartı
 * kapatıp karar panelinden yeniden açabilir.
 */
export function NotrStage({
  game,
  view,
  onAction,
  actionPending = false,
  error = null,
  open,
  onClose,
}: {
  game: PublicGameState;
  view: PrivateView;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<NotrSide | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setSelected(null);
    setSending(false);
  }, [open, game.round]);

  useEffect(() => {
    if (error || !view.canChooseNotrSide) setSending(false);
  }, [error, view.canChooseNotrSide]);

  useEffect(() => {
    if (!sending) return;
    const timer = window.setTimeout(() => setSending(false), 8000);
    return () => window.clearTimeout(timer);
  }, [sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !view.canChooseNotrSide) return null;

  const submit = () => {
    if (!selected || actionPending || sending) return;
    setSending(true);
    onAction({ type: 'choose_notr_side', side: selected });
  };

  return (
    <div
      className="vote-stage-overlay notr-stage-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Nötr taraf seçimi"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="vote-stage notr-stage">
        <button
          type="button"
          className="icon-btn vote-stage__close"
          onClick={onClose}
          aria-label="Taraf seçimini kapat"
        >
          <X size={18} />
        </button>

        <span className="vote-stage__kicker">
          İlk üç reform çözüldü · Nötr’ün seçimi
        </span>
        <h2 className="vote-stage__title">Hangi yolu seçiyorsun?</h2>
        <p className="notr-stage__lead">
          Bu seçim gizlidir. Cumhuriyet Yolu’nda Demokratlarla, İmparatorluk
          Yolu’nda Otokratlarla oynarsın. Kırmızı tarafta normal Otokrat zaferi
          otomatik kazanmaz; kendi zaferini kovalamalısın.
        </p>

        {error ? (
          <div className="vote-stage__error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="notr-stage__choices">
          <button
            type="button"
            className={cn(
              'notr-stage__choice notr-stage__choice--mavi',
              selected === 'mavi' && 'notr-stage__choice--selected',
            )}
            onClick={() => setSelected('mavi')}
            disabled={actionPending || sending}
            aria-pressed={selected === 'mavi'}
            aria-label="Cumhuriyet Yolu — Demokratlarla kazan"
          >
            <img
              className="notr-stage__art"
              src={cumhuriyetYolu}
              alt=""
              draggable={false}
            />
            {selected === 'mavi' ? (
              <span className="notr-stage__picked">Seçildi</span>
            ) : null}
          </button>

          <button
            type="button"
            className={cn(
              'notr-stage__choice notr-stage__choice--kirmizi',
              selected === 'kirmizi' && 'notr-stage__choice--selected',
            )}
            onClick={() => setSelected('kirmizi')}
            disabled={actionPending || sending}
            aria-pressed={selected === 'kirmizi'}
            aria-label="İmparatorluk Yolu — Otokratları destekle, kişisel zafer peşinde koş"
          >
            <img
              className="notr-stage__art"
              src={imparatorlukYolu}
              alt=""
              draggable={false}
            />
            {selected === 'kirmizi' ? (
              <span className="notr-stage__picked">Seçildi</span>
            ) : null}
          </button>
        </div>

        <div className="vote-stage__confirm">
          <span className="vote-stage__confirm-hint">
            {selected === null
              ? 'Önce bir yol seç.'
              : selected === 'mavi'
                ? 'Yol: Cumhuriyet · Demokratlarla kazan'
                : 'Yol: İmparatorluk · Otokratları destekle'}
          </span>
          <Button
            variant={selected === 'kirmizi' ? 'danger' : 'gold'}
            size="lg"
            onClick={submit}
            disabled={!selected || actionPending || sending}
            loading={sending}
            icon={
              selected === 'kirmizi' ? (
                <ShieldCheck size={17} />
              ) : (
                <Scale size={17} />
              )
            }
          >
            Yolumu Seç
          </Button>
        </div>

        <p className="vote-stage__note">
          <Scale size={12} aria-hidden="true" /> Seçimin gizli kalır; yalnızca
          açıklandığında tarafın görünür.
        </p>
      </div>
    </div>
  );
}
