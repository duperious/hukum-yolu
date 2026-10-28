import { AlertTriangle, Check, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

/**
 * Başkanın Başbakan adayını seçtiği merkez sahne. Adaylık sırası geldiğinde
 * otomatik açılır; oyuncu kartı kapatıp karar panelinden yeniden açabilir.
 */
export function NomineeStage({
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
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open, game.round]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const eligible = useMemo(() => {
    const byId = new Map(game.players.map((player) => [player.id, player]));
    return view.eligibleChancellorIds
      .map((id) => byId.get(id))
      .filter((player): player is NonNullable<typeof player> => Boolean(player));
  }, [game.players, view.eligibleChancellorIds]);

  if (!open) return null;

  const president = game.players.find((player) => player.id === game.presidentId);
  const selectedPlayer = eligible.find((player) => player.id === selected);

  const confirm = () => {
    if (!selected || actionPending) return;
    onAction({ type: 'nominate', targetId: selected });
  };

  return (
    <div
      className="vote-stage-overlay nominee-stage-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Başbakan adaylığı"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="vote-stage nominee-stage">
        <button
          type="button"
          className="icon-btn vote-stage__close"
          onClick={onClose}
          aria-label="Adaylık kartını kapat"
        >
          <X size={18} />
        </button>

        <span className="vote-stage__kicker">
          Dönem {game.round}, başbakan adaylığı
        </span>
        <h2 className="vote-stage__title">Başbakanı sen seçiyorsun</h2>

        <div className="vote-stage__government nominee-stage__president">
          <div className="vote-stage__seat vote-stage__seat--president">
            <span className="vote-stage__avatar">
              <Avatar avatarId={president?.avatarId ?? 'avatar-1'} size="lg" />
            </span>
            <div>
              <span>Başkan</span>
              <strong>{president?.name ?? '—'}</strong>
            </div>
          </div>
          <span className="vote-stage__arrow" aria-hidden="true" />
          <div className="vote-stage__seat vote-stage__seat--chancellor">
            <span className="vote-stage__avatar nominee-stage__empty-avatar">
              {selectedPlayer ? (
                <Avatar avatarId={selectedPlayer.avatarId} size="lg" />
              ) : (
                <UserPlus size={22} />
              )}
            </span>
            <div>
              <span>Başbakan adayı</span>
              <strong>{selectedPlayer?.name ?? 'Henüz seçilmedi'}</strong>
            </div>
          </div>
        </div>

        <p className="nominee-stage__hint">
          Uygun bir oyuncuyu aday göster. Adaylık onaylandığında hükümet oylaması
          başlar; oylar gizli kalır.
        </p>

        {error ? (
          <div className="vote-stage__error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        {eligible.length > 0 ? (
          <div className="nominee-stage__list" role="listbox" aria-label="Adaylar">
            {eligible.map((player) => {
              const isSelected = selected === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'nominee-card',
                    isSelected && 'nominee-card--selected',
                  )}
                  onClick={() => setSelected(player.id)}
                  disabled={actionPending}
                >
                  <Avatar avatarId={player.avatarId} size="md" />
                  <span className="nominee-card__name">{player.name}</span>
                  {player.id === game.previousChancellorId ? (
                    <span className="nominee-card__tag">Önceki PM</span>
                  ) : null}
                  <span className="nominee-card__check" aria-hidden="true">
                    {isSelected ? <Check size={16} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted nominee-stage__empty">Uygun aday bulunamadı.</p>
        )}

        <div className="nominee-stage__actions">
          <span className="nominee-stage__selection">
            {selectedPlayer ? `Aday: ${selectedPlayer.name}` : 'Bir aday seç.'}
          </span>
          <Button
            variant="primary"
            size="lg"
            onClick={confirm}
            disabled={!selected || actionPending}
            loading={actionPending}
            icon={<UserPlus size={17} />}
          >
            Aday Göster
          </Button>
        </div>
      </div>
    </div>
  );
}
