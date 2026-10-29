import { Ban, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { INVESTIGATION_CARD } from './investigationMeta';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

type PickerMode = 'block' | null;

export function PowerPanel({
  view,
  game,
  onAction,
  disabled = false,
  className,
}: {
  view: PrivateView;
  game: PublicGameState;
  onAction: (action: GameAction) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [picker, setPicker] = useState<PickerMode>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const byId = new Map(game.players.map((player) => [player.id, player]));
  const investigationEntries = Object.entries(view.investigations);
  const blockTargets = game.players.filter(
    (player) => player.alive && player.id !== view.playerId,
  );

  const showInvestigation =
    view.canInvestigate ||
    view.isIntelligenceOfficeHolder ||
    view.investigationUsedThisRound ||
    investigationEntries.length > 0;
  const showBlock =
    view.canBlock || Boolean(view.blockTargetId) || view.youWereBlocked;

  if (!showInvestigation && !showBlock) return null;

  const closePicker = () => {
    setPicker(null);
    setSelectedId(null);
  };

  const confirmPicker = () => {
    if (picker !== 'block' || !selectedId) return;
    onAction({ type: 'use_block', targetId: selectedId });
    closePicker();
  };

  return (
    <section className={cn('power-panel panel', className)}>
      <header className="panel__header">
        <div>
          <p className="eyebrow">Gizli yetkiler</p>
          <h3 className="panel__title">Özel Yetkiler</h3>
        </div>
        <Sparkles size={18} className="panel__header-icon" aria-hidden="true" />
      </header>

      {view.youWereBlocked ? (
        <div className="power-alert power-alert--red">
          <Ban size={16} />
          <p>Bu oylamada oyunuz engellendi. Oy hakkınız sayılmadı.</p>
        </div>
      ) : null}

      {showInvestigation ? (
        <div className="power-block">
          <div className="power-block__header">
            <span className="power-block__icon power-block__icon--blue">
              <Eye size={17} />
            </span>
            <div>
              <h4>Soruşturma</h4>
              <p>
                İki dönemde bir zorunludur. Sonuç yalnızca sana gösterilir ve
                Demokrat/Otokrat kartıyla açıklanır.
              </p>
            </div>
          </div>
          {view.canInvestigate ? (
            <p className="power-note">
              Soruşturma ekranı açık. Bu dönem bir hedef seçmen gerekiyor.
            </p>
          ) : (
            <p className="muted">
              {view.investigationUsedThisRound
                ? `Bu dönem soruşturmanı tamamladın.${
                    view.nextInvestigationRound
                      ? ` Sonraki fırsat: ${view.nextInvestigationRound}. dönem.`
                      : ''
                  }`
                : view.isIntelligenceOfficeHolder && view.nextInvestigationRound
                  ? `Soruşturma hakkı iki dönemde bir yenilenir. Sonraki fırsat: ${view.nextInvestigationRound}. dönem.`
                  : 'Soruşturma yetkisi şu anda kullanılamıyor.'}
            </p>
          )}

          {investigationEntries.length > 0 ? (
            <ul className="investigation-list investigation-list--compact">
              {investigationEntries.map(([playerId, result]) => {
                const meta = INVESTIGATION_CARD[result];
                return (
                  <li
                    key={playerId}
                    className={`investigation-list__item investigation-list__item--${result}`}
                  >
                    <span className="investigation-list__who">
                      <img
                        className="investigation-list__thumb"
                        src={meta.image}
                        alt=""
                        width={720}
                        height={958}
                        loading="lazy"
                        decoding="async"
                      />
                      <span>{byId.get(playerId)?.name ?? 'Bilinmeyen oyuncu'}</span>
                    </span>
                    <strong>{meta.label}</strong>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showBlock ? (
        <div className="power-block">
          <div className="power-block__header">
            <span className="power-block__icon power-block__icon--red">
              <ShieldAlert size={17} />
            </span>
            <div>
              <h4>Oy Engelleme</h4>
              <p>
                Sonraki hükümet oylamasında bir oyuncunun oyunu geçersiz kılar.
                Büyük Vezir’i engellersen oy gücü kalıcı olarak 0 olur.
              </p>
            </div>
          </div>

          {view.canBlock ? (
            <div className="power-block__actions">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setPicker('block');
                  setSelectedId(null);
                }}
                disabled={disabled}
                icon={<Ban size={15} />}
              >
                Bir oyuncuyu engelle
              </Button>
              <button
                type="button"
                className="text-btn"
                onClick={() => onAction({ type: 'skip_block' })}
                disabled={disabled}
              >
                Bu dönem kullanma
              </button>
            </div>
          ) : view.blockTargetId ? (
            <p className="power-note">
              Engellediğin oyuncu: <strong>{byId.get(view.blockTargetId)?.name}</strong>
            </p>
          ) : (
            <p className="muted">Oy engelleme yetkisi bu dönem için kullanılamıyor.</p>
          )}
        </div>
      ) : null}

      <Modal
        open={picker !== null}
        onClose={closePicker}
        title="Kimin oyununu engelleyeceksin?"
        eyebrow="Oy engelleme"
        subtitle="Hedefin oyu bu oylamada sayılmaz. Seçim geri alınamaz."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={closePicker}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={confirmPicker}
              disabled={!selectedId}
            >
              Engelle
            </Button>
          </div>
        }
      >
        <div className="target-list">
          {blockTargets.map((player) => (
            <button
              key={player.id}
              type="button"
              className={cn(
                'target-option',
                selectedId === player.id && 'target-option--selected',
              )}
              onClick={() => setSelectedId(player.id)}
              aria-pressed={selectedId === player.id}
            >
              <Avatar avatarId={player.avatarId} size="sm" />
              <span>{player.name}</span>
              {!player.alive ? <span className="muted">Oyun dışı</span> : null}
            </button>
          ))}
        </div>
        {blockTargets.length === 0 ? (
          <p className="muted">Uygun hedef yok.</p>
        ) : null}
      </Modal>
    </section>
  );
}
