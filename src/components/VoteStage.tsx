import { Check, Vote, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';

/**
 * Hükümet oylamasını ekranın ortasında animasyonlu bir kart olarak sunar.
 * Kullanıcı doğrudan Evet/Hayır kartına tıklayarak oyunu gönderir;
 * Escape veya arka plana tıklayarak kartı kapatabilir (panelde oylamaya
 * devam edebilir).
 */
export function VoteStage({
  game,
  view,
  onAction,
  actionPending = false,
  open,
  onClose,
}: {
  game: PublicGameState;
  view: PrivateView;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) setSent(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const president = game.players.find((player) => player.id === game.presidentId);
  const chancellor = game.players.find((player) => player.id === game.chancellorId);
  const done = sent || view.hasVoted;

  const submit = (choice: boolean) => {
    if (done || actionPending) return;
    setSent(true);
    onAction({ type: 'vote', choice });
  };

  return (
    <div
      className="vote-stage-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Hükümet oylaması"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn('vote-stage', done && 'vote-stage--done')}>
        <button
          type="button"
          className="icon-btn vote-stage__close"
          onClick={onClose}
          aria-label="Oylama kartını kapat"
        >
          <X size={18} />
        </button>
        <span className="vote-stage__kicker">Tur {game.round} · Hükümet Oylaması</span>
        <h2 className="vote-stage__title">Hükümet kurulmalı mı?</h2>

        <div className="vote-stage__government">
          <div className="vote-stage__seat vote-stage__seat--president">
            <span className="vote-stage__avatar">
              <Avatar
                avatarId={president?.avatarId ?? 'avatar-1'}
                size="lg"
              />
            </span>
            <div>
              <span>Başkan</span>
              <strong>{president?.name ?? '—'}</strong>
            </div>
          </div>
          <span className="vote-stage__arrow" aria-hidden="true">
            →
          </span>
          <div className="vote-stage__seat vote-stage__seat--chancellor">
            <span className="vote-stage__avatar">
              <Avatar
                avatarId={chancellor?.avatarId ?? 'avatar-1'}
                size="lg"
              />
            </span>
            <div>
              <span>Başbakan adayı</span>
              <strong>{chancellor?.name ?? '—'}</strong>
            </div>
          </div>
        </div>

        {done ? (
          <div className="vote-stage__done">
            <span className="vote-stage__done-icon" aria-hidden="true">
              <Check size={26} />
            </span>
            <p>Oyun kaydedildi. Diğer oyuncular bekleniyor…</p>
            <span className="vote-stage__done-count">
              {game.votesSubmitted}/{game.totalVoters} oy geldi
            </span>
          </div>
        ) : (
          <>
            <div className="vote-stage__choices">
              <button
                type="button"
                className="vote-stage__choice vote-stage__choice--yes"
                onClick={() => submit(true)}
                disabled={actionPending}
              >
                <span className="vote-stage__choice-icon" aria-hidden="true">
                  <Check size={30} />
                </span>
                <strong>Evet</strong>
                <small>Hükümet kurulsun</small>
              </button>
              <button
                type="button"
                className="vote-stage__choice vote-stage__choice--no"
                onClick={() => submit(false)}
                disabled={actionPending}
              >
                <span className="vote-stage__choice-icon" aria-hidden="true">
                  <X size={30} />
                </span>
                <strong>Hayır</strong>
                <small>Hükümet kurulmasın</small>
              </button>
            </div>
            <p className="vote-stage__note">
              <Vote size={12} aria-hidden="true" />
              Kart seçtiğin an oyun gönderilir. Oylar gizlidir; yalnızca toplam sonuç
              açıklanır. {game.votesSubmitted}/{game.totalVoters} oy geldi.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
