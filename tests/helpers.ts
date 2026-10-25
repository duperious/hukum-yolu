import { applyAction, startGame } from '../src/game/engine';
import { baseTeamForRole } from '../src/game/roles';
import { mulberry32 } from '../src/game/rng';
import type {
  GameState,
  PolicyCard,
  Role,
  StartGamePlayer,
} from '../src/game/types';

export const ROLES_5: Role[] = [
  'otokrat_lider',
  'otokrat',
  'buyuk_vezir',
  'notr',
  'istihbarat_baskani',
];

export const ROLES_6: Role[] = [...ROLES_5, 'sade_demokrat'];

export const ROLES_7: Role[] = [
  'otokrat_lider',
  'otokrat',
  'otokrat',
  'buyuk_vezir',
  'notr',
  'istihbarat_baskani',
  'sade_demokrat',
];

export interface ControlledGameOptions {
  roles?: Role[];
  names?: string[];
  bots?: boolean[];
  mode?: 'local' | 'multiplayer';
  startPresidentIndex?: number;
  seed?: number;
}

export function makeControlledGame(options: ControlledGameOptions = {}): GameState {
  const roles = options.roles ?? ROLES_5;
  const count = roles.length;
  const players: StartGamePlayer[] = Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: options.names?.[index] ?? `Oyuncu ${index + 1}`,
    avatarId: `avatar-${(index % 16) + 1}`,
    isBot: options.bots?.[index] ?? false,
    isHost: index === 0,
    joinedAt: 1000 + index,
  }));

  const state = startGame({
    players,
    mode: options.mode ?? 'local',
    rng: mulberry32(options.seed ?? 12345),
  });

  state.players.forEach((player, index) => {
    const role = roles[index];
    player.role = role;
    player.alive = true;
    player.effectiveTeam = baseTeamForRole(role);
    player.votePower = role === 'buyuk_vezir' ? 2 : 1;
  });

  state.leaderId = state.players.find((p) => p.role === 'otokrat_lider')!.id;
  state.intelligenceOfficeHolderId =
    state.players.find((p) => p.role === 'istihbarat_baskani')?.id ?? null;
  state.startPresidentId =
    state.players[options.startPresidentIndex ?? 0]?.id ?? state.players[0].id;
  state.presidentId = null;
  state.phase = 'roleReveal';
  state.roleRevealAcknowledged = [];
  state.notrSide = null;
  state.notrChoicePending = false;
  state.leadershipTransferred = false;
  state.publiclyRevealedRoles = {};
  state.firstThreeResolved = false;
  state.bigVezirOutcome = null;
  state.enacted = { democratic: 0, fascist: 0 };
  state.policyHistory = [];
  state.governmentHistory = [];
  state.discardPile = [];
  state.log = [];
  state.winner = null;
  state.winReason = null;
  state.winnerIds = [];
  state.revealedRoles = null;
  return state;
}

/** Tüm oyuncuların rol açılışını onaylar; son onay turu başlatır. */
export function ackAll(state: GameState): GameState {
  let current = state;
  for (const player of state.players) {
    if (!current.roleRevealAcknowledged.includes(player.id)) {
      current = applyAction(current, player.id, { type: 'ack_role' });
    }
  }
  return current;
}

export function forceLegislative(
  state: GameState,
  presidentId: string,
  chancellorId: string,
  cards: PolicyCard[],
): GameState {
  const next = structuredClone(state);
  next.phase = 'chancellorEnact';
  next.presidentId = presidentId;
  next.chancellorId = chancellorId;
  next.legislative = {
    presidentId,
    chancellorId,
    presidentCards: [],
    chancellorCards: [...cards],
    presidentDiscard: null,
  };
  return next;
}

export function forceVote(
  state: GameState,
  presidentId: string,
  chancellorId: string,
): GameState {
  const next = structuredClone(state);
  next.phase = 'voting';
  next.presidentId = presidentId;
  next.chancellorId = chancellorId;
  next.votes = {};
  next.blockedVotePlayerId = null;
  return next;
}

export function forceAssassination(
  state: GameState,
  presidentId: string,
): GameState {
  const next = structuredClone(state);
  next.phase = 'assassination';
  next.pendingAssassination = { presidentId, reformNumber: 5 };
  return next;
}

export function forceNotrChoice(state: GameState): GameState {
  const next = structuredClone(state);
  const notr = next.players.find((p) => p.role === 'notr');
  if (!notr) throw new Error('Test durumunda Nötr yok.');
  next.phase = 'notrChoice';
  next.notrChoicePending = true;
  next.notrSide = null;
  next.firstThreeResolved = true;
  next.democraticPartyPresidentId = notr.id;
  return next;
}

export function forcePeek(
  state: GameState,
  presidentId: string,
  cards: PolicyCard[],
): GameState {
  const next = structuredClone(state);
  next.phase = 'peek';
  next.pendingPeek = { presidentId, cards: [...cards] };
  next.deck = next.deck.filter((_, index) => index >= cards.length);
  return next;
}

export function forceBlock(
  state: GameState,
  holderId: string,
  usableRound = state.round,
): GameState {
  const next = structuredClone(state);
  next.pendingBlock = { playerId: holderId, usableRound, used: false };
  return next;
}

export function getPlayer(state: GameState, id: string) {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new Error(`Oyuncu yok: ${id}`);
  return player;
}
