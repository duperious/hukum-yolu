import {
  AlertTriangle,
  Check,
  Crosshair,
  Eye,
  Flag,
  Gavel,
  Landmark,
  Scale,
  ScrollText,
  ShieldCheck,
  Skull,
  Sparkles,
  UserPlus,
  Vote,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ROLE_INFO } from '../game';
import type {
  GameAction,
  NotrSide,
  PolicyCard as PolicyCardType,
  PrivateView,
  PublicGameState,
} from '../game';
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
  presidentDiscard: {
    title: 'Başkanın Eli',
    description: 'Başkan üç karttan birini eliyor.',
    icon: Landmark,
  },
  chancellorEnact: {
    title: 'Başbakanın Eli',
    description: 'Başbakan kalan iki karttan birini yürürlüğe koyuyor.',
    icon: Gavel,
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
    title: 'Suikast',
    description: 'Başkan bir suikast hedefi seçiyor.',
    icon: Crosshair,
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
}: {
  game: PublicGameState;
  view: PrivateView;
  onAction: (action: GameAction) => void;
  actionPending?: boolean;
  error?: string | null;
  onDismissError?: () => void;
  onOpenRole: () => void;
  onOpenVoteStage?: () => void;
}) {
  const [selectedNominee, setSelectedNominee] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<boolean | null>(null);
  const [selectedCard, setSelectedCard] = useState<PolicyCardType | null>(null);
  const [selectedSide, setSelectedSide] = useState<NotrSide | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  useEffect(() => {
    setSelectedNominee(null);
    setPendingVote(null);
    setSelectedCard(null);
    setSelectedSide(null);
    setSelectedTarget(null);
  }, [game.phase, game.round, game.chancellorId, game.presidentId]);

  if (game.phase === 'gameOver') return null;

  const meta = PHASE_META[game.phase] ?? PHASE_META.roleReveal;
  const roleInfo = ROLE_INFO[view.role];
  const byId = new Map(game.players.map((player) => [player.id, player]));
  const presidentName = playerName(game, game.presidentId);
  const chancellorName = playerName(game, game.chancellorId);
  const eligible = view.eligibleChancellorIds
    .map((id) => byId.get(id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const assassinationTargets = view.assassinationTargets
    .map((id) => byId.get(id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const canAct =
    view.canNominate ||
    view.canVote ||
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
            <span className="action-panel__round">Tur {game.round}</span>
          </div>
          <h2 className="action-panel__title">{meta.title}</h2>
          <p className="action-panel__description">{meta.description}</p>
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
            Görevin · {roleInfo.name}
          </span>
          <p>{roleInfo.mission}</p>
        </div>
      </div>

      {canAct ? <span className="turn-badge">Sıra sende</span> : null}

      {!view.isAlive ? (
        <div className="action-note action-note--dead">
          <Skull size={16} />
          <p>Öldün. Oyunu izliyorsun; takımın kazanırsa sen de kazanırsın.</p>
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
                ? 'Diğer oyuncuların rol onayı bekleniyor. Herkes hazır olduğunda ilk tur başlayacak.'
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
              eligible.length > 0 ? (
                <>
                  <div className="target-list">
                    {eligible.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className={cn(
                          'target-option',
                          selectedNominee === player.id && 'target-option--selected',
                        )}
                        onClick={() => setSelectedNominee(player.id)}
                        aria-pressed={selectedNominee === player.id}
                        disabled={actionPending}
                      >
                        <Avatar avatarId={player.avatarId} size="sm" />
                        <span>{player.name}</span>
                        {player.id === game.previousChancellorId ? (
                          <span className="muted">Önceki PM</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <div className="confirm-bar">
                    <span className="confirm-bar__hint">
                      {selectedNominee
                        ? `Aday: ${playerName(game, selectedNominee)}`
                        : 'Bir aday seç.'}
                    </span>
                    <Button
                      variant="primary"
                      onClick={() => {
                        if (!selectedNominee) return;
                        onAction({ type: 'nominate', targetId: selectedNominee });
                      }}
                      disabled={!selectedNominee || actionPending}
                      loading={actionPending}
                      icon={<UserPlus size={16} />}
                    >
                      Aday Göster
                    </Button>
                  </div>
                </>
              ) : (
                <p className="muted">Uygun aday bulunamadı.</p>
              )
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
                {onOpenVoteStage ? (
                  <button
                    type="button"
                    className="vote-stage-hint"
                    onClick={onOpenVoteStage}
                  >
                    <Vote size={14} />
                    Merkez oylama kartını aç
                  </button>
                ) : null}
                <div className="vote-choices">
                  <button
                    type="button"
                    className={cn(
                      'vote-choice vote-choice--yes',
                      pendingVote === true && 'vote-choice--selected',
                    )}
                    onClick={() => setPendingVote(true)}
                    disabled={actionPending}
                    aria-pressed={pendingVote === true}
                  >
                    <span className="vote-choice__icon" aria-hidden="true">
                      <Check size={24} />
                    </span>
                    <span className="vote-choice__label">Evet</span>
                    <small>Hükümet kurulsun</small>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'vote-choice vote-choice--no',
                      pendingVote === false && 'vote-choice--selected',
                    )}
                    onClick={() => setPendingVote(false)}
                    disabled={actionPending}
                    aria-pressed={pendingVote === false}
                  >
                    <span className="vote-choice__icon" aria-hidden="true">
                      <X size={24} />
                    </span>
                    <span className="vote-choice__label">Hayır</span>
                    <small>Hükümet kurulmasın</small>
                  </button>
                </div>
                <div className="confirm-bar">
                  <span className="confirm-bar__hint">
                    {pendingVote === null
                      ? 'Evet veya Hayır seç. Oyun gizli tutulur; yalnızca sonuç açıklanır.'
                      : `Oyun: ${pendingVote ? 'Evet' : 'Hayır'}`}
                  </span>
                  <Button
                    variant={pendingVote === false ? 'danger' : 'primary'}
                    onClick={() => {
                      if (pendingVote === null) return;
                      onAction({ type: 'vote', choice: pendingVote });
                    }}
                    disabled={pendingVote === null || actionPending}
                    loading={actionPending}
                    icon={<Vote size={16} />}
                  >
                    Oyumu Gönder
                  </Button>
                </div>
              </>
            ) : view.hasVoted ? (
              <div className="action-note action-note--success">
                <Check size={16} />
                <p>
                  Oyun kaydedildi: <strong>{view.yourVote ? 'Evet' : 'Hayır'}</strong>.{' '}
                  {game.votesSubmitted}/{game.totalVoters} oy geldi.
                </p>
              </div>
            ) : view.isAlive ? (
              <div className="waiting-illustration">
                <Vote size={30} />
                <span>
                  {game.votesSubmitted}/{game.totalVoters} oy geldi. Diğer oyuncular bekleniyor…
                </span>
              </div>
            ) : (
              <p className="muted">Ölü oyuncular oy kullanamaz.</p>
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
                <div className="policy-choice-grid">
                  {view.legislativeCards.map((card, index) => (
                    <PolicyCard
                      key={`${game.round}-${game.phase}-${card}-${index}`}
                      type={card}
                      selected={selectedCard === card}
                      onClick={() => setSelectedCard(card)}
                      disabled={actionPending}
                    />
                  ))}
                </div>
                <div className="confirm-bar">
                  <span className="confirm-bar__hint">
                    {selectedCard
                      ? `${selectedCard === 'demokratik' ? 'Demokratik' : 'Otokrat'} kartı elenecek.`
                      : 'Bir kart seç.'}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!selectedCard) return;
                      onAction({ type: 'president_discard', card: selectedCard });
                    }}
                    disabled={!selectedCard || actionPending}
                    loading={actionPending}
                    icon={<ScrollText size={16} />}
                  >
                    Kartı Ele
                  </Button>
                </div>
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
                <div className="policy-choice-grid">
                  {view.legislativeCards.map((card, index) => (
                    <PolicyCard
                      key={`${game.round}-${game.phase}-${card}-${index}`}
                      type={card}
                      selected={selectedCard === card}
                      onClick={() => setSelectedCard(card)}
                      disabled={actionPending}
                    />
                  ))}
                </div>
                <div className="confirm-bar">
                  <span className="confirm-bar__hint">
                    {selectedCard
                      ? `${selectedCard === 'demokratik' ? 'Demokratik' : 'Otokrat'} reform yürürlüğe girecek.`
                      : 'Bir kart seç.'}
                  </span>
                  <Button
                    variant={selectedCard === 'otokrat' ? 'danger' : 'primary'}
                    onClick={() => {
                      if (!selectedCard) return;
                      onAction({ type: 'chancellor_enact', card: selectedCard });
                    }}
                    disabled={!selectedCard || actionPending}
                    loading={actionPending}
                    icon={<Gavel size={16} />}
                  >
                    Reformu Yürürlüğe Koy
                  </Button>
                </div>
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
                ? 'Bu seçim gizlidir. Mavi Demokratlarla, kırmızı Otokratların yanında oynarsın. Kırmızıda normal Otokrat zaferi otomatik kazanmaz.'
                : 'Nötr, ilk üç reformun ardından tarafını gizlice seçiyor.'}
            </p>
            {view.canChooseNotrSide ? (
              <>
                <div className="notr-choices">
                  <button
                    type="button"
                    className={cn(
                      'notr-choice notr-choice--blue',
                      selectedSide === 'mavi' && 'notr-choice--selected',
                    )}
                    onClick={() => setSelectedSide('mavi')}
                    disabled={actionPending}
                    aria-pressed={selectedSide === 'mavi'}
                  >
                    <Scale size={24} />
                    <strong>Mavi</strong>
                    <span>Demokratlarla kazan</span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'notr-choice notr-choice--red',
                      selectedSide === 'kirmizi' && 'notr-choice--selected',
                    )}
                    onClick={() => setSelectedSide('kirmizi')}
                    disabled={actionPending}
                    aria-pressed={selectedSide === 'kirmizi'}
                  >
                    <ShieldCheck size={24} />
                    <strong>Kırmızı</strong>
                    <span>Otokratları destekle, kişisel zafer peşinde koş</span>
                  </button>
                </div>
                <div className="confirm-bar">
                  <span className="confirm-bar__hint">
                    {selectedSide
                      ? `Taraf: ${selectedSide === 'mavi' ? 'Mavi' : 'Kırmızı'}`
                      : 'Bir taraf seç.'}
                  </span>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!selectedSide) return;
                      onAction({ type: 'choose_notr_side', side: selectedSide });
                    }}
                    disabled={!selectedSide || actionPending}
                    loading={actionPending}
                    icon={<Scale size={16} />}
                  >
                    Tarafımı Seç
                  </Button>
                </div>
              </>
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
            <h3>{view.canAssassinate ? 'Suikast hedefini seç' : 'Suikast hedefi seçiliyor'}</h3>
            <p>
              {view.canAssassinate
                ? 'Bu seçim geri alınamaz. Lideri öldürürsen ve kırmızı Nötr yoksa Demokratlar kazanır.'
                : `Başkan ${presidentName} bir suikast hedefi seçiyor.`}
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
                    icon={<Crosshair size={16} />}
                  >
                    Suikastı Onayla
                  </Button>
                </div>
              </>
            ) : (
              <div className="waiting-illustration">
                <Crosshair size={30} />
                <span>Hedef seçiliyor…</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
