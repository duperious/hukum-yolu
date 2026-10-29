import { AlertTriangle, Eye, ShieldCheck } from 'lucide-react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PolicyCard } from './PolicyCard';

/**
 * Başkanın destenin üstündeki üç kartı incelediği aşamayı ekranın ortasında
 * gösterir. Sıra geldiğinde otomatik açılır; kartlar kapatıldığında aynı
 * sırayla desteye geri konur. Bu bilgi yalnızca Başkana gösterilir.
 */
export function PeekStage({
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
  const cards = view.pendingPeekCards ?? [];
  const president = game.players.find((player) => player.id === game.presidentId);

  if (!open || game.phase !== 'peek' || cards.length === 0) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kart İnceleme"
      eyebrow="Başkanlık Yetkisi"
      subtitle={`${president?.name ?? 'Başkan'} olarak destenin üstündeki üç kartı inceliyorsun. Kartlar aynı sırayla desteye geri konacak; bu bilgi yalnızca sana gösterilir.`}
      size="lg"
      overlayClassName="peek-stage-overlay"
      className="peek-stage"
      footer={
        <div className="modal-actions peek-stage__actions">
          <span className="peek-stage__hint">
            <ShieldCheck size={13} aria-hidden="true" />
            Bu bilgi gizli kalır
          </span>
          <Button
            variant="primary"
            size="lg"
            onClick={() => onAction({ type: 'ack_peek' })}
            loading={actionPending}
            icon={<Eye size={16} />}
          >
            Kartları Desteye Geri Koy
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="form-alert form-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="peek-stage__notice">
        <Eye size={16} aria-hidden="true" />
        <p>
          Kartları soldan sağa doğru incele. Onayladığında üç kart da aynı
          sırayla destenin üstüne geri döner.
        </p>
      </div>

      <div className="policy-choice-grid policy-choice-grid--peek peek-stage__cards">
        {cards.map((card, index) => (
          <div
            key={`${game.round}-${game.phase}-${card}-${index}`}
            className="peek-card-wrap"
          >
            <span className="peek-card-wrap__order">{index + 1}. kart</span>
            <PolicyCard type={card} showSubtitle={false} />
          </div>
        ))}
      </div>
    </Modal>
  );
}
