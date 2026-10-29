import {
  AlertTriangle,
  ArrowRight,
  Check,
  Eye,
  Flag,
  Gavel,
  Landmark,
  LockKeyhole,
  Scale,
  ScrollText,
  Sparkles,
  UserPlus,
  UserX,
  Vote,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ROLE_INFO } from '../game';
import type { GameAction, PrivateView, PublicGameState } from '../game';
import { cn } from '../lib/cn';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { PolicyCard } from './PolicyCard';

export const PHASE_META: Record<
  string,
  { title: string; description: string; icon: LucideIcon }
> = {
  roleReveal: {
    title: 'Rol Dağıtımı',
    description: 'Rolünü gör, onayla ve masaya dön.',
    icon: Eye,
  },
  nomination: {
    title: 'Başbakan Adaylığı',
    description: 'Başkan bir Başbakan adayı gösteriyor.',
    icon: UserPlus,
  },
  voting: {
    title: 'Hükümet Oylaması',
    description: 'Hükümete güveniyor musun? Oylar gizlidir.',
    icon: Vote,
  },
  voteResult: {
    title: 'Oylama Sonucu',
    description: 'Hükümetin kaderi açıklandı; sonuç tutanağı bekleniyor.',
    icon: Check,
  },
  presidentDiscard: {
    title: 'Kart Eleme',
    description: 'Başkan üç karttan birini eliyor.',
    icon: Landmark,
  },
  chancellorEnact: {
    title: 'Reform Seçimi',
    description: 'Başbakan kalan iki karttan birini yürürlüğe koyuyor.',
    icon: Gavel,
  },
  policyReveal: {
    title: 'Reform Yürürlükte',
    description: 'Yürürlüğe giren reform ve sonuçları açıklanıyor.',
    icon: ScrollText,
  },
  notrChoice: {
    title: 'Nötr’ün Seçimi',
    description: 'Nötr gizlice tarafını seçiyor. Seçim herkese açık değil.',
    icon: Scale,
  },
  peek: {
    title: 'Kart İnceleme',
    description: 'Başkan destenin üstündeki üç kartı inceliyor.',
    icon: Eye,
  },
  assassination: {
    title: 'Tutuklama',
    description: 'Başkan bir tutuklama hedefi seçiyor.',
    icon: LockKeyhole,
  },
  termEnd: {
    title: 'Dönem Kapanışı',
    description: 'Dönem tutanağı ve sıradaki Başkan açıklanıyor.',
    icon: Flag,
  },
  gameOver: {
    title: 'Oyun Bitti',
    description: 'Hüküm verildi.',
    icon: Sparkles,
  },
};

function playerName(game: PublicGameState, id: string | null): string {
  if (!id) return '—';
  return game.players.find((player) => player.id === id)?.name ?? '—';
}

function PhaseBadge({ phase }: { phase: string }) {
  const meta = PHASE_META[phase] ?? PHASE_META.roleReveal;
  const Icon = meta.icon;
  return (
    <span className="phase-badge">
      <Icon size={14} />
      {meta.title}
    </span>
  );
}

export function ActionPanel({
  game,
  view,
  onAction,
  actionPending = false,
  error = null,
  onDismissError,
  onOpenRole,
  onOpenVoteStage,
  onOpenNomineeStage,
  onOpenPolicyStage,
  onOpenNotrStage,
}: {
  game: PublicGameState;
  view: PrivateView;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
  onDismissError?: () => void;
  onOpenRole: () => void;
  onOpenVoteStage?: () => void;
  onOpenNomineeStage?: () => void;
  onOpenPolicyStage?: () => void;
  onOpenNotrStage?: () => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTarget(null);
  }, [game.phase, game.round, game.chancellorId, game.presidentId]);

  if (game.phase === 'gameOver') return null;

  const roleInfo = ROLE_INFO[view.role];
  const byId = new Map(game.players.map((player) => [player.id, player]));
  const presidentName = playerName(game, game.presidentId);
  const chancellorName = playerName(game, game.chancellorId);
  const votedIds = game.votedPlayerIds ?? [];
  const pendingVoters = game.players.filter(
    (player) => player.alive && !votedIds.includes(player.id),
  );
  const pendingHumans = pendingVoters.filter((player) => !player.isBot);
  const onlyBotsPending = pendingVoters.length > 0 && pendingHumans.length === 0;
  const assassinationTargets = view.assassinationTargets
    .map((id) => byId.get(id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const canAct =
    view.canNominate ||
    view.canVote ||
    view.canContinue ||
    view.canEndTerm ||
    view.canDiscard ||
    view.canEnact ||
    view.canChooseNotrSide ||
    view.canAssassinate ||
    (game.phase === 'roleReveal' && !view.roleRevealAcknowledged) ||
    (game.phase === 'peek' && Boolean(view.pendingPeekCards));

  return (
    <section className={cn('action-panel panel', canAct && 'action-panel--active')}>
      <header className="action-panel__header">
        <div>
          <div className="action-panel__phase-row">
            <PhaseBadge phase={game.phase} />
            <span className="action-panel__round">Dönem {game.round}</span>
          </div>
        </div>
        <button type="button" className="role-peek-btn" onClick={onOpenRole}>
          <Eye size={16} />
          Rolüm
        </button>
      </header>

      <div className={cn('action-panel__mission', `action-panel__mission--${roleInfo.accent}`)}>
        <span className="action-panel__mission-icon" aria-hidden="true">
          <Flag size={18} />
        </span>
        <div>
          <span className="action-panel__mission-kicker">
            Görevin: {roleInfo.name}
          </span>
          <p>{roleInfo.mission}</p>
        </div>
      </div>

      {canAct ? <span className="turn-badge">Sıra sende</span> : null}

      {!view.isAlive ? (
        <div className="action-note action-note--dead">
          <UserX size={16} />
          <p>Oyun dışı kaldın. Oyunu izliyorsun; takımın kazanırsa sen de kazanırsın.</p>
        </div>
      ) : null}

      {error ? (
        <div className="form-alert form-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          {onDismissError ? (
            <button type="button" className="icon-btn" onClick={onDismissError} aria-label="Hatayı kapat">
              <X size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="action-panel__body">
        {game.phase === 'roleReveal' ? (
          <div className="action-block">
            <div className="action-illustration" aria-hidden="true">
              <Eye size={34} />
            </div>
            <h3>{view.roleRevealAcknowledged ? 'Rolünü onayladın' : 'Rolünü gör ve onayla'}</h3>
            <p>
              {view.roleRevealAcknowledged
                ? 'Diğer oyuncuların rol onayı bekleniyor. Herkes hazır olduğunda ilk dönem başlayacak.'
                : 'Rol kartın gizli. Yalnızca sen göreceksin. Rolünü öğrendikten sonra onayla.'}
            </p>
            <Button
              variant={view.roleRevealAcknowledged ? 'outline' : 'primary'}
              size="lg"
              onClick={onOpenRole}
              icon={<Eye size={18} />}
            >
              {view.roleRevealAcknowledged ? 'Rolümü tekrar gör' : 'Rolümü Göster'}
            </Button>
          </div>
        ) : null}

        {game.phase === 'nomination' ? (
          <div className="action-block">
            <h3>{view.canNominate ? 'Başbakan adayını seç' : 'Adaylık bekleniyor'}</h3>
            <p>
              {view.canNominate
                ? 'Başkan sensin. Uygun bir oyuncuyu Başbakan adayı olarak göster.'
                : `Başkan ${presidentName} bir Başbakan adayı seçiyor.`}
            </p>
            {view.canNominate ? (
              <>
                <div className="action-note action-note--nominate">
                  <UserPlus size={16} />
                  <p>
                    Aday seçimi ekranın ortasında açılır. Uygun bir oyuncuyu seçip
                    onayladığında oylama başlar.
                  </p>
                </div>
                {onOpenNomineeStage ? (
                  <Button
                    variant="primary"
                    onClick={onOpenNomineeStage}
                    icon={<UserPlus size={16} />}
                  >
                    Aday Seçimini Aç
                  </Button>
                ) : null}
              </>
            ) : (
              <div className="waiting-illustration">
                <Landmark size={30} />
                <span>{presidentName} seçiyor…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'voting' ? (
          <div className="action-block">
            <h3>{view.canVote ? 'Hükümete güveniyor musun?' : 'Oylama sürüyor'}</h3>
            <div className="government-card">
              <div className="government-card__seat">
                <Avatar
                  avatarId={byId.get(game.presidentId ?? '')?.avatarId ?? 'avatar-1'}
                  size="md"
                  ring="gold"
                />
                <div>
                  <span>Başkan</span>
                  <strong>{presidentName}</strong>
                </div>
              </div>
              <div className="government-card__arrow">→</div>
              <div className="government-card__seat">
                <Avatar
                  avatarId={byId.get(game.chancellorId ?? '')?.avatarId ?? 'avatar-1'}
                  size="md"
                  ring="blue"
                />
                <div>
                  <span>Başbakan</span>
                  <strong>{chancellorName}</strong>
                </div>
              </div>
            </div>

            {view.canVote ? (
              <>
                <div className="action-note action-note--vote">
                  <Vote size={16} />
                  <p>
                    Oylama kartı ekranın ortasında açılır. Evet veya Hayır seçip
                    onayladığında oyun gönderilir.{' '}
                    {game.openVoting
                      ? 'Bu oylama açıktır; bireysel oylar sonuçla birlikte görünür.'
                      : 'Oyun gizli tutulur; yalnızca hükümetin kabul/ret sonucu açıklanır.'}
                  </p>
                </div>
                {onOpenVoteStage ? (
                  <Button
                    variant="primary"
                    onClick={onOpenVoteStage}
                    icon={<Vote size={16} />}
                  >
                    Oylama Kartını Aç
                  </Button>
                ) : null}
              </>
            ) : view.hasVoted ? (
              <div className="action-note action-note--success">
                <Check size={16} />
                <p>
                  Oyun kaydedildi: <strong>{view.yourVote ? 'Evet' : 'Hayır'}</strong>.{' '}
                  {game.votesSubmitted}/{game.totalVoters} oy geldi.{' '}
                  {pendingHumans.length > 0
                    ? `${pendingHumans.length} oy bekleniyor.`
                    : onlyBotsPending
                      ? 'Botların oyları tamamlanıyor…'
                      : 'Oylar sayılıyor…'}
                </p>
              </div>
            ) : view.isAlive ? (
              <div className="waiting-illustration">
                <Vote size={30} />
                <span>
                  {game.votesSubmitted}/{game.totalVoters} oy geldi.{' '}
                  {pendingHumans.length > 0
                    ? 'Diğer oyuncular bekleniyor…'
                    : 'Oylar sayılıyor…'}
                </span>
              </div>
            ) : (
              <p className="muted">Oyun dışı oyuncular oy kullanamaz.</p>
            )}
          </div>
        ) : null}

        {game.phase === 'voteResult' ? (
          <div className="action-block">
            <h3>
              {game.lastVoteResult === 'kabul'
                ? 'Hükümet kabul edildi'
                : 'Hükümet reddedildi'}
            </h3>
            <p>
              {game.lastVoteTally
                ? `Açık oylama sonucu — Evet: ${game.lastVoteTally.yes}, Hayır: ${game.lastVoteTally.no}.${
                    game.lastVoteTally.blockedPlayerId
                      ? ` ${playerName(game, game.lastVoteTally.blockedPlayerId)}’in oyu engellendi.`
                      : ''
                  }`
                : 'Oylar sayıldı.'}{' '}
              {game.lastVoteOpen
                ? 'Bireysel tercihler sonuç ekranında görünüyor.'
                : 'Gizli oylama: yalnızca kabul/ret sonucu açıklandı.'}
            </p>
            {view.canContinue ? (
              <Button
                variant="primary"
                onClick={() => onAction({ type: 'continue' })}
                loading={actionPending}
                icon={<ArrowRight size={16} />}
              >
                {game.lastVoteResult === 'kabul'
                  ? 'Yasamayı Aç'
                  : game.failedVotes + 1 >= 3
                    ? 'Otomatik Reformu Aç'
                    : 'Yeni Döneme Geç'}
              </Button>
            ) : (
              <div className="waiting-illustration">
                <Vote size={30} />
                <span>Başkan veya host sonucu kapatacak…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'policyReveal' ? (
          <div className="action-block">
            <h3>
              {game.lastEnactedPolicy === 'otokrat'
                ? 'Otokrat Reform yürürlükte'
                : 'Demokratik Reform yürürlükte'}
            </h3>
            <p>
              Demokratik: {game.enacted.democratic}/{game.democraticWinThreshold} ·
              Otokrat: {game.enacted.fascist}/{game.fascistTrackLength}.
              {game.lastPolicyAuto ? ' Reform otomatik yürürlüğe girdi.' : ''}
            </p>
            {view.canContinue ? (
              <Button
                variant="primary"
                onClick={() => onAction({ type: 'continue' })}
                loading={actionPending}
                icon={<ArrowRight size={16} />}
              >
                Devam Et
              </Button>
            ) : (
              <div className="waiting-illustration">
                <ScrollText size={30} />
                <span>Reform sonucu açıklanıyor…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'termEnd' ? (
          <div className="action-block">
            <h3>Dönem {game.termSummary?.round ?? game.round} kapandı</h3>
            <p>
              {game.termSummary?.policy
                ? `${game.termSummary.policy === 'otokrat' ? 'Otokrat' : 'Demokratik'} reform yürürlüğe girdi. `
                : 'Hükümet kurulamadı. '}
              Sıradaki Başkan:{' '}
              <strong>{playerName(game, game.termSummary?.nextPresidentId ?? null)}</strong>.
            </p>
            {view.canEndTerm ? (
              <Button
                variant="gold"
                onClick={() => onAction({ type: 'end_term' })}
                loading={actionPending}
                icon={<ArrowRight size={16} />}
              >
                Dönemi Kapat
              </Button>
            ) : (
              <div className="waiting-illustration">
                <Flag size={30} />
                <span>Başkan dönemi kapatacak…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'presidentDiscard' ? (
          <div className="action-block">
            <h3>{view.canDiscard ? 'Üç karttan birini ele' : 'Başkan kart seçiyor'}</h3>
            <p>
              {view.canDiscard
                ? 'Bu üç karttan birini desteye göndereceksin. Kalan iki kart Başbakana geçecek.'
                : `Başkan ${presidentName} üç karttan birini eliyor.`}
            </p>
            {view.canDiscard && view.legislativeCards ? (
              <>
                <div className="action-note action-note--policy">
                  <ScrollText size={16} />
                  <p>
                    Kart seçimi ekranın ortasında açılır. Üç karttan birini
                    seçtiğinde kalan iki kart Başbakana geçer.
                  </p>
                </div>
                {onOpenPolicyStage ? (
                  <Button
                    variant="primary"
                    onClick={onOpenPolicyStage}
                    icon={<ScrollText size={16} />}
                  >
                    Kart Seçimini Aç
                  </Button>
                ) : null}
              </>
            ) : (
              <div className="waiting-illustration">
                <Landmark size={30} />
                <span>{presidentName} kart seçiyor…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'chancellorEnact' ? (
          <div className="action-block">
            <h3>{view.canEnact ? 'Bir reformu yürürlüğe koy' : 'Başbakan reform seçiyor'}</h3>
            <p>
              {view.canEnact
                ? 'Kalan iki karttan birini yürürlüğe koyacaksın. Diğer kart desteye gidecek.'
                : `Başbakan ${chancellorName} iki karttan birini seçiyor.`}
            </p>
            {view.canEnact && view.legislativeCards ? (
              <>
                <div className="action-note action-note--policy">
                  <Gavel size={16} />
                  <p>
                    Reform seçimi ekranın ortasında açılır. Kalan iki karttan
                    birini yürürlüğe koyduğunda diğer kart desteye gider.
                  </p>
                </div>
                {onOpenPolicyStage ? (
                  <Button
                    variant="primary"
                    onClick={onOpenPolicyStage}
                    icon={<Gavel size={16} />}
                  >
                    Reform Seçimini Aç
                  </Button>
                ) : null}
              </>
            ) : (
              <div className="waiting-illustration">
                <Gavel size={30} />
                <span>{chancellorName} reform seçiyor…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'notrChoice' ? (
          <div className="action-block">
            <h3>{view.canChooseNotrSide ? 'Tarafını seç' : 'Nötr tarafını seçiyor'}</h3>
            <p>
              {view.canChooseNotrSide
                ? 'Cumhuriyet Yolu Demokratlarla, İmparatorluk Yolu Otokratlarla oynatır. Seçim ekranın ortasındaki yol kartlarıyla yapılır ve gizli kalır.'
                : 'Nötr, ilk üç reformun ardından tarafını gizlice seçiyor.'}
            </p>
            {view.canChooseNotrSide ? (
              onOpenNotrStage ? (
                <Button
                  variant="primary"
                  onClick={onOpenNotrStage}
                  icon={<Scale size={16} />}
                >
                  Yol Seçimini Aç
                </Button>
              ) : null
            ) : (
              <div className="waiting-illustration">
                <Scale size={30} />
                <span>Nötr seçiyor…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'peek' ? (
          <div className="action-block">
            <h3>{view.pendingPeekCards ? 'Destenin üstündeki üç kart' : 'Başkan kartları inceliyor'}</h3>
            <p>
              {view.pendingPeekCards
                ? 'Kartlar aynı sırayla desteye geri konacak. Bu bilgi yalnızca sana gösterilir.'
                : `Başkan ${presidentName} destenin üstündeki üç kartı inceliyor.`}
            </p>
            {view.pendingPeekCards ? (
              <>
                <div className="policy-choice-grid policy-choice-grid--peek">
                  {view.pendingPeekCards.map((card, index) => (
                    <div key={`${game.round}-${game.phase}-${card}-${index}`} className="peek-card-wrap">
                      <span className="peek-card-wrap__order">{index + 1}. kart</span>
                      <PolicyCard type={card} size="sm" showSubtitle={false} />
                    </div>
                  ))}
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onAction({ type: 'ack_peek' })}
                  loading={actionPending}
                  icon={<Eye size={16} />}
                >
                  Kartları Desteye Geri Koy
                </Button>
              </>
            ) : (
              <div className="waiting-illustration">
                <Eye size={30} />
                <span>Kartlar inceleniyor…</span>
              </div>
            )}
          </div>
        ) : null}

        {game.phase === 'assassination' ? (
          <div className="action-block">
            <h3>{view.canAssassinate ? 'Tutuklama hedefini seç' : 'Tutuklama hedefi seçiliyor'}</h3>
            <p>
              {view.canAssassinate
                ? 'Bu seçim geri alınamaz. Lideri tutuklarsan ve kırmızı Nötr yoksa Demokratlar kazanır.'
                : `Başkan ${presidentName} bir tutuklama hedefi seçiyor.`}
            </p>
            {view.canAssassinate ? (
              <>
                <div className="target-list">
                  {assassinationTargets.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      className={cn(
                        'target-option target-option--danger',
                        selectedTarget === player.id && 'target-option--selected',
                      )}
                      onClick={() => setSelectedTarget(player.id)}
                      disabled={actionPending}
                      aria-pressed={selectedTarget === player.id}
                    >
                      <Avatar avatarId={player.avatarId} size="sm" />
                      <span>{player.name}</span>
                    </button>
                  ))}
                </div>
                <div className="confirm-bar">
                  <span className="confirm-bar__hint">
                    {selectedTarget
                      ? `Hedef: ${playerName(game, selectedTarget)}`
                      : 'Bir hedef seç.'}
                  </span>
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (!selectedTarget) return;
                      onAction({ type: 'assassinate', targetId: selectedTarget });
                    }}
                    disabled={!selectedTarget || actionPending}
                    loading={actionPending}
                    icon={<LockKeyhole size={16} />}
                  >
                    Tutuklamayı Onayla
                  </Button>
                </div>
              </>
            ) : (
              <div className="waiting-illustration">
                <LockKeyhole size={30} />
                <span>Hedef seçiliyor…</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
