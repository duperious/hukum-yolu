import { Eye, EyeOff, Lock, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PrivateView, PublicPlayer, Role } from '../game';
import { RoleCard } from './RoleCard';
import { Button } from './ui/Button';

export function PrivacyGate({
  open,
  role,
  view,
  players,
  mode,
  acknowledged,
  onClose,
  onAcknowledge,
}: {
  open: boolean;
  role: Role;
  view: PrivateView;
  players: PublicPlayer[];
  mode: 'reveal' | 'inspect';
  acknowledged: boolean;
  onClose: () => void;
  onAcknowledge?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const showButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      setRevealed(false);
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => showButtonRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div className="privacy-gate" role="dialog" aria-modal="true" aria-label="Gizli rol">
      <div className="privacy-gate__inner">
        {!revealed ? (
          <div className="privacy-gate__locked">
            <span className="privacy-gate__icon">
              <Lock size={32} />
            </span>
            <p className="eyebrow">Gizli rol</p>
            <h2>Ekranı yalnızca sen gör</h2>
            <p>
              Rol kartın bir sonraki adımda açılacak. Telefonu başkalarına gösterme,
              ekranı kimseyle paylaşma.
            </p>
            <div className="privacy-gate__actions">
              <Button
                ref={showButtonRef}
                variant="gold"
                size="lg"
                onClick={() => setRevealed(true)}
                icon={<Eye size={18} />}
              >
                Rolümü Göster
              </Button>
              <Button variant="ghost" onClick={onClose} icon={<EyeOff size={16} />}>
                Vazgeç
              </Button>
            </div>
          </div>
        ) : (
          <div className="privacy-gate__revealed">
            <div className="privacy-gate__topbar">
              <span className="privacy-gate__hint">
                <Lock size={13} /> Yalnızca senin görebileceğin kart
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label="Rol kartını kapat"
              >
                <X size={20} />
              </button>
            </div>
            <RoleCard
              role={role}
              view={view}
              players={players}
              mode={mode}
              acknowledged={acknowledged}
              onAcknowledge={
                mode === 'reveal' && onAcknowledge
                  ? () => {
                      onAcknowledge();
                      onClose();
                    }
                  : undefined
              }
            />
            {mode === 'inspect' ? (
              <Button variant="outline" fullWidth onClick={onClose} icon={<EyeOff size={16} />}>
                Kartı Kapat
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
