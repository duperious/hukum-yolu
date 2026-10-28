import {
  Copy,
  Eye,
  IdCard,
  LogOut,
  Moon,
  ScrollText,
  Sun,
  Users,
  Vote,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionState } from '../hooks/useMultiplayerRoom';
import type { GameAction, RedactedGameState } from '../game';
import { FASCIST_TRACK_LABELS } from '../game';
import { copyText, roomInviteUrl } from '../lib/validation';
import { ActionPanel, PHASE_META } from './ActionPanel';
import { EndScreen } from './EndScreen';
import { EventBanner } from './EventBanner';
import { EventStage } from './EventStage';
import { GameLog } from './GameLog';
import { GovernmentPanel } from './GovernmentPanel';
import { NomineeStage } from './NomineeStage';
import { NotrStage } from './NotrStage';
import { PlayerCardGallery } from './PlayerCards';
import { PlayerCircle } from './PlayerCircle';
import { PolicyStage } from './PolicyStage';
import { PolicyTrack } from './PolicyTrack';
import { PowerPanel } from './PowerPanel';
import { PrivacyGate } from './PrivacyGate';
import {
  PolicyRevealStage,
  TermSummaryStage,
  VoteResultStage,
} from './TransitionStages';
import { VoteStage } from './VoteStage';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { ConnectionPill } from './ui/ConnectionPill';
import { Logo } from './ui/Logo';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

export function GameScreen({
  redacted,
  viewerId,
  roomCode,
  connection,
  actionPending = false,
  error = null,
  onDismissError,
  onAction,
  onLeave,
  onRestart,
  restartPending = false,
  isHost,
}: {
  redacted: RedactedGameState;
  viewerId: string;
  roomCode?: string;
  connection?: ConnectionState;
  actionPending?: boolean;
  error?: string | null;
  onDismissError?: () => void;
  onAction: (action: GameAction) => void;
  onLeave: () => void;
  onRestart?: () => void;
  restartPending?: boolean;
  isHost?: boolean;
}) {
  const { public: game, private: view } = redacted;
  const [roleGate, setRoleGate] = useState<'reveal' | 'inspect' | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [voteStageOpen, setVoteStageOpen] = useState(false);
  const [nomineeStageOpen, setNomineeStageOpen] = useState(false);
  const [notrStageOpen, setNotrStageOpen] = useState(false);
  const [policyStageOpen, setPolicyStageOpen] = useState(false);
  const [playerCardsOpen, setPlayerCardsOpen] = useState(false);
  const [playerCardsClosedFor, setPlayerCardsClosedFor] = useState<string | null>(
    null,
  );
  const [eraShift, setEraShift] = useState(false);
  const [gateSecondsLeft, setGateSecondsLeft] = useState<number | null>(null);
  const roleAutoOpenRef = useRef<string | null>(null);
  const playerCardsAutoOpenRef = useRef<string | null>(null);
  const gateSentRef = useRef<string | null>(null);
  const eraRef = useRef<'light' | 'dark'>(
    game.firstThreeResolved ? 'dark' : 'light',
  );
  const toast = useToast();
  const viewer = game.players.find((player) => player.id === viewerId);
  const phaseMeta = PHASE_META[game.phase] ?? PHASE_META.roleReveal;
  const reformsEnacted = game.enacted.democratic + game.enacted.fascist;
  const era: 'light' | 'dark' = game.firstThreeResolved ? 'dark' : 'light';
  const eraLabel =
    era === 'light'
      ? 'Saray Dönemi'
      : game.bigVezirOutcome === 'idam'
        ? 'Yas Gecesi'
        : 'Hüküm Gecesi';

  const closeVoteStage = useCallback(() => setVoteStageOpen(false), []);
  const closeNomineeStage = useCallback(() => setNomineeStageOpen(false), []);
  const closeNotrStage = useCallback(() => setNotrStageOpen(false), []);
  const closePolicyStage = useCallback(() => setPolicyStageOpen(false), []);
  const closePlayerCards = useCallback(() => {
    setPlayerCardsOpen(false);
    setPlayerCardsClosedFor(String(game.createdAt));
  }, [game.createdAt]);

  const viewerIsHost = isHost ?? view.isHost;
  const gatePhase =
    game.phase === 'voteResult' ||
    game.phase === 'policyReveal' ||
    game.phase === 'termEnd';
  const gateOpen = gatePhase && game.gateEndAt !== null;

  // Geçiş ekranlarındaki geri sayım. Kapı kapanana kadar her yarım saniyede
  // güncellenir; süre bitince host otomatik olarak devam eylemini gönderir.
  useEffect(() => {
    if (!gateOpen || !game.gateEndAt) {
      setGateSecondsLeft(null);
      return;
    }
    const tick = () => {
      setGateSecondsLeft(
        Math.max(0, Math.ceil((game.gateEndAt! - Date.now()) / 1000)),
      );
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [gateOpen, game.gateEndAt]);

  useEffect(() => {
    if (!viewerIsHost || !gateOpen || !game.gateEndAt) {
      gateSentRef.current = null;
      return;
    }
    const key = `${game.phase}:${game.gateEndAt}`;
    const delay = Math.max(0, game.gateEndAt - Date.now()) + 200;
    const timer = window.setTimeout(() => {
      if (gateSentRef.current === key) return;
      gateSentRef.current = key;
      onAction(
        game.phase === 'termEnd'
          ? { type: 'end_term' }
          : { type: 'continue' },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [viewerIsHost, gateOpen, game.gateEndAt, game.phase, onAction]);

  // Geçiş kapısı açıkken karar sahnelerinin üstte kalmasını engelle.
  useEffect(() => {
    if (!gatePhase) return;
    setVoteStageOpen(false);
    setNomineeStageOpen(false);
    setPolicyStageOpen(false);
    setNotrStageOpen(false);
  }, [gatePhase]);

  // Oylama sırası gelince merkez oylama kartı otomatik açılır; kapatılsa
  // bile yeni oylama turunda yeniden açılır.
  useEffect(() => {
    setVoteStageOpen(view.canVote);
  }, [view.canVote, game.round, game.chancellorId]);

  // Adaylık sırası Başkan'a geldiğinde seçim ekranın ortasında açılır.
  useEffect(() => {
    setNomineeStageOpen(view.canNominate);
  }, [view.canNominate, game.round]);

  // Kart eleme veya reform seçimi sırası geldiğinde mazbata sahnesi açılır.
  useEffect(() => {
    setPolicyStageOpen(view.canDiscard || view.canEnact);
  }, [view.canDiscard, view.canEnact, game.round, game.phase]);

  // Nötr'ün taraf seçimi sırası geldiğinde yol kartları ortada açılır.
  useEffect(() => {
    setNotrStageOpen(view.canChooseNotrSide);
  }, [view.canChooseNotrSide, game.round]);

  // Tema portal bileşenlerine de ulaşsın diye body üzerinde tutulur.
  useEffect(() => {
    document.body.dataset.era = era;
    const previous = eraRef.current;
    eraRef.current = era;
    if (previous === 'light' && era === 'dark') {
      setEraShift(true);
      const timer = window.setTimeout(() => setEraShift(false), 3200);
      return () => {
        window.clearTimeout(timer);
        delete document.body.dataset.era;
      };
    }
    return () => {
      delete document.body.dataset.era;
    };
  }, [era]);

  // Oyun açılırken oyuncu kartları bir kez gösterilir; kapatılınca rol
  // kartı açılır. Yeni oyunda (createdAt değişince) yeniden gösterilir.
  useEffect(() => {
    const key = String(game.createdAt);
    if (playerCardsAutoOpenRef.current === key) return;
    playerCardsAutoOpenRef.current = key;
    if (game.phase === 'roleReveal') setPlayerCardsOpen(true);
  }, [game.createdAt, game.phase]);

  // Oyuna girildiğinde rol kartı doğrudan ortada açılır; oyuncu kapatırsa
  // aynı oyun içinde tekrar kendiliğinden açılmaz. Oyuncu kartları
  // kapatılmadan rol kartı açılmaz.
  useEffect(() => {
    const key = `${game.createdAt}-${game.round}`;
    if (
      game.phase === 'roleReveal' &&
      !view.roleRevealAcknowledged &&
      playerCardsClosedFor === String(game.createdAt) &&
      roleAutoOpenRef.current !== key
    ) {
      roleAutoOpenRef.current = key;
      setRoleGate('reveal');
    }
  }, [
    game.phase,
    game.createdAt,
    game.round,
    view.roleRevealAcknowledged,
    playerCardsClosedFor,
  ]);

  const playerName = (id: string | null | undefined) =>
    game.players.find((player) => player.id === id)?.name ?? '—';

  const phaseNarrative: Partial<Record<string, string>> = {
    nomination: `${playerName(game.presidentId)} bir Başbakan adayı gösteriyor.`,
    voting: `${playerName(game.presidentId)} başkanlığında ${playerName(game.chancellorId)} hükümeti oylanıyor.`,
    voteResult: `${playerName(game.presidentId)} başkanlığında ${playerName(game.chancellorId)} hükümetinin oy sonucu açıklandı.`,
    presidentDiscard: `${playerName(game.presidentId)} üç reform kartından birini eliyor.`,
    chancellorEnact: `${playerName(game.chancellorId)} reformu yürürlüğe koyuyor.`,
    policyReveal: `${game.lastEnactedPolicy === 'otokrat' ? 'Otokrat' : 'Demokratik'} reform yürürlüğe girdi.`,
    peek: `${playerName(game.presidentId)} destenin üstündeki üç kartı inceliyor.`,
    assassination: `${playerName(game.presidentId)} bir suikast hedefi seçiyor.`,
    notrChoice: 'Nötr gizlice tarafını seçiyor.',
    termEnd: `Dönem ${game.round} tamamlandı; kapanış tutanağı bekleniyor.`,
    roleReveal: 'Roller dağıtıldı. Herkes rolünü görüyor.',
  };
  const phaseText = phaseNarrative[game.phase] ?? phaseMeta.description;

  const openRole = (preferred?: 'reveal' | 'inspect') => {
    if (preferred) {
      setRoleGate(preferred);
      return;
    }
    setRoleGate(
      game.phase === 'roleReveal' && !view.roleRevealAcknowledged
        ? 'reveal'
        : 'inspect',
    );
  };

  const copyInvite = async () => {
    if (!roomCode) return;
    const ok = await copyText(roomInviteUrl(roomCode));
    toast.push(
      ok ? 'Davet bağlantısı kopyalandı.' : 'Bağlantı kopyalanamadı. Kodu elle paylaşabilirsin.',
      ok ? 'success' : 'error',
    );
  };

  return (
    <div
      className={`game-screen game-screen--${era}${
        game.firstThreeResolved && game.bigVezirOutcome === 'idam'
          ? ' game-screen--mourning'
          : ''
      }`}
      data-era={era}
    >
      <div className={`era-ambience era-ambience--${era}`} aria-hidden="true">
        <span className="era-ambience__glow" />
        <span className="era-ambience__motes" />
      </div>
      <header className="game-topbar">
        <div className="game-topbar__left">
          <Logo compact />
          {roomCode ? (
            <button
              type="button"
              className="room-code-pill"
              onClick={copyInvite}
              title="Davet bağlantısını kopyala"
            >
              <span className="room-code-pill__label">Oda</span>
              <strong>{roomCode}</strong>
              <Copy size={13} />
            </button>
          ) : null}
          {connection ? <ConnectionPill connection={connection} /> : null}
          <span
            className={`era-chip era-chip--${era}`}
            title={
              era === 'light'
                ? 'Monarşi dönemi: sarayın ışıkları yanıyor.'
                : 'Monarşi sona erdi: hüküm gecesi başladı.'
            }
          >
            {era === 'light' ? <Sun size={13} /> : <Moon size={13} />}
            {eraLabel}
          </span>
        </div>

        <div className="game-topbar__right">
          {viewer ? (
            <span className="viewer-identity">
              <Avatar avatarId={viewer.avatarId} size="sm" ring="violet" />
              <span>{viewer.name}</span>
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlayerCardsOpen(true)}
            icon={<IdCard size={15} />}
            className="game-topbar__cards"
            aria-label="Oyuncu kartlarını gör"
          >
            Kartlar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openRole()}
            icon={<Eye size={15} />}
            className="game-topbar__role"
            aria-label="Rol kartını gör"
          >
            Rolüm
          </Button>
          <button
            type="button"
            className="icon-btn game-topbar__leave"
            onClick={() => setLeaveOpen(true)}
            aria-label="Odadan ayrıl"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="game-layout">
        <section className="table-stage">
          <div className="table-stage__head">
            <div className="table-stage__brand">
              <span className="table-stage__kicker">Dönem {game.round} tutanağı</span>
              <h1 className="table-stage__title">Masa</h1>
            </div>
            <div className="table-stage__meta">
              <span className="table-stat">
                <Users size={13} />
                <strong>{game.livingPlayers}</strong> / {game.totalPlayers} hayatta
              </span>
              <span className="table-stat">
                <ScrollText size={13} />
                <strong>{reformsEnacted}</strong> reform
              </span>
              {game.phase === 'voting' ? (
                <span className="table-stat table-stat--vote">
                  <Vote size={13} />
                  <strong>{game.votesSubmitted}</strong> / {game.totalVoters} oy
                </span>
              ) : null}
              {game.openVoting ? (
                <span className="table-stat table-stat--open">
                  <Eye size={13} />
                  Açık oylama
                </span>
              ) : null}
            </div>
          </div>

          <PlayerCircle game={game} viewerId={viewerId} />
        </section>

        <section className="phase-band" aria-label={phaseMeta.title} aria-live="polite">
          <span className="phase-band__round">Dönem {game.round}</span>
          <div className="phase-band__main">
            <h2>{phaseMeta.title}</h2>
            <p>{phaseText}</p>
          </div>
          <div className="phase-band__stats">
            <span>
              <strong>{game.failedVotes}</strong>/3 ret
            </span>
            <span>
              <strong>{game.deckCount}</strong> deste
            </span>
            <span>
              <strong>{game.discardCount}</strong> atık
            </span>
            <span
              className={
                game.openVoting
                  ? 'phase-band__vote-mode phase-band__vote-mode--open'
                  : 'phase-band__vote-mode'
              }
            >
              {game.openVoting ? 'Açık oylama' : 'Gizli oylama'}
            </span>
          </div>
        </section>

        <section className="policy-board" aria-label="Reform tahtası">
          <header className="policy-board__head">
            <div className="policy-board__pile">
              <span className="deck-art" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <div>
                <span className="policy-board__pile-label">Deste</span>
                <strong>{game.deckCount}</strong>
              </div>
            </div>

            <div className="policy-board__title">
              <span>Reform Tahtası</span>
              <strong>HÜKÜM</strong>
            </div>

            <div className="policy-board__pile policy-board__pile--right">
              <div>
                <span className="policy-board__pile-label">Atık</span>
                <strong>{game.discardCount}</strong>
              </div>
              <span className="deck-art deck-art--discard" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </div>
          </header>

          <div className="game-tracks">
            <PolicyTrack
              type="demokratik"
              enacted={game.enacted.democratic}
              length={game.democraticWinThreshold}
            />
            <PolicyTrack
              type="otokrat"
              enacted={game.enacted.fascist}
              length={game.fascistTrackLength}
              labels={FASCIST_TRACK_LABELS}
            />
          </div>
        </section>

        <div className="game-columns">
          <div className="game-center">
            <ActionPanel
              game={game}
              view={view}
              onAction={onAction}
              actionPending={actionPending}
              error={error}
              onDismissError={onDismissError}
              onOpenRole={() => openRole()}
              onOpenVoteStage={view.canVote ? () => setVoteStageOpen(true) : undefined}
              onOpenNomineeStage={
                view.canNominate ? () => setNomineeStageOpen(true) : undefined
              }
              onOpenPolicyStage={
                view.canDiscard || view.canEnact
                  ? () => setPolicyStageOpen(true)
                  : undefined
              }
              onOpenNotrStage={
                view.canChooseNotrSide
                  ? () => setNotrStageOpen(true)
                  : undefined
              }
            />
          </div>

          <aside className="game-rail">
            <GovernmentPanel game={game} />
            <PowerPanel
              view={view}
              game={game}
              onAction={onAction}
              disabled={actionPending}
            />
            <GameLog entries={game.log} />
          </aside>
        </div>
      </main>

      <EventBanner entries={game.log.filter((entry) => entry.kind === 'bot')} />

      <EventStage
        entries={game.log}
        gameKey={String(game.createdAt)}
        round={game.round}
        paused={
          roleGate !== null ||
          leaveOpen ||
          playerCardsOpen ||
          nomineeStageOpen ||
          voteStageOpen ||
          policyStageOpen ||
          notrStageOpen ||
          gateOpen ||
          game.phase === 'gameOver'
        }
      />

      {game.phase === 'voteResult' ? (
        <VoteResultStage
          game={game}
          onAction={onAction}
          actionPending={actionPending}
          error={error}
          canContinue={view.canContinue}
          secondsLeft={gateSecondsLeft}
        />
      ) : null}

      {game.phase === 'policyReveal' ? (
        <PolicyRevealStage
          game={game}
          onAction={onAction}
          actionPending={actionPending}
          error={error}
          canContinue={view.canContinue}
          secondsLeft={gateSecondsLeft}
        />
      ) : null}

      {game.phase === 'termEnd' ? (
        <TermSummaryStage
          game={game}
          onAction={onAction}
          actionPending={actionPending}
          error={error}
          canEndTerm={view.canEndTerm}
          secondsLeft={gateSecondsLeft}
        />
      ) : null}

      <VoteStage
        game={game}
        view={view}
        onAction={onAction}
        actionPending={actionPending}
        error={error}
        open={voteStageOpen}
        onClose={closeVoteStage}
      />

      <NomineeStage
        game={game}
        view={view}
        onAction={onAction}
        actionPending={actionPending}
        error={error}
        open={nomineeStageOpen}
        onClose={closeNomineeStage}
      />

      <NotrStage
        game={game}
        view={view}
        onAction={onAction}
        actionPending={actionPending}
        error={error}
        open={notrStageOpen}
        onClose={closeNotrStage}
      />

      <PolicyStage
        game={game}
        view={view}
        onAction={onAction}
        actionPending={actionPending}
        error={error}
        open={policyStageOpen}
        onClose={closePolicyStage}
      />

      {eraShift ? (
        <div
          className={`era-shift${
            game.bigVezirOutcome === 'idam' ? ' era-shift--idam' : ''
          }`}
          aria-hidden="true"
        >
          <span className="era-shift__light" />
          <span className="era-shift__dark" />
          <span className="era-shift__line" />
        </div>
      ) : null}

      <PlayerCardGallery
        open={playerCardsOpen}
        onClose={closePlayerCards}
      />

      <PrivacyGate
        open={roleGate !== null}
        role={view.role}
        view={view}
        players={game.players}
        mode={roleGate ?? 'inspect'}
        acknowledged={view.roleRevealAcknowledged}
        onClose={() => setRoleGate(null)}
        onAcknowledge={() => onAction({ type: 'ack_role' })}
      />

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="Odadan ayrıl?"
        eyebrow="Bağlantı"
        subtitle="Oturumun bu cihazdan kapatılacak. Oyun sırasında ayrılırsan rolün bot tarafından devralınır."
        size="sm"
        footer={
          <div className="modal-actions">
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLeaveOpen(false);
                onLeave();
              }}
              icon={<LogOut size={16} />}
            >
              Ayrıl
            </Button>
          </div>
        }
      >
        <p className="muted">
          Bağlantın koparsa oturumun cihazda kalır ve ana sayfadaki “Devam eden
          oda” kartından dönebilirsin. “Ayrıl” seçersen oturum silinir; oyun
          sırasındaysa yerini bot alır.
        </p>
      </Modal>

      {game.phase === 'gameOver' ? (
        <EndScreen
          game={game}
          viewerId={viewerId}
          isHost={isHost ?? view.isHost}
          onRestart={onRestart}
          onLeave={onLeave}
          onOpenRole={() => openRole('inspect')}
          restartPending={restartPending}
        />
      ) : null}
    </div>
  );
}
