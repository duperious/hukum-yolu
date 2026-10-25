import { GAME_CONFIG } from '../game/config';
import {
  alivePlayers,
  clamp,
  getPlayer,
  isAlive,
  roleHolderId,
} from '../game/helpers';
import { knownFascistIds } from '../game/knowledge';
import { isDemocratRole, isFascistRole } from '../game/roles';
import { pick } from '../game/rng';
import type { GameState, NotrSide, PolicyCard } from '../game/types';

type Camp = 'fascist' | 'democrat';

/**
 * Botun rolüne ve o anki duruma göre hangi tarafı desteklediği.
 * Nötr ve Büyük Vezir geçiş öncesinde reform çoğunluğuna göre eğilim gösterir.
 */
function campFor(state: GameState, botId: string, rng: () => number): Camp {
  const bot = getPlayer(state, botId);
  if (!bot) return 'democrat';

  if (isFascistRole(bot.role)) return 'fascist';
  if (isDemocratRole(bot.role)) return 'democrat';

  if (bot.role === 'notr') {
    if (state.notrSide === 'kirmizi') return 'fascist';
    if (state.notrSide === 'mavi') return 'democrat';
    return state.enacted.fascist > state.enacted.democratic
      ? 'fascist'
      : state.enacted.democratic > state.enacted.fascist
        ? 'democrat'
        : rng() < 0.5
          ? 'fascist'
          : 'democrat';
  }

  if (bot.role === 'buyuk_vezir') {
    if (bot.effectiveTeam === 'demokrat') return 'democrat';
    if (bot.effectiveTeam === 'otokrat') return 'fascist';
    return state.enacted.fascist > state.enacted.democratic
      ? 'fascist'
      : state.enacted.democratic > state.enacted.fascist
        ? 'democrat'
        : rng() < 0.5
          ? 'fascist'
          : 'democrat';
  }

  return 'democrat';
}

/**
 * Kamuya açık bilgilerden ve botun kendi gizli bilgisinden türetilen
 * "fascist olma olasılığı" puanı. Yüksek puan = daha olası Otokrat.
 */
function fascistScore(
  state: GameState,
  botId: string,
  targetId: string,
  rng: () => number,
): number {
  if (targetId === botId) return 0;
  let score = 0;

  if (knownFascistIds(state, botId).has(targetId)) score += 7;

  const investigation = state.investigations[botId]?.[targetId];
  if (investigation === 'kotu') score += 8;
  if (investigation === 'iyi') score -= 2;

  for (const government of state.governmentHistory) {
    const weight = government.auto ? 0.25 : 1;
    if (government.presidentId === targetId) {
      score += (government.policy === 'otokrat' ? 1.2 : -1.2) * weight;
    }
    if (government.chancellorId === targetId) {
      score += (government.policy === 'otokrat' ? 1.6 : -1.6) * weight;
    }
  }

  if (state.publiclyRevealedRoles[targetId] === 'buyuk_vezir') {
    if (state.bigVezirOutcome === 'demokrat') score -= 3.5;
    if (state.bigVezirOutcome === 'idam') score += 1;
  }

  if (state.democraticPartyPresidentId === targetId) score -= 2.2;

  // Oy verme geçmişi gizli olduğu için kamuya açık hükümet kayıtları kullanılır.
  score += (rng() - 0.5) * 1.6;
  return score;
}

export function botChooseNomination(
  state: GameState,
  botId: string,
  eligibleIds: string[],
  rng: () => number,
): string {
  if (eligibleIds.length === 0) return '';
  const camp = campFor(state, botId, rng);

  if (camp === 'fascist') {
    const leaderId = roleHolderId(state, 'otokrat_lider');
    const knowsLeader = leaderId ? knownFascistIds(state, botId).has(leaderId) : false;
    if (
      leaderId &&
      eligibleIds.includes(leaderId) &&
      knowsLeader &&
      state.enacted.fascist >= GAME_CONFIG.powers.leaderChancellorAtFascist
    ) {
      return leaderId;
    }
    const allies = eligibleIds.filter((id) => knownFascistIds(state, botId).has(id));
    if (allies.length > 0 && rng() < 0.82) {
      return pick(allies, rng);
    }
  }

  const scored = eligibleIds.map((id) => {
    const score = fascistScore(state, botId, id, rng);
    return { id, value: camp === 'fascist' ? score : -score };
  });
  scored.sort((a, b) => b.value - a.value);
  const top = scored.slice(0, Math.min(3, scored.length));
  return pick(top, rng).id;
}

export function botChooseVote(
  state: GameState,
  botId: string,
  rng: () => number,
): boolean {
  const presidentId = state.presidentId;
  const chancellorId = state.chancellorId;
  if (!presidentId || !chancellorId) return true;
  if (botId === presidentId || botId === chancellorId) return true;

  const bot = getPlayer(state, botId);
  const camp = campFor(state, botId, rng);
  const chancellorScore = fascistScore(state, botId, chancellorId, rng);
  const presidentScore = fascistScore(state, botId, presidentId, rng);
  const known = knownFascistIds(state, botId);
  const chancellorIsKnownAlly = known.has(chancellorId);
  const presidentIsKnownAlly = known.has(presidentId);

  if (camp === 'fascist') {
    if (chancellorIsKnownAlly) return true;
    if (
      state.enacted.fascist >= GAME_CONFIG.powers.leaderChancellorAtFascist &&
      state.leaderId === chancellorId &&
      (chancellorIsKnownAlly || bot?.role === 'otokrat_lider')
    ) {
      return true;
    }
    if (presidentIsKnownAlly && rng() < 0.72) return true;
    const combined = (chancellorScore + presidentScore) / 2;
    if (combined > 0.4) return true;
    return combined > -1.2 && rng() < 0.42;
  }

  if (chancellorScore > 4.5) return false;
  if (presidentScore > 5.5) return false;

  if (state.failedVotes >= GAME_CONFIG.failedGovernmentLimit - 1) {
    return chancellorScore < 4.5 && rng() < 0.68;
  }

  if (chancellorScore < -1 && presidentScore < 1) return true;
  return chancellorScore < 1 && rng() < 0.58;
}

export function botChoosePresidentDiscard(
  state: GameState,
  botId: string,
  cards: PolicyCard[],
  rng: () => number,
): PolicyCard {
  const camp = campFor(state, botId, rng);
  const preferred: PolicyCard = camp === 'fascist' ? 'otokrat' : 'demokratik';
  const nonPreferred = cards.filter((card) => card !== preferred);
  if (nonPreferred.length > 0) return nonPreferred[0];
  return cards[Math.floor(rng() * cards.length)];
}

export function botChooseChancellorEnact(
  state: GameState,
  botId: string,
  cards: PolicyCard[],
  rng: () => number,
): PolicyCard {
  const camp = campFor(state, botId, rng);
  const preferred: PolicyCard = camp === 'fascist' ? 'otokrat' : 'demokratik';
  if (cards.includes(preferred)) return preferred;
  return cards[0];
}

export function botChooseInvestigationTarget(
  state: GameState,
  botId: string,
  targets: string[],
  rng: () => number,
): string | null {
  const valid = targets.filter((id) => id !== botId);
  if (valid.length === 0) return null;
  const camp = campFor(state, botId, rng);
  const alreadyKnown = new Set(Object.keys(state.investigations[botId] ?? {}));
  const fresh = valid.filter((id) => !alreadyKnown.has(id));
  const pool = fresh.length > 0 ? fresh : valid;

  const scored = pool.map((id) => ({
    id,
    score: fascistScore(state, botId, id, rng),
  }));
  if (camp === 'fascist') {
    // Otokrat botlar, muhtemel Demokratları tanımak ister.
    scored.sort((a, b) => a.score - b.score);
  } else {
    scored.sort((a, b) => b.score - a.score);
  }
  return scored[0]?.id ?? null;
}

export function botChooseBlockTarget(
  state: GameState,
  botId: string,
  targets: string[],
  rng: () => number,
): string | null {
  const valid = targets.filter((id) => id !== botId);
  if (valid.length === 0) return null;
  const camp = campFor(state, botId, rng);
  const bigVezirId = roleHolderId(state, 'buyuk_vezir');

  if (camp === 'fascist') {
    if (
      bigVezirId &&
      valid.includes(bigVezirId) &&
      state.bigVezirOutcome === 'demokrat' &&
      rng() < 0.85
    ) {
      return bigVezirId;
    }
    const scored = valid.map((id) => ({
      id,
      score: fascistScore(state, botId, id, rng),
    }));
    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.id ?? null;
  }

  const filtered = valid.filter(
    (id) => !(id === bigVezirId && state.bigVezirOutcome === 'demokrat'),
  );
  const pool = filtered.length > 0 ? filtered : valid;
  const scored = pool.map((id) => ({
    id,
    score: fascistScore(state, botId, id, rng),
  }));
  scored.sort((a, b) => b.score - a.score);
  if (!scored[0] || scored[0].score < 1.8) return null;
  return scored[0].id;
}

export function botChooseAssassinationTarget(
  state: GameState,
  botId: string,
  targets: string[],
  rng: () => number,
): string {
  const valid = targets.filter((id) => id !== botId);
  if (valid.length === 0) return '';
  const bot = getPlayer(state, botId);
  const camp = campFor(state, botId, rng);
  const bigVezirId = roleHolderId(state, 'buyuk_vezir');

  if (
    bot?.role === 'notr' &&
    state.notrSide === 'kirmizi' &&
    state.leaderId === bot.id
  ) {
    if (
      bigVezirId &&
      valid.includes(bigVezirId) &&
      isAlive(state, bigVezirId)
    ) {
      return bigVezirId;
    }
  }

  if (camp === 'fascist') {
    const known = knownFascistIds(state, botId);
    const filtered = valid.filter((id) => !known.has(id));
    const pool = filtered.length > 0 ? filtered : valid;
    const scored = pool.map((id) => ({
      id,
      score: fascistScore(state, botId, id, rng),
    }));
    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.id ?? '';
  }

  const filtered = valid.filter(
    (id) => !(id === bigVezirId && state.bigVezirOutcome === 'demokrat'),
  );
  const pool = filtered.length > 0 ? filtered : valid;
  const scored = pool.map((id) => ({
    id,
    score: fascistScore(state, botId, id, rng),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? '';
}

export function botChooseNotrSide(
  state: GameState,
  _botId: string,
  rng: () => number,
): NotrSide {
  const total = state.enacted.democratic + state.enacted.fascist;
  const fascistShare = total > 0 ? state.enacted.fascist / total : 0.5;
  // Kırmızı taraf, kişisel zafer ihtimali nedeniyle her zaman caziptir.
  const redChance = clamp(0.25 + fascistShare * 0.55, 0.18, 0.82);
  return rng() < redChance ? 'kirmizi' : 'mavi';
}

export function botMaybeSpeak(
  state: GameState,
  botId: string,
  rng: () => number,
): string | null {
  const bot = getPlayer(state, botId);
  if (!bot) return null;
  const others = alivePlayers(state).filter((p) => p.id !== botId);
  if (others.length === 0) return null;
  const president = getPlayer(state, state.presidentId);
  const chancellor = getPlayer(state, state.chancellorId);
  const target = president ?? pick(others, rng);

  if (chancellor && rng() < 0.42) {
    return `Başbakan adayı ${chancellor.name} hakkında elimde yeterli bilgi yok.`;
  }

  const templates = [
    `Başkan ${target.name} konusunda şüphelerim var.`,
    'Bu hükümetin samimiyetine henüz ikna olmadım.',
    'Reformların gidişatı hepimiz için uyarı olmalı.',
    'Oyumuzu dikkatli kullanmalıyız; gizli niyetler er ya da geç ortaya çıkar.',
    'Sessizlik de bir cevaptır.',
    'Kimin neyi sakladığını zaman gösterecek.',
    'Bu ittifak bana fazla kolay kurulmuş görünüyor.',
    'Bir sonraki hükümet daha dikkatli seçilmeli.',
    'Bugün verilen taviz, yarın geri dönmeyebilir.',
  ];
  return pick(templates, rng);
}
