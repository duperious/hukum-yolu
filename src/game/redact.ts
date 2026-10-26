import {
  canInvestigateNow,
  canUseBlockNow,
  getAssassinationTargets,
  getInvestigateTargets,
} from './engine';
import { getKnownPlayersFor } from './knowledge';
import { GAME_CONFIG, getRoleCounts } from './config';
import {
  alivePlayers,
  getEligibleChancellorIds,
  getPlayer,
  getVotePower,
} from './helpers';
import type {
  GameState,
  PublicGameState,
  PublicPlayer,
  PrivateView,
  RedactedGameState,
  Role,
} from './types';

/**
 * Herkese gönderilebilecek oyun durumu. Desteyi, oyları, rolleri,
 * Nötr'ün seçimini ve özel kartları içermez.
 */
export function getPublicGameState(state: GameState): PublicGameState {
  const revealed = state.revealedRoles ?? state.publiclyRevealedRoles;
  const living = alivePlayers(state);
  const roleComposition = getRoleCounts(state.players.length);

  const players: PublicPlayer[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatarId: p.avatarId,
    isBot: p.isBot,
    isHost: p.isHost,
    alive: p.alive,
    joinedAt: p.joinedAt,
    isPresident: state.presidentId === p.id,
    isChancellor: state.chancellorId === p.id,
    ...(revealed[p.id] ? { revealedRole: revealed[p.id] } : {}),
  }));

  const votesSubmitted = living.filter(
    (p) => state.votes[p.id] !== undefined,
  ).length;

  return {
    id: state.id,
    mode: state.mode,
    phase: state.phase,
    round: state.round,
    players,
    presidentId: state.presidentId,
    chancellorId: state.chancellorId,
    previousChancellorId: state.previousChancellorId,
    failedVotes: state.failedVotes,
    enacted: { ...state.enacted },
    deckCount: state.deck.length,
    discardCount: state.discardPile.length,
    policyHistory: [...state.policyHistory],
    governmentHistory: state.governmentHistory.map((g) => ({ ...g })),
    log: state.log.map((l) => ({ ...l })),
    lastVoteResult: state.lastVoteResult,
    lastGovernment: state.lastGovernment ? { ...state.lastGovernment } : null,
    votesSubmitted,
    totalVoters: living.length,
    notrChoicePending: state.notrChoicePending,
    notrChoiceResolved: state.notrSide !== null,
    firstThreeResolved: state.firstThreeResolved,
    bigVezirOutcome: state.bigVezirOutcome,
    publiclyRevealedRoles: { ...state.publiclyRevealedRoles },
    democraticPartyPresidentId: state.democraticPartyPresidentId,
    roleComposition,
    winner: state.winner,
    winReason: state.winReason,
    winnerIds: [...state.winnerIds],
    revealedRoles: state.revealedRoles ? { ...state.revealedRoles } : null,
    pendingEffect:
      state.phase === 'notrChoice'
        ? 'notrChoice'
        : state.phase === 'peek'
          ? 'peek'
          : state.phase === 'assassination'
            ? 'assassination'
            : null,
    totalPlayers: state.players.length,
    livingPlayers: living.length,
    democraticWinThreshold: GAME_CONFIG.democraticWinThreshold,
    fascistTrackLength: GAME_CONFIG.fascistTrackLength,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };
}

/**
 * Yalnızca ilgili oyuncuya gönderilecek gizli görünüm.
 * Başka oyuncuların rolleri, destesi, bireysel oyları veya özel kartları
 * burada asla yer almaz.
 */
export function getPrivateView(
  state: GameState,
  playerId: string,
): PrivateView {
  const player = getPlayer(state, playerId);
  if (!player) {
    throw new Error('Özel görünüm için oyuncu bulunamadı.');
  }

  const isPresident = state.presidentId === player.id;
  const isChancellor = state.chancellorId === player.id;
  const isNumericLeader = state.leaderId === player.id;
  const canInvestigate = canInvestigateNow(state, player.id);
  const canBlock = canUseBlockNow(state, player.id);
  const canNominate =
    state.phase === 'nomination' && isPresident && player.alive;
  const canVote =
    state.phase === 'voting' &&
    player.alive &&
    state.votes[player.id] === undefined;
  const canDiscard =
    state.phase === 'presidentDiscard' &&
    state.legislative?.presidentId === player.id;
  const canEnact =
    state.phase === 'chancellorEnact' &&
    state.legislative?.chancellorId === player.id;
  const canAssassinate =
    state.phase === 'assassination' &&
    state.pendingAssassination?.presidentId === player.id;
  const canChooseNotrSide =
    state.phase === 'notrChoice' &&
    player.role === 'notr' &&
    state.notrChoicePending &&
    state.notrSide === null &&
    player.alive;

  const legislativeRole =
    state.legislative?.presidentId === player.id
      ? 'president'
      : state.legislative?.chancellorId === player.id
        ? 'chancellor'
        : null;

  let legislativeCards: PrivateView['legislativeCards'] = null;
  if (state.phase === 'presidentDiscard' && state.legislative?.presidentId === player.id) {
    legislativeCards = [...state.legislative.presidentCards];
  } else if (
    state.phase === 'chancellorEnact' &&
    state.legislative?.chancellorId === player.id &&
    state.legislative.chancellorCards
  ) {
    legislativeCards = [...state.legislative.chancellorCards];
  }

  const pendingPeekCards =
    state.phase === 'peek' && state.pendingPeek?.presidentId === player.id
      ? [...state.pendingPeek.cards]
      : null;

  return {
    playerId: player.id,
    role: player.role,
    effectiveTeam: player.effectiveTeam,
    votePower: getVotePower(player),
    isAlive: player.alive,
    isPresident,
    isChancellor,
    isLeader: isNumericLeader,
    isNotr: player.role === 'notr',
    notrSide: player.role === 'notr' ? state.notrSide : null,
    knownPlayers: getKnownPlayersFor(state, player.id),
    investigations: { ...(state.investigations[player.id] ?? {}) },
    canInvestigate,
    investigateTargets: canInvestigate ? getInvestigateTargets(state, player.id) : [],
    investigationUsedThisRound:
      (state.investigatedThisRound[player.id]?.length ?? 0) > 0,
    canBlock,
    blockTargetId:
      state.pendingBlock &&
      state.pendingBlock.playerId === player.id &&
      state.pendingBlock.used
        ? state.blockedVotePlayerId
        : null,
    youWereBlocked: state.blockedVotePlayerId === player.id,
    hasVoted: state.votes[player.id] !== undefined,
    yourVote: state.votes[player.id] ?? null,
    roleRevealAcknowledged: state.roleRevealAcknowledged.includes(player.id),
    pendingPeekCards,
    legislativeCards,
    legislativeRole,
    canNominate,
    eligibleChancellorIds: canNominate
      ? getEligibleChancellorIds(state)
      : [],
    canVote,
    canDiscard: Boolean(canDiscard),
    canEnact: Boolean(canEnact),
    canAssassinate: Boolean(canAssassinate),
    assassinationTargets: canAssassinate
      ? getAssassinationTargets(state, player.id)
      : [],
    canChooseNotrSide,
    isHost: player.isHost,
    isBot: player.isBot,
  };
}

export function redactGameState(
  state: GameState,
  viewerId: string,
): RedactedGameState {
  return {
    public: getPublicGameState(state),
    private: getPrivateView(state, viewerId),
  };
}

/** Testlerde ve geliştirmede kolaylık: rol adlarını güvenli biçimde döndürür. */
export function getRevealedRole(
  state: GameState,
  playerId: string,
): Role | undefined {
  return state.revealedRoles?.[playerId] ?? state.publiclyRevealedRoles[playerId];
}
