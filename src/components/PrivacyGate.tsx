import { EyeOff, Lock, X } from 'lucide-react';
import { useEffect } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
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
      </div>
    </div>,
    document.body,
  );
}
