import { AlertTriangle, Check, Loader2, Vote, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';

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
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState<boolean | null>(null);
  const voteKey = `${game.round}:${game.presidentId}:${game.chancellorId}`;

  // Aynı dönem içinde yeni bir hükümet oylaması açılırsa gönderim kilidini
  // sıfırla; aksi halde önceki oyunun "gönderiliyor" durumu yeni oylamayı
  // kilitli bırakır.
  useEffect(() => {
    setSending(false);
    setSelected(null);
  }, [open, voteKey]);

  // Oy gönderilemezse kartı yanlışlıkla "kaydedildi" durumunda bırakma.
  useEffect(() => {
    if (error || view.hasVoted) setSending(false);
  }, [error, view.hasVoted]);

  useEffect(() => {
    if (!sending) return;
    const timer = window.setTimeout(() => setSending(false), 8000);
    return () => window.clearTimeout(timer);
  }, [sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const done = view.hasVoted;
  const votedIds = game.votedPlayerIds ?? [];
  const pendingVoters = useMemo(
    () =>
      game.players.filter(
        (player) => player.alive && !votedIds.includes(player.id),
      ),
    [game.players, votedIds],
  );
  const pendingHumans = pendingVoters.filter((player) => !player.isBot);
  const counting = done && pendingHumans.length === 0;

  // Botların oyları anında çözülür. Yalnızca bot oyu kaldıysa kartı
  // "diğer oyuncular bekleniyor" ekranında bırakma; kısa süre sonra kapat.
  useEffect(() => {
    if (!open || !done || !counting) return;
    const timer = window.setTimeout(onClose, 1600);
    return () => window.clearTimeout(timer);
  }, [open, done, counting, onClose]);

  if (!open) return null;

  const president = game.players.find((player) => player.id === game.presidentId);
  const chancellor = game.players.find((player) => player.id === game.chancellorId);

  const submit = () => {
    if (selected === null || done || actionPending || sending) return;
    setSending(true);
    onAction({ type: 'vote', choice: selected });
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
        <span className="vote-stage__kicker">
          Dönem {game.round}, hükümet oylaması
        </span>
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
          <span className="vote-stage__arrow" aria-hidden="true" />
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
            <span
              className={cn(
                'vote-stage__done-icon',
                counting && 'vote-stage__done-icon--counting',
              )}
              aria-hidden="true"
            >
              {counting ? (
                <Loader2 className="spin" size={24} />
              ) : (
                <Check size={26} />
              )}
            </span>
            <p>
              {counting
                ? 'Oylar sayılıyor…'
                : 'Oyun kaydedildi. Diğer oyuncular bekleniyor…'}
            </p>
            <span className="vote-stage__done-count">
              {game.votesSubmitted}/{game.totalVoters} oy geldi
            </span>
            {pendingHumans.length > 0 ? (
              <span className="vote-stage__pending">
                Beklenen oy: {pendingHumans.map((player) => player.name).join(', ')}
              </span>
            ) : counting ? (
              <span className="vote-stage__pending">
                {pendingVoters.length > 0
                  ? 'Botların oyları otomatik tamamlanıyor.'
                  : 'Tüm oylar alındı.'}
              </span>
            ) : null}
          </div>
        ) : (
          <>
            {error ? (
              <div className="vote-stage__error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}
            <div className="vote-stage__choices">
              <button
                type="button"
                className={cn(
                  'vote-stage__choice vote-stage__choice--yes',
                  selected === true && 'vote-stage__choice--selected',
                )}
                onClick={() => setSelected(true)}
                disabled={actionPending || sending}
                aria-pressed={selected === true}
              >
                <span className="vote-stage__choice-icon" aria-hidden="true">
                  <Check size={30} />
                </span>
                <strong>Evet</strong>
                <small>Hükümet kurulsun</small>
                {selected === true ? (
                  <span className="vote-stage__choice-picked">Seçildi</span>
                ) : null}
              </button>
              <button
                type="button"
                className={cn(
                  'vote-stage__choice vote-stage__choice--no',
                  selected === false && 'vote-stage__choice--selected',
                )}
                onClick={() => setSelected(false)}
                disabled={actionPending || sending}
                aria-pressed={selected === false}
              >
                <span className="vote-stage__choice-icon" aria-hidden="true">
                  <X size={30} />
                </span>
                <strong>Hayır</strong>
                <small>Hükümet kurulmasın</small>
                {selected === false ? (
                  <span className="vote-stage__choice-picked">Seçildi</span>
                ) : null}
              </button>
            </div>

            <div className="vote-stage__confirm">
              <span className="vote-stage__confirm-hint">
                {selected === null
                  ? 'Önce Evet veya Hayır seç.'
                  : selected
                    ? 'Oyun: Evet · Hükümet kurulsun'
                    : 'Oyun: Hayır · Hükümet kurulmasın'}
              </span>
              <Button
                variant={selected === false ? 'danger' : 'gold'}
                size="lg"
                onClick={submit}
                disabled={selected === null || actionPending || sending}
                loading={sending}
                icon={<Vote size={17} />}
              >
                Oyu Onayla ve Gönder
              </Button>
            </div>

            <p className="vote-stage__note">
              {game.openVoting ? (
                <>
                  <Vote size={12} aria-hidden="true" />
                  Açık oylama: bireysel oylar sonuçla birlikte açıklanır.{' '}
                  {game.votesSubmitted}/{game.totalVoters} oy geldi.
                </>
              ) : (
                <>
                  <Vote size={12} aria-hidden="true" />
                  Oyun gizlidir; yalnızca ağırlıklı toplam açıklanır.{' '}
                  {game.votesSubmitted}/{game.totalVoters} oy geldi.
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
