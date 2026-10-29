import { AlertTriangle, Check, Eye, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { INVESTIGATION_CARD } from './investigationMeta';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

/**
 * İstihbarat Başkanı'nın soruşturma hakkı olan dönemde yapmak zorunda
 * olduğu sorguyu ekranın ortasında yönetir. Soruşturma tamamlanmadan
 * kapatılamaz; sonuç "iyi/kötü" olarak değil, Demokrat/Otokrat kartıyla
 * gösterilir.
 */
export function InvestigationStage({
  view,
  game,
  onAction,
  actionPending = false,
  error = null,
}: {
  view: PrivateView;
  game: PublicGameState;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Yeni dönemde ya da yeni oyunda seçim ve sonuç durumunu sıfırla.
  useEffect(() => {
    setSelectedId(null);
    setTargetId(null);
    setDismissedKey(null);
  }, [game.createdAt, game.round]);

  const byId = new Map(game.players.map((player) => [player.id, player]));
  const investigationTargets = view.investigateTargets
    .map((id) => byId.get(id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const target = targetId ? byId.get(targetId) : undefined;
  const result = targetId ? view.investigations[targetId] : undefined;
  const resultKey = targetId
    ? `${game.createdAt}:${game.round}:${targetId}`
    : null;

  // Sonuç kartı, soruşturma eylemi sunucuya işlendikten sonra açılır.
  // `investigationUsedThisRound` kontrolü, eski sonucun sonraki dönemlerde
  // yeniden açılmasını engeller.
  const resultOpen = Boolean(
    result &&
      view.investigationUsedThisRound &&
      !view.canInvestigate &&
      resultKey &&
      dismissedKey !== resultKey,
  );
  const mandatoryOpen = view.canInvestigate && game.phase !== 'gameOver';
  const open = mandatoryOpen || resultOpen;
  const meta = result ? INVESTIGATION_CARD[result] : null;

  const closeResult = () => {
    if (!resultOpen || !resultKey) return;
    setDismissedKey(resultKey);
    setTargetId(null);
    setSelectedId(null);
  };

  const submit = () => {
    if (!selectedId || actionPending) return;
    setTargetId(selectedId);
    onAction({ type: 'investigate', targetId: selectedId });
  };

  return (
    <Modal
      open={open}
      onClose={closeResult}
      title={resultOpen ? 'Soruşturma Sonucu' : 'İstihbarat Soruşturması'}
      eyebrow="İstihbarat Başkanlığı"
      subtitle={
        resultOpen
          ? `${target?.name ?? 'Hedef'} için soruşturma kartı açıldı. Bu sonuç yalnızca sana gösterilir.`
          : 'Soruşturma döneminde bir oyuncuyu seçmeden döneme devam edemezsin. Sonuç yalnızca sana gösterilir; seçim geri alınamaz.'
      }
      size={resultOpen ? 'lg' : 'md'}
      hideClose={!resultOpen}
      closeOnOverlay={resultOpen}
      overlayClassName="investigation-overlay"
      className="investigation-modal"
      footer={
        resultOpen ? (
          <div className="modal-actions">
            <Button variant="primary" onClick={closeResult} icon={<Check size={16} />}>
              Sonucu Kapat
            </Button>
          </div>
        ) : (
          <div className="modal-actions investigation-modal__actions">
            <span className="investigation-modal__hint">
              <ShieldCheck size={13} aria-hidden="true" />
              Soruşturma zorunlu
            </span>
            <Button
              variant="primary"
              onClick={submit}
              disabled={!selectedId || actionPending}
              loading={actionPending}
              icon={<Eye size={16} />}
            >
              Soruştur
            </Button>
          </div>
        )
      }
    >
      {error ? (
        <div className="form-alert form-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {resultOpen && meta ? (
        <div className={cn('investigation-result', `investigation-result--${meta.tone}`)}>
          <figure className="investigation-result__card">
            <img
              src={meta.image}
              alt={meta.alt}
              width={720}
              height={958}
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </figure>
          <div className="investigation-result__body">
            <p className="eyebrow">Hedef</p>
            <h3>{target?.name ?? 'Bilinmeyen oyuncu'}</h3>
            <span className={cn('investigation-result__stamp', `investigation-result__stamp--${meta.tone}`)}>
              {meta.label}
            </span>
            <p className="investigation-result__note">{meta.note}</p>
            {result === 'iyi' ? (
              <p className="investigation-result__footnote">
                Otokrat Lider ve Nötr de soruşturmada Demokrat kartı verir.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="investigation-stage__notice">
            <Eye size={16} aria-hidden="true" />
            <p>
              Soruşturma döneminde bir hedef seçmelisin. Soruşturma yapılmadan
              oy, adaylık veya reform adımına geçilemez.
            </p>
          </div>
          <div
            className="investigation-targets"
            role="listbox"
            aria-label="Soruşturma hedefi"
          >
            {investigationTargets.map((player) => {
              const selected = selectedId === player.id;
              return (
                <button
                  key={player.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'investigation-target',
                    selected && 'investigation-target--selected',
                  )}
                  onClick={() => setSelectedId(player.id)}
                  disabled={actionPending}
                >
                  <Avatar avatarId={player.avatarId} size="sm" />
                  <span className="investigation-target__name">{player.name}</span>
                  {player.isBot ? <em>bot</em> : null}
                  <span className="investigation-target__mark" aria-hidden="true">
                    {selected ? <Check size={14} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {investigationTargets.length === 0 ? (
            <p className="muted">Uygun soruşturma hedefi yok.</p>
          ) : null}
        </>
      )}
    </Modal>
  );
}
