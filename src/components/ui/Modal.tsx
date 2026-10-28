import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  hideClose?: boolean;
  closeOnOverlay?: boolean;
  className?: string;
  overlayClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  size = 'md',
  hideClose = false,
  closeOnOverlay = true,
  className,
  overlayClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn('modal-overlay', overlayClassName)}
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cn('modal', `modal--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {(title || eyebrow || !hideClose) && (
          <div className="modal__header">
            <div>
              {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
              {title ? (
                <h2 id={titleId} className="modal__title">
                  {title}
                </h2>
              ) : null}
              {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
            </div>
            {!hideClose ? (
              <button
                type="button"
                className="icon-btn modal__close"
                onClick={onClose}
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            ) : null}
          </div>
        )}
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
