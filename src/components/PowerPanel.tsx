import { Ban, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

type PickerMode = 'investigate' | 'block' | null;

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
  const investigationTargets = view.investigateTargets
    .map((id) => byId.get(id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const showInvestigation =
    view.canInvestigate ||
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
    if (!picker || !selectedId) return;
    if (picker === 'investigate') {
      onAction({ type: 'investigate', targetId: selectedId });
    } else {
      onAction({ type: 'use_block', targetId: selectedId });
    }
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
              <p>Sonuç yalnızca sana gösterilir. Her tur bir kez kullanılabilir.</p>
            </div>
          </div>
          {view.canInvestigate ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPicker('investigate');
                setSelectedId(null);
              }}
              disabled={disabled}
              icon={<Eye size={15} />}
            >
              Bir oyuncuyu soruştur
            </Button>
          ) : (
            <p className="muted">
              {view.investigationUsedThisRound
                ? 'Bu tur soruştırma hakkını kullandın.'
                : 'Soruşturma yetkisi şu anda kullanılamıyor.'}
            </p>
          )}

          {investigationEntries.length > 0 ? (
            <ul className="investigation-list investigation-list--compact">
              {investigationEntries.map(([playerId, result]) => (
                <li
                  key={playerId}
                  className={`investigation-list__item investigation-list__item--${result}`}
                >
                  <span>{byId.get(playerId)?.name ?? 'Bilinmeyen oyuncu'}</span>
                  <strong>{result === 'kotu' ? 'Kötü' : 'İyi'}</strong>
                </li>
              ))}
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
                Bu tur kullanma
              </button>
            </div>
          ) : view.blockTargetId ? (
            <p className="power-note">
              Engellediğin oyuncu: <strong>{byId.get(view.blockTargetId)?.name}</strong>
            </p>
          ) : (
            <p className="muted">Oy engelleme yetkisi bu tur için kullanılamıyor.</p>
          )}
        </div>
      ) : null}

      <Modal
        open={picker !== null}
        onClose={closePicker}
        title={
          picker === 'investigate'
            ? 'Kimi soruşturacaksın?'
            : 'Kimin oyununu engelleyeceksin?'
        }
        eyebrow={picker === 'investigate' ? 'Soruşturma' : 'Oy engelleme'}
        subtitle={
          picker === 'investigate'
            ? 'Sonuç yalnızca sana gösterilir. Seçim geri alınamaz.'
            : 'Hedefin oyu bu oylamada sayılmaz. Seçim geri alınamaz.'
        }
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={closePicker}>
              Vazgeç
            </Button>
            <Button
              variant={picker === 'investigate' ? 'secondary' : 'danger'}
              onClick={confirmPicker}
              disabled={!selectedId}
            >
              {picker === 'investigate' ? 'Soruştur' : 'Engelle'}
            </Button>
          </div>
        }
      >
        <div className="target-list">
          {(picker === 'investigate' ? investigationTargets : blockTargets).map(
            (player) => (
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
                {!player.alive ? <span className="muted">Ölü</span> : null}
              </button>
            ),
          )}
        </div>
        {(picker === 'investigate' ? investigationTargets : blockTargets).length ===
        0 ? (
          <p className="muted">Uygun hedef yok.</p>
        ) : null}
      </Modal>
    </section>
  );
}
