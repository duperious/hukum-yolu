import {
  botChooseAssassinationTarget,
  botChooseBlockTarget,
  botChooseChancellorEnact,
  botChooseInvestigationTarget,
  botChooseNomination,
  botChooseNotrSide,
  botChoosePresidentDiscard,
  botChooseVote,
  botMaybeSpeak,
} from '../bots';
import { GAME_CONFIG, getInvestigationResult, getRoleCounts } from './config';
import {
  alivePlayers,
  countFirstThree,
  firstLiving,
  getEligibleChancellorIds,
  getPlayer,
  getRoleComposition,
  getTotalReforms,
  getVotePower,
  isAlive,
  isOpenVoting,
  isTermLimitRelaxed,
  nextLivingAfter,
  policyLabel,
  requirePlayer,
  roleHolder,
  roleHolderId,
} from './helpers';
import { baseTeamForRole } from './roles';
import { ROLE_ORDER } from './config';
import { pick, secureRng, shuffle } from './rng';
import type {
  GameAction,
  GameState,
  LogKind,
  NotrSide,
  Player,
  PolicyCard,
  PurgeScenario,
  Role,
  StartGameInput,
  Winner,
  VoteTally,
} from './types';

export class GameError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

interface PolicyMeta {
  presidentId: string;
  chancellorId: string;
  auto: boolean;
}

/** Sonuç, reform ve dönem kapanışı ekranlarının otomatik ilerleme süresi. */
export const GATE_AUTO_MS = 45_000;

function gateDeadline(now = Date.now()): number {
  return now + GATE_AUTO_MS;
}

function makeId(prefix: string): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function cloneState(state: GameState): GameState {
  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function addLog(state: GameState, kind: LogKind, text: string): void {
  state.log.push({
    id: makeId('log'),
    round: state.round,
    at: Date.now(),
    kind,
    text,
  });
  if (state.log.length > 260) {
    state.log = state.log.slice(-260);
  }
}

function touch(state: GameState): void {
  state.updatedAt = Date.now();
  state.version += 1;
}

function createDeck(rng: () => number): PolicyCard[] {
  const cards: PolicyCard[] = [];
  for (let i = 0; i < GAME_CONFIG.deck.democratic; i += 1) cards.push('demokratik');
  for (let i = 0; i < GAME_CONFIG.deck.fascist; i += 1) cards.push('otokrat');
  return shuffle(cards, rng);
}

function ensureDeck(state: GameState, count: number, rng: () => number): void {
  if (state.deck.length >= count) return;
  if (state.discardPile.length === 0) {
    throw new GameError('DECK_EMPTY', 'Destede yeterli reform kartı kalmadı.');
  }
  state.deck = shuffle([...state.deck, ...state.discardPile], rng);
  state.discardPile = [];
  if (state.deck.length < count) {
    throw new GameError('DECK_EMPTY', 'Destede yeterli reform kartı kalmadı.');
  }
}

function drawCards(state: GameState, count: number, rng: () => number): PolicyCard[] {
  ensureDeck(state, count, rng);
  return state.deck.splice(0, count);
}

function drawOne(state: GameState, rng: () => number): PolicyCard {
  return drawCards(state, 1, rng)[0];
}

function rolePoolFor(totalPlayers: number): Role[] {
  const counts = getRoleCounts(totalPlayers);
  const pool: Role[] = [];
  for (const role of ROLE_ORDER) {
    for (let i = 0; i < counts[role]; i += 1) pool.push(role);
  }
  return pool;
}

/**
 * Yeni bir oyun kurar. Roller burada, sunucu tarafında (veya yerel test
 * modunda bellekte) rastgele dağıtılır. İstemciden rol kabul edilmez.
 */
export function startGame(input: StartGameInput): GameState {
  const rng = input.rng ?? secureRng();
  const now = input.now ?? Date.now();
  const total = input.players.length;
  if (total < GAME_CONFIG.minPlayers || total > GAME_CONFIG.maxPlayers) {
    throw new GameError(
      'PLAYER_COUNT',
      `Oyun ${GAME_CONFIG.minPlayers}-${GAME_CONFIG.maxPlayers} oyuncu ile oynanır.`,
    );
  }
  if (new Set(input.players.map((p) => p.id)).size !== total) {
    throw new GameError('DUPLICATE_PLAYER', 'Oyuncu kimlikleri benzersiz olmalıdır.');
  }

  const roles = shuffle(rolePoolFor(total), rng);
  const players: Player[] = input.players.map((p, index) => {
    const role = roles[index];
    return {
      ...p,
      role,
      alive: true,
      votePower: role === 'buyuk_vezir' ? 2 : 1,
      effectiveTeam: baseTeamForRole(role),
    };
  });

  const leader = players.find((p) => p.role === 'otokrat_lider');
  if (!leader) {
    throw new GameError('ROLE_ASSIGNMENT', 'Otokrat Lider atanamadı.');
  }
  const intelligence = players.find((p) => p.role === 'istihbarat_baskani');
  const startPresident = pick(players, rng);

  const state: GameState = {
    id: input.id ?? makeId('game'),
    mode: input.mode,
    phase: 'roleReveal',
    players,
    playerOrder: [...players].sort((a, b) => a.joinedAt - b.joinedAt).map((p) => p.id),
    round: 0,
    presidentId: null,
    chancellorId: null,
    previousChancellorId: null,
    votes: {},
    blockedVotePlayerId: null,
    failedVotes: 0,
    deck: createDeck(rng),
    discardPile: [],
    enacted: { democratic: 0, fascist: 0 },
    policyHistory: [],
    governmentHistory: [],
    log: [],
    leaderId: leader.id,
    leadershipTransferred: false,
    notrSide: null,
    notrChoicePending: false,
    democraticPartyPresidentId: null,
    intelligenceOfficeHolderId: intelligence?.id ?? null,
    firstThreeResolved: false,
    bigVezirOutcome: null,
    publiclyRevealedRoles: {},
    pendingPeek: null,
    pendingAssassination: null,
    pendingBlock: null,
    legislative: null,
    investigations: {},
    investigatedThisRound: {},
    roleRevealAcknowledged: [],
    winner: null,
    winReason: null,
    winnerIds: [],
    revealedRoles: null,
    startPresidentId: startPresident.id,
    lastVoteResult: null,
    lastVoteTally: null,
    lastVoteOpen: false,
    lastGovernment: null,
    pendingPolicy: null,
    lastEnactedPolicy: null,
    lastPolicyAuto: false,
    termSummary: null,
    gateEndAt: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  addLog(
    state,
    'system',
    `Oyun başladı. ${total} oyuncu. Roller gizlice dağıtıldı; kimse başka birinin rolünü göremez.`,
  );
  return state;
}

/** Aynı oyuncu listesiyle rolleri, desteyi ve tüm geçmişi sıfırlar. */
export function restartGame(state: GameState, rng: () => number = secureRng()): GameState {
  return startGame({
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      isBot: p.isBot,
      isHost: p.isHost,
      joinedAt: p.joinedAt,
    })),
    mode: state.mode,
    rng,
  });
}

function startRound(state: GameState): void {
  state.round += 1;
  const previousPresident = state.presidentId;
  const nextPresident =
    state.round === 1
      ? state.startPresidentId
      : nextLivingAfter(state, previousPresident) ?? firstLiving(state);
  state.presidentId = nextPresident;
  state.chancellorId = null;
  state.votes = {};
  state.blockedVotePlayerId = null;
  state.legislative = null;
  state.investigatedThisRound = {};
  state.phase = 'nomination';
  state.lastVoteTally = null;
  state.lastVoteOpen = false;
  state.pendingPolicy = null;
  state.lastEnactedPolicy = null;
  state.lastPolicyAuto = false;
  state.termSummary = null;
  state.gateEndAt = null;

  if (state.pendingBlock) {
    const holder = getPlayer(state, state.pendingBlock.playerId);
    if (
      !holder?.alive ||
      state.pendingBlock.used ||
      state.pendingBlock.usableRound < state.round
    ) {
      state.pendingBlock = null;
    }
  }

  const president = getPlayer(state, nextPresident);
  addLog(state, 'system', `Dönem ${state.round} başladı. Başkan: ${president?.name ?? '—'}.`);
}

export function getInvestigateTargets(state: GameState, actorId: string): string[] {
  return alivePlayers(state)
    .filter((p) => p.id !== actorId)
    .map((p) => p.id);
}

export function getAssassinationTargets(state: GameState, actorId: string): string[] {
  return alivePlayers(state)
    .filter((p) => p.id !== actorId)
    .map((p) => p.id);
}

export function canInvestigateNow(state: GameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player?.alive) return false;
  if (state.intelligenceOfficeHolderId !== playerId) return false;
  if (state.enacted.fascist < GAME_CONFIG.powers.investigationAtFascist) return false;
  if (!['nomination', 'voting', 'presidentDiscard', 'chancellorEnact'].includes(state.phase)) {
    return false;
  }
  return (state.investigatedThisRound[playerId]?.length ?? 0) === 0;
}

export function canUseBlockNow(state: GameState, playerId: string): boolean {
  const pending = state.pendingBlock;
  if (!pending) return false;
  if (pending.playerId !== playerId || pending.used) return false;
  if (pending.usableRound !== state.round) return false;
  if (!isAlive(state, playerId)) return false;
  if (!['nomination', 'voting'].includes(state.phase)) return false;
  if (state.blockedVotePlayerId) return false;
  return true;
}

function allPlayersAreBots(state: GameState): boolean {
  return state.players.every((player) => player.isBot);
}

/**
 * Sonuç ve reform kapılarını kimse kapatmazsa host 45 saniye sonra ilerletir.
 * Bu yüzden kapıyı önce Başkan (reformda Başbakan da), yoksa host kapatabilir.
 */
export function canAdvanceGate(state: GameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player) return false;
  if (player.isHost) return true;
  if (allPlayersAreBots(state)) return true;
  if (state.phase === 'voteResult') return state.presidentId === playerId;
  if (state.phase === 'policyReveal') {
    return (
      state.presidentId === playerId ||
      state.pendingPolicy?.chancellorId === playerId
    );
  }
  return false;
}

/** Dönem özetini önce Başkan kapatır; Başkan kapatmazsa host devreye girer. */
export function canEndTermNow(state: GameState, playerId: string): boolean {
  const player = getPlayer(state, playerId);
  if (!player) return false;
  if (state.phase !== 'termEnd') return false;
  return player.isHost || state.presidentId === playerId || allPlayersAreBots(state);
}

function computeWinnerIds(state: GameState, winner: Winner): string[] {
  if (winner === 'demokrat') {
    return state.players.filter((p) => p.effectiveTeam === 'demokrat').map((p) => p.id);
  }
  if (winner === 'otokrat') {
    return state.players
      .filter((p) => p.role === 'otokrat_lider' || p.role === 'otokrat')
      .map((p) => p.id);
  }
  return state.players.filter((p) => p.role === 'notr').map((p) => p.id);
}

function endGame(
  state: GameState,
  winner: Winner,
  reason: string,
  winnerIds: string[],
): void {
  if (state.phase === 'gameOver') return;
  state.phase = 'gameOver';
  state.winner = winner;
  state.winReason = reason;
  state.winnerIds = winnerIds;
  state.termSummary = null;
  state.pendingPolicy = null;
  state.gateEndAt = null;
  state.revealedRoles = Object.fromEntries(state.players.map((p) => [p.id, p.role]));
  const label =
    winner === 'demokrat' ? 'Demokratlar' : winner === 'otokrat' ? 'Otokratlar' : 'Nötr (kişisel zafer)';
  addLog(state, 'win', `Oyun sona erdi. Kazanan: ${label}. ${reason}`);
}

function reassignOffices(state: GameState): void {
  const notr = roleHolder(state, 'notr');
  const intel = roleHolder(state, 'istihbarat_baskani');
  const bigVezir = roleHolder(state, 'buyuk_vezir');

  if (
    !state.democraticPartyPresidentId ||
    !isAlive(state, state.democraticPartyPresidentId)
  ) {
    const candidates = [notr, intel, bigVezir];
    const next = candidates.find(
      (p) =>
        p &&
        p.alive &&
        (p.role !== 'buyuk_vezir' || p.effectiveTeam === 'demokrat'),
    );
    state.democraticPartyPresidentId = next?.id ?? null;
  }

  if (
    !state.intelligenceOfficeHolderId ||
    !isAlive(state, state.intelligenceOfficeHolderId)
  ) {
    const dpp = getPlayer(state, state.democraticPartyPresidentId);
    state.intelligenceOfficeHolderId = dpp?.alive ? dpp.id : null;
  }
}

function checkPurgeVictory(state: GameState): boolean {
  const notr = roleHolder(state, 'notr');
  if (!notr?.alive) return false;
  if (state.notrSide !== 'kirmizi') return false;
  if (state.leaderId !== notr.id) return false;
  if (!state.leadershipTransferred) return false;

  const bigVezir = roleHolder(state, 'buyuk_vezir');
  const bigAlive = Boolean(bigVezir?.alive);
  const scenario: PurgeScenario = bigAlive
    ? 'vezir_hayatta_kirmizi'
    : 'vezir_olu_kirmizi';
  const targets = GAME_CONFIG.purgeTargets[scenario];
  const allDead = targets.every((role) => {
    const holder = roleHolder(state, role);
    return !holder || !holder.alive;
  });
  if (allDead) {
    endGame(
      state,
      'notr',
      'Tasfiye hedefleri tamamlandı. Nötr kişisel zaferini kazandı; diğer oyuncular kaybetti.',
      [notr.id],
    );
    return true;
  }
  return false;
}

function grantThirdFascistPower(state: GameState, rng: () => number): void {
  const presidentId = state.presidentId;
  if (!presidentId) return;
  if (state.players.length <= GAME_CONFIG.powers.thirdReformPeekMaxPlayers) {
    ensureDeck(state, 3, rng);
    const cards = state.deck.splice(0, 3);
    state.pendingPeek = { presidentId, cards };
    addLog(
      state,
      'power',
      'Üçüncü Otokrat Reform: Başkan destenin üstündeki üç kartı inceleyecek.',
    );
  } else {
    state.pendingBlock = {
      playerId: presidentId,
      usableRound: state.round + 1,
      used: false,
    };
    addLog(
      state,
      'power',
      'Üçüncü Otokrat Reform: Başkan, bir sonraki hükümet oylamasında bir oyuncunun oyunu engelleme yetkisi kazandı.',
    );
  }
}

function resolveFirstThree(state: GameState): void {
  if (state.firstThreeResolved) return;
  state.firstThreeResolved = true;
  const { democratic, fascist } = countFirstThree(state);
  const bigVezir = roleHolder(state, 'buyuk_vezir');
  const notr = roleHolder(state, 'notr');
  const intel = roleHolder(state, 'istihbarat_baskani');

  if (democratic > fascist) {
    state.bigVezirOutcome = 'demokrat';
    if (bigVezir?.alive) {
      bigVezir.effectiveTeam = 'demokrat';
      bigVezir.votePower = 1;
      state.democraticPartyPresidentId = bigVezir.id;
      state.publiclyRevealedRoles[bigVezir.id] = 'buyuk_vezir';
      addLog(
        state,
        'transition',
        'Monarşi sona erdi. Büyük Vezir Demokratik tarafa geçti ve Demokrat Parti Başkanı oldu.',
      );
    } else {
      if (bigVezir) bigVezir.effectiveTeam = 'demokrat';
      state.democraticPartyPresidentId = notr?.alive
        ? notr.id
        : intel?.alive
          ? intel.id
          : null;
      addLog(
        state,
        'transition',
        'Monarşi sona erdi. Büyük Vezir görevini sürdüremedi.',
      );
    }
  } else {
    state.bigVezirOutcome = 'idam';
    if (bigVezir?.alive) {
      bigVezir.alive = false;
      bigVezir.votePower = 0;
      bigVezir.effectiveTeam = 'monarsi';
      state.publiclyRevealedRoles[bigVezir.id] = 'buyuk_vezir';
      addLog(
        state,
        'transition',
        'Monarşi sona erdi. Büyük Vezir idam edildi. Rolü açıklandı: Büyük Vezir.',
      );
    } else {
      if (bigVezir) bigVezir.effectiveTeam = 'monarsi';
      addLog(
        state,
        'transition',
        'Monarşi sona erdi. Büyük Vezir koltuğu boştu.',
      );
    }
    state.democraticPartyPresidentId = notr?.alive
      ? notr.id
      : intel?.alive
        ? intel.id
        : null;
  }

  if (notr?.alive) {
    state.notrChoicePending = true;
  } else {
    state.notrChoicePending = false;
    state.notrSide = null;
  }

  reassignOffices(state);
}

function applyNotrChoiceMut(state: GameState, side: NotrSide, rng: () => number): void {
  const notr = roleHolder(state, 'notr');
  if (!notr?.alive) {
    throw new GameError('NOTR_DEAD', 'Nötr hayatta değil.');
  }
  if (!state.notrChoicePending || state.notrSide !== null) {
    throw new GameError('NOTR_CHOICE_DONE', 'Nötr taraf seçimini zaten yaptı.');
  }
  state.notrSide = side;
  state.notrChoicePending = false;
  notr.effectiveTeam = side === 'mavi' ? 'demokrat' : 'otokrat';

  const bigVezir = roleHolder(state, 'buyuk_vezir');
  if (!bigVezir?.alive && side === 'kirmizi') {
    // Bu devir gizli tutulur; oyun günlüğüne yazılmaz.
    state.intelligenceOfficeHolderId = notr.id;
  }
  addLog(state, 'transition', 'Nötr tarafını seçti.');
  reassignOffices(state);
  advanceAfterEffects(state, rng);
}

function openTermEnd(state: GameState): void {
  if (state.phase === 'gameOver') return;
  const nextPresidentId = nextLivingAfter(state, state.presidentId);
  const notes = state.log
    .filter(
      (entry) =>
        entry.round === state.round &&
        (entry.kind === 'transition' ||
          entry.kind === 'power' ||
          entry.kind === 'death'),
    )
    .map((entry) => entry.text)
    .slice(-4);

  state.phase = 'termEnd';
  state.pendingPolicy = null;
  state.termSummary = {
    round: state.round,
    presidentId: state.lastGovernment?.presidentId ?? state.presidentId ?? '',
    chancellorId:
      state.lastGovernment?.chancellorId ?? state.chancellorId ?? null,
    voteResult: state.lastVoteResult,
    tally: state.lastVoteTally ? { ...state.lastVoteTally } : null,
    openVoting: state.lastVoteOpen,
    policy: state.lastEnactedPolicy,
    policyAuto: state.lastPolicyAuto,
    failedVotes: state.failedVotes,
    outcome: state.lastPolicyAuto
      ? 'autoPolicy'
      : state.lastEnactedPolicy
        ? 'legislative'
        : 'rejected',
    nextPresidentId,
    notes,
    endedAt: Date.now(),
  };
  state.gateEndAt = gateDeadline();
  addLog(
    state,
    'system',
    `Dönem ${state.round} kapandı. ${
      state.lastEnactedPolicy
        ? `${policyLabel(state.lastEnactedPolicy)} yürürlüğe girdi. `
        : ''
    }Sıradaki Başkan: ${getPlayer(state, nextPresidentId)?.name ?? '—'}.`,
  );
}

function advanceAfterEffects(state: GameState, rng: () => number): void {
  if (state.phase === 'gameOver') return;

  if (state.notrChoicePending) {
    state.phase = 'notrChoice';
    return;
  }

  if (state.pendingPeek) {
    if (!isAlive(state, state.pendingPeek.presidentId)) {
      state.deck.unshift(...state.pendingPeek.cards);
      state.pendingPeek = null;
      addLog(
        state,
        'power',
        'Kart inceleme yetkisi, yetkili oyuncu hayatta olmadığı için kullanılamadı.',
      );
    } else {
      state.phase = 'peek';
      return;
    }
  }

  if (state.pendingAssassination) {
    const presidentId = state.pendingAssassination.presidentId;
    const hasTarget = alivePlayers(state).some((p) => p.id !== presidentId);
    if (!isAlive(state, presidentId)) {
      state.pendingAssassination = null;
      addLog(
        state,
        'power',
        'Suikast yetkisi, yetkili oyuncu hayatta olmadığı için kullanılamadı.',
      );
    } else if (!hasTarget) {
      state.pendingAssassination = null;
      addLog(
        state,
        'power',
        'Suikast için uygun hedef kalmadığı için yetki kullanılamadı.',
      );
    } else {
      state.phase = 'assassination';
      return;
    }
  }

  if (state.pendingBlock && !isAlive(state, state.pendingBlock.playerId)) {
    state.pendingBlock = null;
  }

  openTermEnd(state);
}

function ackRoleMut(state: GameState, actorId: string): void {
  if (state.phase !== 'roleReveal') {
    throw new GameError('WRONG_PHASE', 'Roller bu aşamada açıklanmıyor.');
  }
  const actor = requirePlayer(state, actorId);
  if (!state.roleRevealAcknowledged.includes(actor.id)) {
    state.roleRevealAcknowledged.push(actor.id);
  }
  const allAcknowledged = state.players.every((p) =>
    state.roleRevealAcknowledged.includes(p.id),
  );
  if (allAcknowledged) {
    startRound(state);
  }
}

function nominateMut(state: GameState, actorId: string, targetId: string): void {
  if (state.phase !== 'nomination') {
    throw new GameError('WRONG_PHASE', 'Şu anda Başbakan adaylığı aşaması değil.');
  }
  if (state.presidentId !== actorId) {
    throw new GameError('NOT_PRESIDENT', 'Başbakan adayını yalnızca Başkan gösterebilir.');
  }
  const president = requirePlayer(state, actorId);
  if (!president.alive) {
    throw new GameError('DEAD', 'Ölü oyuncular aday gösteremez.');
  }
  const target = requirePlayer(state, targetId);
  if (!target.alive) {
    throw new GameError('TARGET_DEAD', 'Ölü bir oyuncu aday gösterilemez.');
  }
  const eligible = getEligibleChancellorIds(state);
  if (!eligible.includes(targetId)) {
    throw new GameError('INELIGIBLE', 'Bu oyuncu Başbakan adayı olamaz.');
  }
  if (isTermLimitRelaxed(state, targetId)) {
    addLog(
      state,
      'system',
      'Uygun aday kalmadığı için Başbakan adaylığı kısıtı gevşetildi.',
    );
  }
  state.chancellorId = targetId;
  state.phase = 'voting';
  state.votes = {};
  addLog(
    state,
    'government',
    `Başkan ${president.name}, ${target.name}’i Başbakan adayı gösterdi.`,
  );
}

function resolveVote(state: GameState, rng: () => number): void {
  const living = alivePlayers(state);
  const blockedId = state.blockedVotePlayerId;
  const entries: VoteTally['entries'] = [];
  let yes = 0;
  let no = 0;
  for (const player of living) {
    const choice = state.votes[player.id];
    if (choice === undefined) return;
    let weight = getVotePower(player);
    if (player.id === blockedId) weight = 0;
    if (choice) yes += weight;
    else no += weight;
    entries.push({ playerId: player.id, choice, weight });
  }

  const accepted = yes > no;
  const open = isOpenVoting(state);
  state.lastVoteResult = accepted ? 'kabul' : 'ret';
  state.lastVoteTally = {
    yes,
    no,
    blockedPlayerId: blockedId,
    entries,
  };
  state.lastVoteOpen = open;
  state.lastGovernment = {
    presidentId: state.presidentId ?? '',
    chancellorId: state.chancellorId ?? '',
  };
  const chancellorName = getPlayer(state, state.chancellorId ?? '')?.name ?? 'Bilinmeyen';
  addLog(
    state,
    'vote',
    accepted
      ? `Hükümet kabul edildi. Başbakan: ${chancellorName}. Oylar kullanıldı — Evet: ${yes}, Hayır: ${no}.`
      : `Hükümet reddedildi. Başbakan: ${chancellorName}. Oylar kullanıldı — Evet: ${yes}, Hayır: ${no}.`,
  );
  if (state.pendingBlock) state.pendingBlock = null;
  maybeBotSpeakAfterEvent(state, rng);

  state.phase = 'voteResult';
  state.gateEndAt = gateDeadline();
}

function checkLeaderChancellorWin(state: GameState): boolean {
  const presidentId = state.presidentId;
  const chancellorId = state.chancellorId;
  if (!presidentId || !chancellorId) return false;
  if (state.enacted.fascist < GAME_CONFIG.powers.leaderChancellorAtFascist) {
    return false;
  }
  if (chancellorId !== state.leaderId) return false;
  state.previousChancellorId = chancellorId;

  const notrId = roleHolderId(state, 'notr');
  if (state.leaderId === notrId) {
    endGame(
      state,
      'notr',
      'Kırmızı Nötr, liderliği devraldıktan sonra Başbakan seçildi ve kişisel zaferini kazandı.',
      [state.leaderId],
    );
  } else {
    endGame(
      state,
      'otokrat',
      'Otokrat Lider, 4. Otokrat Reform’dan sonra Başbakan seçildi. Otokratlar kazandı.',
      computeWinnerIds(state, 'otokrat'),
    );
  }
  return true;
}

/** Sonuç kapısını kapatır ve bir sonraki aşamaya geçer. */
function advanceVoteResultMut(state: GameState, rng: () => number): void {
  state.gateEndAt = null;
  if (state.lastVoteResult === 'kabul') {
    state.failedVotes = 0;
    if (checkLeaderChancellorWin(state)) return;
    startLegislative(state, rng);
    return;
  }

  state.failedVotes += 1;
  addLog(
    state,
    'vote',
    `Üst üste reddedilen hükümet: ${state.failedVotes}/${GAME_CONFIG.failedGovernmentLimit}.`,
  );

  if (state.failedVotes >= GAME_CONFIG.failedGovernmentLimit) {
    state.failedVotes = 0;
    const card = drawOne(state, rng);
    addLog(
      state,
      'policy',
      `Üç kez üst üste reddedilen hükümet nedeniyle destenin üstündeki kart yürürlüğe girdi: ${policyLabel(card)}.`,
    );
    enactPolicy(
      state,
      card,
      {
        presidentId: state.presidentId ?? '',
        chancellorId: state.chancellorId ?? '',
        auto: true,
      },
      rng,
    );
    return;
  }

  startRound(state);
}

function advanceGateMut(state: GameState, rng: () => number): void {
  if (state.phase === 'voteResult') {
    advanceVoteResultMut(state, rng);
    return;
  }
  if (state.phase === 'policyReveal') {
    const pending = state.pendingPolicy;
    if (!pending) {
      throw new GameError('STATE', 'Yürürlüğe giren reform bilgisi bulunamadı.');
    }
    resolvePolicyEffects(state, pending.card, pending, rng);
    return;
  }
  throw new GameError('WRONG_PHASE', 'Şu anda kapatılacak bir geçiş kapısı yok.');
}

function endTermMut(state: GameState): void {
  if (state.phase !== 'termEnd') {
    throw new GameError('WRONG_PHASE', 'Dönem kapanış aşaması değil.');
  }
  startRound(state);
}

function startLegislative(state: GameState, rng: () => number): void {
  const presidentId = state.presidentId;
  const chancellorId = state.chancellorId;
  if (!presidentId || !chancellorId) {
    throw new GameError('STATE', 'Hükümet bilgisi eksik.');
  }
  const cards = drawCards(state, GAME_CONFIG.drawCount, rng);
  state.legislative = {
    presidentId,
    chancellorId,
    presidentCards: cards,
    chancellorCards: null,
    presidentDiscard: null,
  };
  state.phase = 'presidentDiscard';
  addLog(
    state,
    'government',
    `${getPlayer(state, presidentId)?.name ?? 'Başkan'} desteden üç reform kartı çekti.`,
  );
}

function presidentDiscardMut(
  state: GameState,
  actorId: string,
  card: PolicyCard,
): void {
  if (state.phase !== 'presidentDiscard' || !state.legislative) {
    throw new GameError('WRONG_PHASE', 'Kart eleme aşaması değil.');
  }
  if (state.legislative.presidentId !== actorId) {
    throw new GameError('NOT_PRESIDENT', 'Kartı yalnızca Başkan eleyebilir.');
  }
  const index = state.legislative.presidentCards.indexOf(card);
  if (index < 0) {
    throw new GameError('CARD_NOT_FOUND', 'Bu kart elinizde değil.');
  }
  const remaining = [...state.legislative.presidentCards];
  remaining.splice(index, 1);
  state.discardPile.push(card);
  state.legislative.presidentDiscard = card;
  state.legislative.chancellorCards = remaining;
  state.legislative.presidentCards = [];
  state.phase = 'chancellorEnact';
  const presidentName = getPlayer(state, actorId)?.name ?? 'Başkan';
  const chancellorName =
    getPlayer(state, state.legislative.chancellorId ?? '')?.name ?? 'Başbakan';
  addLog(
    state,
    'government',
    `Başkan ${presidentName} bir reform kartını eledi; kalan iki kart Başbakan ${chancellorName} için ayrıldı.`,
  );
  addLog(
    state,
    'government',
    `Başbakan ${chancellorName} kalan iki reform kartını değerlendiriyor.`,
  );
}

function chancellorEnactMut(
  state: GameState,
  actorId: string,
  card: PolicyCard,
  rng: () => number,
): void {
  if (state.phase !== 'chancellorEnact' || !state.legislative) {
    throw new GameError('WRONG_PHASE', 'Reform yürürlüğe koyma aşaması değil.');
  }
  if (state.legislative.chancellorId !== actorId) {
    throw new GameError('NOT_CHANCELLOR', 'Kartı yalnızca Başbakan yürürlüğe koyabilir.');
  }
  const cards = state.legislative.chancellorCards;
  if (!cards) {
    throw new GameError('STATE', 'Başbakan kartları bulunamadı.');
  }
  const index = cards.indexOf(card);
  if (index < 0) {
    throw new GameError('CARD_NOT_FOUND', 'Bu kart elinizde değil.');
  }
  const other = cards[index === 0 ? 1 : 0];
  state.discardPile.push(other);
  const meta: PolicyMeta = {
    presidentId: state.legislative.presidentId,
    chancellorId: state.legislative.chancellorId,
    auto: false,
  };
  state.legislative = null;
  enactPolicy(state, card, meta, rng);
}

function enactPolicy(
  state: GameState,
  card: PolicyCard,
  meta: PolicyMeta,
  rng: () => number,
): void {
  if (card === 'demokratik') state.enacted.democratic += 1;
  else state.enacted.fascist += 1;
  state.policyHistory.push(card);
  state.governmentHistory.push({
    round: state.round,
    presidentId: meta.presidentId,
    chancellorId: meta.chancellorId,
    policy: card,
    auto: meta.auto,
  });
  state.lastEnactedPolicy = card;
  state.lastPolicyAuto = meta.auto;
  state.pendingPolicy = {
    card,
    presidentId: meta.presidentId,
    chancellorId: meta.chancellorId,
    auto: meta.auto,
  };
  const chancellorName = getPlayer(state, meta.chancellorId)?.name ?? 'Başbakan';
  addLog(
    state,
    'policy',
    meta.auto
      ? `${policyLabel(card)} yürürlüğe girdi. Demokratik: ${state.enacted.democratic}/${GAME_CONFIG.democraticWinThreshold}, Otokrat: ${state.enacted.fascist}/${GAME_CONFIG.fascistTrackLength}.`
      : `Başbakan ${chancellorName}, ${policyLabel(card)} reformunu yürürlüğe koydu. Demokratik: ${state.enacted.democratic}/${GAME_CONFIG.democraticWinThreshold}, Otokrat: ${state.enacted.fascist}/${GAME_CONFIG.fascistTrackLength}.`,
  );
  maybeBotSpeakAfterEvent(state, rng);

  // Reform önce ekranda açıklanır. Zafer, geçiş ve özel yetkiler kapı
  // kapandıktan sonra sırayla çözülür; böylece reform duyurusu kaybolmaz.
  state.phase = 'policyReveal';
  state.gateEndAt = gateDeadline();
}

function resolvePolicyEffects(
  state: GameState,
  card: PolicyCard,
  meta: PolicyMeta,
  rng: () => number,
): void {
  state.pendingPolicy = null;
  state.gateEndAt = null;

  if (state.enacted.fascist >= GAME_CONFIG.fascistTrackLength) {
    if (state.leaderId === roleHolderId(state, 'notr')) {
      endGame(
        state,
        'notr',
        '7 Otokrat Reform yürürlüğe girdi. Liderliği devralan kırmızı Nötr kişisel zaferini kazandı.',
        [state.leaderId],
      );
    } else {
      endGame(
        state,
        'otokrat',
        '7 Otokrat Reform yürürlüğe girdi. Otokratlar kazandı.',
        computeWinnerIds(state, 'otokrat'),
      );
    }
    return;
  }

  if (state.enacted.democratic >= GAME_CONFIG.democraticWinThreshold) {
    endGame(
      state,
      'demokrat',
      `${GAME_CONFIG.democraticWinThreshold} Demokratik Reform yürürlüğe girdi. Demokratlar kazandı.`,
      computeWinnerIds(state, 'demokrat'),
    );
    return;
  }

  if (!state.firstThreeResolved && getTotalReforms(state) === 3) {
    resolveFirstThree(state);
  }

  if (
    !meta.auto &&
    card === 'otokrat' &&
    state.enacted.fascist === GAME_CONFIG.powers.thirdReformAtFascist
  ) {
    grantThirdFascistPower(state, rng);
  }

  if (
    !meta.auto &&
    card === 'otokrat' &&
    GAME_CONFIG.powers.assassinationAtFascist.includes(state.enacted.fascist)
  ) {
    const presidentId = state.presidentId;
    if (presidentId && isAlive(state, presidentId)) {
      state.pendingAssassination = {
        presidentId,
        reformNumber: state.enacted.fascist,
      };
      addLog(
        state,
        'power',
        `Başkan ${getPlayer(state, presidentId)?.name ?? '—'} bir suikast düzenlemek zorunda.`,
      );
    }
  }

  advanceAfterEffects(state, rng);
}

function investigateMut(state: GameState, actorId: string, targetId: string): void {
  if (!canInvestigateNow(state, actorId)) {
    throw new GameError('INVESTIGATION_UNAVAILABLE', 'Soruşturma yetkiniz şu anda kullanılamıyor.');
  }
  const target = requirePlayer(state, targetId);
  if (!target.alive) {
    throw new GameError('TARGET_DEAD', 'Ölü bir oyuncu soruşturulamaz.');
  }
  if (target.id === actorId) {
    throw new GameError('SELF_TARGET', 'Kendinizi soruşturamazsınız.');
  }
  const result = getInvestigationResult(target.role);
  if (!state.investigations[actorId]) state.investigations[actorId] = {};
  state.investigations[actorId][targetId] = result;
  if (!state.investigatedThisRound[actorId]) state.investigatedThisRound[actorId] = [];
  state.investigatedThisRound[actorId].push(targetId);
  addLog(
    state,
    'power',
    `Başkan ${getPlayer(state, actorId)?.name ?? '—'}, ${target.name}’i sorguya çekti.`,
  );
}

function useBlockMut(state: GameState, actorId: string, targetId: string): void {
  if (!canUseBlockNow(state, actorId)) {
    throw new GameError('BLOCK_UNAVAILABLE', 'Oy engelleme yetkiniz şu anda kullanılamıyor.');
  }
  const target = requirePlayer(state, targetId);
  if (!target.alive) {
    throw new GameError('TARGET_DEAD', 'Ölü bir oyuncunun oyu engellenemez.');
  }
  if (target.id === actorId) {
    throw new GameError('SELF_TARGET', 'Kendi oyunuzu engelleyemezsiniz.');
  }
  state.blockedVotePlayerId = targetId;
  if (state.pendingBlock) state.pendingBlock.used = true;
  if (target.role === 'buyuk_vezir') {
    target.votePower = 0;
  }
  addLog(
    state,
    'power',
    `${getPlayer(state, actorId)?.name ?? '—'}, ${target.name}’in oyunu engelledi.`,
  );
}

function skipBlockMut(state: GameState, actorId: string): void {
  if (!canUseBlockNow(state, actorId)) {
    throw new GameError('BLOCK_UNAVAILABLE', 'Oy engelleme yetkiniz şu anda kullanılamıyor.');
  }
  if (state.pendingBlock) state.pendingBlock.used = true;
  addLog(
    state,
    'power',
    `${getPlayer(state, actorId)?.name ?? '—'} oy engelleme yetkisini kullanmadı.`,
  );
}

function ackPeekMut(state: GameState, actorId: string, rng: () => number): void {
  if (state.phase !== 'peek' || !state.pendingPeek) {
    throw new GameError('WRONG_PHASE', 'Kart inceleme aşaması değil.');
  }
  if (state.pendingPeek.presidentId !== actorId) {
    throw new GameError('NOT_PRESIDENT', 'Kartları yalnızca Başkan inceleyebilir.');
  }
  state.deck.unshift(...state.pendingPeek.cards);
  state.pendingPeek = null;
  addLog(state, 'power', 'Başkan destenin üstündeki üç kartı inceledi.');
  advanceAfterEffects(state, rng);
}

function assassinateMut(
  state: GameState,
  actorId: string,
  targetId: string,
  rng: () => number,
): void {
  if (state.phase !== 'assassination' || !state.pendingAssassination) {
    throw new GameError('WRONG_PHASE', 'Suikast aşaması değil.');
  }
  if (state.pendingAssassination.presidentId !== actorId) {
    throw new GameError('NOT_PRESIDENT', 'Suikastı yalnızca Başkan düzenleyebilir.');
  }
  const target = requirePlayer(state, targetId);
  if (!target.alive) {
    throw new GameError('TARGET_DEAD', 'Ölü bir oyuncu hedef alınamaz.');
  }
  if (target.id === actorId) {
    throw new GameError('SELF_TARGET', 'Kendinize suikast düzenleyemezsiniz.');
  }

  state.pendingAssassination = null;
  target.alive = false;
  target.votePower = 0;
  addLog(state, 'death', `${target.name} suikaste kurban gitti.`);

  if (target.id === state.leaderId) {
    const notr = roleHolder(state, 'notr');
    if (state.leaderId === notr?.id) {
      endGame(
        state,
        'demokrat',
        'Liderliği devralan Nötr suikaste kurban gitti. Demokratlar kazandı.',
        computeWinnerIds(state, 'demokrat'),
      );
      return;
    }
    if (state.notrSide === 'kirmizi' && notr?.alive && !state.leadershipTransferred) {
      state.leaderId = notr.id;
      state.leadershipTransferred = true;
      reassignOffices(state);
      if (checkPurgeVictory(state)) return;
      advanceAfterEffects(state, rng);
      return;
    }
    endGame(
      state,
      'demokrat',
      'Otokrat Lider suikaste kurban gitti. Demokratlar kazandı.',
      computeWinnerIds(state, 'demokrat'),
    );
    return;
  }

  reassignOffices(state);
  if (checkPurgeVictory(state)) return;
  advanceAfterEffects(state, rng);
}

function maybeBotSpeakAfterEvent(state: GameState, rng: () => number): void {
  if (state.phase === 'gameOver') return;
  const bots = state.players.filter((p) => p.isBot && p.alive);
  if (bots.length === 0) return;
  if (rng() > 0.28) return;
  const bot = bots[Math.floor(rng() * bots.length)];
  const text = botMaybeSpeak(state, bot.id, rng);
  if (text) {
    addLog(state, 'bot', `${bot.name}: “${text}”`);
  }
}

function applyActionMut(
  state: GameState,
  actorId: string,
  action: GameAction,
  rng: () => number,
): void {
  if (state.phase === 'gameOver') {
    throw new GameError('GAME_OVER', 'Oyun sona erdi.');
  }
  const actor = requirePlayer(state, actorId);

  switch (action.type) {
    case 'ack_role':
      ackRoleMut(state, actor.id);
      return;
    case 'nominate':
      nominateMut(state, actor.id, action.targetId);
      return;
    case 'vote':
      if (state.phase !== 'voting') {
        throw new GameError('WRONG_PHASE', 'Şu anda oylama aşaması değil.');
      }
      if (!actor.alive) {
        throw new GameError('DEAD', 'Ölü oyuncular oy kullanamaz.');
      }
      if (state.votes[actor.id] !== undefined) {
        throw new GameError('ALREADY_VOTED', 'Bu dönemde zaten oy kullandınız.');
      }
      state.votes[actor.id] = action.choice;
      if (alivePlayers(state).every((p) => state.votes[p.id] !== undefined)) {
        resolveVote(state, rng);
      }
      return;
    case 'continue':
      if (state.phase !== 'voteResult' && state.phase !== 'policyReveal') {
        throw new GameError('WRONG_PHASE', 'Şu anda kapatılacak bir geçiş ekranı yok.');
      }
      if (!canAdvanceGate(state, actor.id)) {
        throw new GameError('NOT_ALLOWED', 'Bu geçişi yalnızca yetkili oyuncu veya host kapatabilir.');
      }
      advanceGateMut(state, rng);
      return;
    case 'end_term':
      if (state.phase !== 'termEnd') {
        throw new GameError('WRONG_PHASE', 'Dönem kapanış aşaması değil.');
      }
      if (!canEndTermNow(state, actor.id)) {
        throw new GameError('NOT_ALLOWED', 'Dönemi yalnızca Başkan veya host kapatabilir.');
      }
      endTermMut(state);
      return;
    case 'president_discard':
      presidentDiscardMut(state, actor.id, action.card);
      return;
    case 'chancellor_enact':
      chancellorEnactMut(state, actor.id, action.card, rng);
      return;
    case 'investigate':
      investigateMut(state, actor.id, action.targetId);
      return;
    case 'use_block':
      useBlockMut(state, actor.id, action.targetId);
      return;
    case 'skip_block':
      skipBlockMut(state, actor.id);
      return;
    case 'choose_notr_side':
      if (state.phase !== 'notrChoice') {
        throw new GameError('WRONG_PHASE', 'Nötr taraf seçimi aşaması değil.');
      }
      if (actor.role !== 'notr') {
        throw new GameError('NOT_NOTR', 'Taraf seçimini yalnızca Nötr yapabilir.');
      }
      applyNotrChoiceMut(state, action.side, rng);
      return;
    case 'assassinate':
      assassinateMut(state, actor.id, action.targetId, rng);
      return;
    case 'ack_peek':
      ackPeekMut(state, actor.id, rng);
      return;
    default:
      throw new GameError('UNKNOWN_ACTION', 'Bilinmeyen oyun eylemi.');
  }
}

function autoResolveBotsMut(state: GameState, rng: () => number): void {
  let guard = 0;
  while (guard < 5000) {
    guard += 1;
    if (state.phase === 'gameOver') return;

    if (state.phase === 'roleReveal') {
      const bot = state.players.find(
        (p) => p.isBot && !state.roleRevealAcknowledged.includes(p.id),
      );
      if (bot) {
        ackRoleMut(state, bot.id);
        continue;
      }
      return;
    }

    // Geçiş kapıları yalnızca tamamen botlardan oluşan oyunlarda otomatik
    // kapanır. İnsanlı oyunlarda sonuç ekranı beklenir; host 45 sn sonra ilerletir.
    if (state.phase === 'voteResult' || state.phase === 'policyReveal') {
      if (!allPlayersAreBots(state)) return;
      advanceGateMut(state, rng);
      continue;
    }

    if (state.phase === 'termEnd') {
      if (!allPlayersAreBots(state)) return;
      endTermMut(state);
      continue;
    }

    if (state.phase === 'notrChoice') {
      const notr = roleHolder(state, 'notr');
      if (notr?.alive && notr.isBot && state.notrChoicePending) {
        const side = botChooseNotrSide(state, notr.id, rng);
        applyNotrChoiceMut(state, side, rng);
        continue;
      }
      return;
    }

    if (state.phase === 'peek') {
      const president = getPlayer(state, state.pendingPeek?.presidentId);
      if (president?.isBot) {
        ackPeekMut(state, president.id, rng);
        continue;
      }
      return;
    }

    if (state.phase === 'assassination') {
      const president = getPlayer(state, state.pendingAssassination?.presidentId);
      if (president?.isBot) {
        const targets = getAssassinationTargets(state, president.id);
        const target = botChooseAssassinationTarget(state, president.id, targets, rng);
        if (target) {
          assassinateMut(state, president.id, target, rng);
          continue;
        }
      }
      return;
    }

    // Botların isteğe bağlı soruşturma yetkisi, ana eylemden önce kullanılır.
    const investigator = state.players.find(
      (p) => p.isBot && p.alive && canInvestigateNow(state, p.id),
    );
    if (investigator) {
      const targets = getInvestigateTargets(state, investigator.id);
      const target = botChooseInvestigationTarget(state, investigator.id, targets, rng);
      if (target) {
        investigateMut(state, investigator.id, target);
        continue;
      }
    }

    // Botların oy engelleme yetkisi.
    if (state.pendingBlock && !state.pendingBlock.used) {
      const blocker = getPlayer(state, state.pendingBlock.playerId);
      if (blocker?.isBot && canUseBlockNow(state, blocker.id)) {
        const targets = alivePlayers(state)
          .filter((p) => p.id !== blocker.id)
          .map((p) => p.id);
        const target = botChooseBlockTarget(state, blocker.id, targets, rng);
        if (target) {
          useBlockMut(state, blocker.id, target);
        } else {
          skipBlockMut(state, blocker.id);
        }
        continue;
      }
    }

    if (state.phase === 'nomination') {
      const president = getPlayer(state, state.presidentId);
      if (president?.isBot) {
        const eligible = getEligibleChancellorIds(state);
        const target = botChooseNomination(state, president.id, eligible, rng);
        if (target) {
          nominateMut(state, president.id, target);
          continue;
        }
      }
      return;
    }

    if (state.phase === 'voting') {
      const voter = alivePlayers(state).find(
        (p) => p.isBot && state.votes[p.id] === undefined,
      );
      if (voter) {
        const choice = botChooseVote(state, voter.id, rng);
        state.votes[voter.id] = choice;
        if (alivePlayers(state).every((p) => state.votes[p.id] !== undefined)) {
          resolveVote(state, rng);
        }
        continue;
      }
      return;
    }

    if (state.phase === 'presidentDiscard') {
      const president = getPlayer(state, state.legislative?.presidentId);
      if (president?.isBot && state.legislative) {
        const card = botChoosePresidentDiscard(
          state,
          president.id,
          state.legislative.presidentCards,
          rng,
        );
        presidentDiscardMut(state, president.id, card);
        continue;
      }
      return;
    }

    if (state.phase === 'chancellorEnact') {
      const chancellor = getPlayer(state, state.legislative?.chancellorId);
      if (chancellor?.isBot && state.legislative?.chancellorCards) {
        const card = botChooseChancellorEnact(
          state,
          chancellor.id,
          state.legislative.chancellorCards,
          rng,
        );
        chancellorEnactMut(state, chancellor.id, card, rng);
        continue;
      }
      return;
    }

    return;
  }
  throw new GameError('BOT_LOOP', 'Bot sırası çözümlenemedi.');
}

/** Bir insan eylemini uygular; botları çözmez. */
export function applyAction(
  state: GameState,
  actorId: string,
  action: GameAction,
  rng: () => number = secureRng(),
): GameState {
  const next = cloneState(state);
  applyActionMut(next, actorId, action, rng);
  touch(next);
  return next;
}

/** Sırası gelen botların eylemlerini, insan eylemi gerekene kadar çözer. */
export function autoResolveBots(
  state: GameState,
  rng: () => number = secureRng(),
): GameState {
  const next = cloneState(state);
  autoResolveBotsMut(next, rng);
  touch(next);
  return next;
}

/** İnsan eylemi + bot çözümü: yerel modda ve Edge Function'da ortak akış. */
export function applyPlayerAction(
  state: GameState,
  actorId: string,
  action: GameAction,
  rng: () => number = secureRng(),
): GameState {
  const next = applyAction(state, actorId, action, rng);
  return autoResolveBots(next, rng);
}

// __ENGINE_APPEND__
