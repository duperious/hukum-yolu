import { AlertTriangle, Gavel, ScrollText, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Button } from './ui/Button';
import { PolicyCard } from './PolicyCard';

/**
 * Başkanın kart elemesini ve Başbakanın reform seçimini ekranın ortasında
 * gösteren mazbata sahnesi. Sıra geldiğinde otomatik açılır; oyuncu kartı
 * kapatıp karar panelinden yeniden açabilir.
 */
export function PolicyStage({
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isDiscard = game.phase === 'presidentDiscard';
  const canAct = isDiscard ? view.canDiscard : view.canEnact;
  const cards = useMemo(() => view.legislativeCards ?? [], [view.legislativeCards]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [open, game.round, game.phase, cards.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !canAct || cards.length === 0) return null;

  const president = game.players.find((player) => player.id === game.presidentId);
  const chancellor = game.players.find((player) => player.id === game.chancellorId);
  const selectedCard = selectedIndex === null ? null : cards[selectedIndex];
  const selectedLabel =
    selectedCard === 'demokratik' ? 'Demokratik reform' : 'Otokrat reform';

  const submit = () => {
    if (!selectedCard || actionPending) return;
    onAction(
      isDiscard
        ? { type: 'president_discard', card: selectedCard }
        : { type: 'chancellor_enact', card: selectedCard },
    );
  };

  return (
    <div
      className="vote-stage-overlay policy-stage-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isDiscard ? 'Kart eleme' : 'Reform seçimi'}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn('vote-stage policy-stage', isDiscard ? 'policy-stage--discard' : 'policy-stage--enact')}>
        <button
          type="button"
          className="icon-btn vote-stage__close"
          onClick={onClose}
          aria-label="Kart seçimini kapat"
        >
          <X size={18} />
        </button>

        <span className="vote-stage__kicker">
          Tur {game.round}, {isDiscard ? 'kart eleme' : 'reform seçimi'}
        </span>
        <h2 className="vote-stage__title">
          {isDiscard ? 'Bir kartı ele' : 'Bir reformu yürürlüğe koy'}
        </h2>
        <p className="policy-stage__lead">
          {isDiscard
            ? `Başkan ${president?.name ?? '—'}, üç karttan birini desteye gönderecek. Kalan iki kart Başbakana geçer.`
            : `Başbakan ${chancellor?.name ?? '—'}, kalan iki karttan birini yürürlüğe koyacak. Diğer kart desteye gidecek.`}
        </p>

        <div className="policy-stage__meta">
          <div>
            <span>{isDiscard ? 'Başkan' : 'Başbakan'}</span>
            <strong>
              {(isDiscard ? president?.name : chancellor?.name) ?? '—'}
            </strong>
          </div>
          <div>
            <span>Karar</span>
            <strong>{selectedCard ? selectedLabel : 'Henüz seçilmedi'}</strong>
          </div>
        </div>

        {error ? (
          <div className="vote-stage__error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <div
          className={cn(
            'policy-stage__cards',
            cards.length === 2 && 'policy-stage__cards--two',
          )}
        >
          {cards.map((card, index) => (
            <PolicyCard
              key={`${game.round}-${game.phase}-${card}-${index}`}
              type={card}
              size="lg"
              selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              disabled={actionPending}
              showSubtitle={false}
            />
          ))}
        </div>

        <div className="policy-stage__actions">
          <span className="policy-stage__selection">
            {selectedCard
              ? isDiscard
                ? `${selectedLabel} kartı elenecek.`
                : `${selectedLabel} yürürlüğe girecek.`
              : 'Bir kart seç.'}
          </span>
          <Button
            variant={
              isDiscard ? 'secondary' : selectedCard === 'otokrat' ? 'danger' : 'primary'
            }
            size="lg"
            onClick={submit}
            disabled={!selectedCard || actionPending}
            loading={actionPending}
            icon={
              isDiscard ? <ScrollText size={17} /> : <Gavel size={17} />
            }
          >
            {isDiscard ? 'Kartı Ele' : 'Reformu Yürürlüğe Koy'}
          </Button>
        </div>

        <p className="vote-stage__note policy-stage__note">
          {isDiscard
            ? 'Seçilen kart desteye gider; kalan iki kart Başbakana geçer.'
            : 'Seçilen reform yürürlüğe girer; diğer kart desteye gider. Karar geri alınamaz.'}
        </p>
      </div>
    </div>
  );
}
