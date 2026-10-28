import { GAME_CONFIG, getRoleCounts } from './config';
import type {
  GameState,
  Player,
  PolicyCard,
  Role,
  RoleCounts,
} from './types';

export function getPlayer(state: GameState, playerId: string | null | undefined): Player | undefined {
  if (!playerId) return undefined;
  return state.players.find((p) => p.id === playerId);
}

export function requirePlayer(state: GameState, playerId: string): Player {
  const player = getPlayer(state, playerId);
  if (!player) {
    throw new Error('Oyuncu bulunamadı.');
  }
  return player;
}

export function alivePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive);
}

export function livingPlayerIds(state: GameState): string[] {
  return alivePlayers(state).map((p) => p.id);
}

export function roleHolder(state: GameState, role: Role): Player | undefined {
  return state.players.find((p) => p.role === role);
}

export function roleHolderId(state: GameState, role: Role): string | null {
  return roleHolder(state, role)?.id ?? null;
}

export function isAlive(state: GameState, playerId: string | null | undefined): boolean {
  return Boolean(getPlayer(state, playerId)?.alive);
}

export function nextLivingAfter(state: GameState, playerId: string | null): string | null {
  const order = state.playerOrder;
  if (order.length === 0) return null;
  const startIndex = playerId ? order.indexOf(playerId) : -1;
  const start = startIndex >= 0 ? startIndex : -1;
  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidateId = order[(start + offset) % order.length];
    if (isAlive(state, candidateId)) return candidateId;
  }
  return null;
}

export function firstLiving(state: GameState): string | null {
  return state.playerOrder.find((id) => isAlive(state, id)) ?? null;
}

/**
 * Başbakan adayları. Normalde kendisi ve önceki Başbakan hariç tutulur.
 * Uygun aday kalmazsa kısıtlar sırayla gevşetilir; bu istisna loglanır.
 */
export function getEligibleChancellorIds(state: GameState): string[] {
  const presidentId = state.presidentId;
  if (!presidentId) return [];
  const living = alivePlayers(state).map((p) => p.id);
  const withoutSelf = living.filter((id) => id !== presidentId);
  const strict = withoutSelf.filter((id) => id !== state.previousChancellorId);
  if (strict.length > 0) return strict;
  if (withoutSelf.length > 0) return withoutSelf;
  return living;
}

export function isTermLimitRelaxed(state: GameState, targetId: string): boolean {
  if (!state.presidentId) return false;
  if (targetId === state.presidentId) return true;
  if (targetId === state.previousChancellorId) {
    const strict = getEligibleChancellorIds(state).filter(
      (id) => id !== state.presidentId && id !== state.previousChancellorId,
    );
    return strict.length === 0;
  }
  return false;
}

export function getVotePower(player: Player): number {
  if (!player.alive) return 0;
  return Math.max(0, player.votePower);
}

/**
 * Oy gizliliği kuralı: İlk üç dönem tamamlandıktan sonra (4. dönemden
 * itibaren) tüm oylamalar açık yapılır. Ayrıca Büyük Vezir ilk üç reformdan
 * sonra Demokratik tarafa geçip oy gücü 2'den 1'e düşerse oylama açık yapılır.
 * Oy gücü 0'a düşerse (engellendiyse) oylama yeniden gizli kalır.
 */
export function isOpenVoting(state: GameState): boolean {
  if (state.round > GAME_CONFIG.openVotingAfterRound) {
    return true;
  }
  if (!state.firstThreeResolved || state.bigVezirOutcome !== 'demokrat') {
    return false;
  }
  const bigVezir = roleHolder(state, 'buyuk_vezir');
  return Boolean(
    bigVezir?.alive &&
      bigVezir.effectiveTeam === 'demokrat' &&
      bigVezir.votePower === 1,
  );
}

export function countFirstThree(state: GameState): { democratic: number; fascist: number } {
  const firstThree = state.policyHistory.slice(0, 3);
  return {
    democratic: firstThree.filter((p) => p === 'demokratik').length,
    fascist: firstThree.filter((p) => p === 'otokrat').length,
  };
}

export function getRoleComposition(totalPlayers: number): RoleCounts {
  return getRoleCounts(totalPlayers);
}

export function getTotalReforms(state: GameState): number {
  return state.enacted.democratic + state.enacted.fascist;
}

export function hasWonByDemocraticThreshold(state: GameState): boolean {
  return state.enacted.democratic >= GAME_CONFIG.democraticWinThreshold;
}

export function hasWonByFascistThreshold(state: GameState): boolean {
  return state.enacted.fascist >= GAME_CONFIG.fascistTrackLength;
}

export function isLeader(state: GameState, playerId: string): boolean {
  return state.leaderId === playerId;
}

export function isNotrPlayer(state: GameState, playerId: string): boolean {
  return getPlayer(state, playerId)?.role === 'notr';
}

export function isBuyukVezir(state: GameState, playerId: string): boolean {
  return getPlayer(state, playerId)?.role === 'buyuk_vezir';
}

export function isIntelligenceRole(state: GameState, playerId: string): boolean {
  return getPlayer(state, playerId)?.role === 'istihbarat_baskani';
}

export function isIntelligenceOfficeHolder(state: GameState, playerId: string): boolean {
  return state.intelligenceOfficeHolderId === playerId && isAlive(state, playerId);
}

export function policyLabel(card: PolicyCard): string {
  return card === 'demokratik' ? 'Demokratik Reform' : 'Otokrat Reform';
}

export function roleName(role: Role): string {
  switch (role) {
    case 'otokrat_lider':
      return 'Otokrat Lider';
    case 'otokrat':
      return 'Otokrat';
    case 'buyuk_vezir':
      return 'Büyük Vezir';
    case 'notr':
      return 'Nötr';
    case 'istihbarat_baskani':
      return 'İstihbarat Başkanı';
    case 'sade_demokrat':
      return 'Sade Demokrat';
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
