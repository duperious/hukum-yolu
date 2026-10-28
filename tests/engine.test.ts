import { describe, expect, it } from 'vitest';
import {
  applyAction,
  autoResolveBots,
  GameError,
  restartGame,
  startGame,
} from '../src/game/engine';
import { redactGameState } from '../src/game/redact';
import { mulberry32 } from '../src/game/rng';
import type { GameState, PolicyCard } from '../src/game/types';
import {
  ackAll,
  closeGate,
  forceAssassination,
  forceBlock,
  forceLegislative,
  forceNotrChoice,
  forcePeek,
  forceVote,
  getPlayer,
  makeControlledGame,
  passGates,
  ROLES_5,
  ROLES_6,
  ROLES_7,
} from './helpers';

function voteAll(state: GameState, choice: boolean): GameState {
  let current = state;
  for (const player of state.players.filter((p) => p.alive)) {
    if (current.votes[player.id] === undefined) {
      current = applyAction(current, player.id, { type: 'vote', choice });
    }
  }
  return current;
}

describe('oyun başlangıcı ve tur akışı', () => {
  it('tüm roller onaylanınca ilk tur ve rastgele başlangıç Başkanı başlar', () => {
    const state = makeControlledGame({ startPresidentIndex: 2 });
    const started = ackAll(state);
    expect(started.phase).toBe('nomination');
    expect(started.round).toBe(1);
    expect(started.presidentId).toBe('p3');
    expect(started.roleRevealAcknowledged).toHaveLength(5);
  });

  it('Başkan kendisini aday gösteremez ve sıra dışı oyuncu aday gösteremez', () => {
    const state = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    expect(() =>
      applyAction(state, 'p2', { type: 'nominate', targetId: 'p3' }),
    ).toThrow(GameError);
    expect(() =>
      applyAction(state, 'p1', { type: 'nominate', targetId: 'p1' }),
    ).toThrow(GameError);

    const next = applyAction(state, 'p1', { type: 'nominate', targetId: 'p2' });
    expect(next.phase).toBe('voting');
    expect(next.chancellorId).toBe('p2');
  });

  it('önceki Başbakan normalde aday olamaz; uygun aday kalmazsa kısıt gevşer', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = {
      ...base,
      previousChancellorId: 'p2',
      phase: 'nomination' as const,
      presidentId: 'p1',
      round: 2,
    };
    expect(() =>
      applyAction(state, 'p1', { type: 'nominate', targetId: 'p2' }),
    ).toThrow(GameError);

    const onlyPrevious = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'p3' || p.id === 'p4' || p.id === 'p5' ? { ...p, alive: false } : p,
      ),
    };
    const next = applyAction(onlyPrevious, 'p1', {
      type: 'nominate',
      targetId: 'p2',
    });
    expect(next.chancellorId).toBe('p2');
    expect(next.log.some((l) => l.text.includes('kısıtı gevşetildi'))).toBe(true);
  });

  it('ölü oyuncular oy kullanamaz', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceVote(base, 'p1', 'p2');
    const dead = {
      ...state,
      players: state.players.map((p) =>
        p.id === 'p3' ? { ...p, alive: false } : p,
      ),
    };
    expect(() =>
      applyAction(dead, 'p3', { type: 'vote', choice: true }),
    ).toThrow(GameError);
  });
});

describe('oylama ve Büyük Vezir ağırlığı', () => {
  it('Büyük Vezir 2 oyuyla hükümeti kabul ettirir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceVote(base, 'p1', 'p2');
    const votes: Record<string, boolean> = {
      p1: true,
      p2: true,
      p3: true,
      p4: false,
      p5: false,
    };
    let current = state;
    for (const [id, choice] of Object.entries(votes)) {
      current = applyAction(current, id, { type: 'vote', choice });
    }
    expect(current.lastVoteResult).toBe('kabul');
    expect(current.phase).toBe('voteResult');
    expect(current.failedVotes).toBe(0);

    const afterGate = closeGate(current);
    expect(afterGate.phase).toBe('presidentDiscard');
  });

  it('eşitlikte ret kabul edilir ve ret sayacı artar', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceVote(base, 'p1', 'p2');
    const votes: Record<string, boolean> = {
      p1: true,
      p2: true,
      p3: false,
      p4: false,
      p5: false,
    };
    let current = state;
    for (const [id, choice] of Object.entries(votes)) {
      current = applyAction(current, id, { type: 'vote', choice });
    }
    expect(current.lastVoteResult).toBe('ret');
    expect(current.phase).toBe('voteResult');
    expect(current.failedVotes).toBe(0);

    const afterGate = closeGate(current);
    expect(afterGate.failedVotes).toBe(1);
    expect(afterGate.phase).toBe('nomination');
  });

  it('engellenen Büyük Vezir oyu sayılmaz ve oy gücü kalıcı 0 olur', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    let state = forceVote(base, 'p1', 'p2');
    state = forceBlock(state, 'p1', state.round);
    state = applyAction(state, 'p1', { type: 'use_block', targetId: 'p3' });
    expect(getPlayer(state, 'p3').votePower).toBe(0);

    const votes: Record<string, boolean> = {
      p1: true,
      p2: true,
      p3: true,
      p4: false,
      p5: false,
    };
    let current = state;
    for (const [id, choice] of Object.entries(votes)) {
      current = applyAction(current, id, { type: 'vote', choice });
    }
    expect(current.lastVoteResult).toBe('ret');
    expect(current.phase).toBe('voteResult');
    expect(current.failedVotes).toBe(0);

    const afterGate = closeGate(current);
    expect(afterGate.failedVotes).toBe(1);
  });

  it('üç ret sonrası destenin üst kartı otomatik yürürlüğe girer', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = {
      ...forceVote(base, 'p1', 'p2'),
      failedVotes: 2,
      deck: ['demokratik' as PolicyCard, ...base.deck.slice(1)],
    };
    const voteGate = voteAll(state, false);
    expect(voteGate.phase).toBe('voteResult');

    const next = closeGate(voteGate);
    expect(next.failedVotes).toBe(0);
    expect(next.enacted.democratic).toBe(1);
    expect(next.policyHistory).toEqual(['demokratik']);
    expect(next.governmentHistory[0]?.auto).toBe(true);
    expect(next.phase).toBe('policyReveal');

    const nextRound = passGates(next);
    expect(nextRound.phase).toBe('nomination');
  });
});

describe('yasama ve reform etkileri', () => {
  it('Başkan 3 karttan birini eler, Başbakan kalan 2 karttan birini yürürlüğe koyar', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['demokratik', 'otokrat']);
    const next = applyAction(state, 'p2', {
      type: 'chancellor_enact',
      card: 'demokratik',
    });
    expect(next.enacted.democratic).toBe(1);
    expect(next.enacted.fascist).toBe(0);
    expect(next.policyHistory).toEqual(['demokratik']);
    expect(next.discardPile).toContain('otokrat');
    expect(next.governmentHistory[0]).toMatchObject({
      presidentId: 'p1',
      chancellorId: 'p2',
      policy: 'demokratik',
      auto: false,
    });
    expect(next.phase).toBe('policyReveal');
    expect(next.lastEnactedPolicy).toBe('demokratik');
    expect(passGates(next).phase).toBe('nomination');
  });

  it('Başkan kart elerken yalnızca kendi elindeki kartı seçebilir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['demokratik', 'otokrat']);
    const presidentTurn: GameState = {
      ...state,
      phase: 'presidentDiscard',
      legislative: {
        presidentId: 'p1',
        chancellorId: 'p2',
        presidentCards: ['demokratik', 'otokrat', 'otokrat'],
        chancellorCards: null,
        presidentDiscard: null,
      },
    };
    expect(() =>
      applyAction(presidentTurn, 'p2', {
        type: 'president_discard',
        card: 'demokratik',
      }),
    ).toThrow(GameError);
    const next = applyAction(presidentTurn, 'p1', {
      type: 'president_discard',
      card: 'otokrat',
    });
    expect(next.phase).toBe('chancellorEnact');
    expect(next.legislative?.chancellorCards).toEqual(['demokratik', 'otokrat']);
  });
});

describe('ilk üç reform geçişi ve Nötr', () => {
  it('Demokratlar öndeyse Büyük Vezir Demokratik tarafa geçer ve Nötr seçime gider', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['demokratik', 'otokrat']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 1, fascist: 1 },
      policyHistory: ['demokratik', 'otokrat'],
    };
    const revealed = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'demokratik',
    });
    expect(revealed.phase).toBe('policyReveal');
    expect(revealed.firstThreeResolved).toBe(false);

    const next = closeGate(revealed);
    expect(next.phase).toBe('notrChoice');
    expect(next.bigVezirOutcome).toBe('demokrat');
    expect(getPlayer(next, 'p3').effectiveTeam).toBe('demokrat');
    expect(getPlayer(next, 'p3').votePower).toBe(1);
    expect(next.democraticPartyPresidentId).toBe('p3');
    expect(next.publiclyRevealedRoles['p3']).toBe('buyuk_vezir');
    expect(next.notrChoicePending).toBe(true);
    expect(
      next.log.filter((entry) => entry.text.includes('Nötr tarafını')),
    ).toHaveLength(0);

    const chosen = applyAction(next, 'p4', {
      type: 'choose_notr_side',
      side: 'mavi',
    });
    expect(chosen.notrSide).toBe('mavi');
    expect(
      chosen.log.filter((entry) => entry.text.includes('Nötr tarafını seçti')),
    ).toHaveLength(1);
    expect(
      chosen.log.filter((entry) => entry.text.includes('Nötr tarafını seçiyor')),
    ).toHaveLength(0);
    expect(getPlayer(chosen, 'p4').effectiveTeam).toBe('demokrat');
    expect(chosen.phase).toBe('termEnd');

    const afterTerm = closeGate(chosen);
    expect(afterTerm.phase).toBe('nomination');
    expect(afterTerm.round).toBe(2);
  });

  it('Otokratlar öndeyse Büyük Vezir idam edilir ve kimliği açıklanır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 1, fascist: 1 },
      policyHistory: ['demokratik', 'otokrat'],
    };
    const revealed = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    expect(revealed.phase).toBe('policyReveal');

    const next = closeGate(revealed);
    expect(next.phase).toBe('notrChoice');
    expect(next.bigVezirOutcome).toBe('idam');
    expect(getPlayer(next, 'p3').alive).toBe(false);
    expect(next.publiclyRevealedRoles['p3']).toBe('buyuk_vezir');
    expect(next.democraticPartyPresidentId).toBe('p4');
  });

  it('kırmızı Nötr, Büyük Vezir ölmüşse İstihbarat Başkanlığını gizlice devralır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 1, fascist: 1 },
      policyHistory: ['demokratik', 'otokrat'],
    };
    const afterPolicy = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    const afterTransition = closeGate(afterPolicy);
    const chosen = applyAction(afterTransition, 'p4', {
      type: 'choose_notr_side',
      side: 'kirmizi',
    });
    expect(chosen.notrSide).toBe('kirmizi');
    expect(chosen.intelligenceOfficeHolderId).toBe('p4');
    expect(getPlayer(chosen, 'p4').effectiveTeam).toBe('otokrat');
  });
});

describe('üçüncü Otokrat Reform yetkileri', () => {
  it('5 oyunculu oyunda kart inceleme yetkisi verir ve kartları aynı sırayla geri koyar', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 0, fascist: 2 },
      policyHistory: ['otokrat', 'otokrat'],
      firstThreeResolved: true,
    };
    const afterPolicy = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    expect(afterPolicy.phase).toBe('policyReveal');
    expect(afterPolicy.pendingPeek).toBeNull();

    const afterReveal = closeGate(afterPolicy);
    expect(afterReveal.phase).toBe('peek');
    expect(afterReveal.pendingPeek?.cards).toHaveLength(3);

    const deckBefore = afterReveal.deck.length;
    const peekCards = [...(afterReveal.pendingPeek?.cards ?? [])];
    const afterPeek = applyAction(afterReveal, 'p1', { type: 'ack_peek' });
    expect(afterPeek.pendingPeek).toBeNull();
    expect(afterPeek.deck.length).toBe(deckBefore + 3);
    expect(afterPeek.deck.slice(0, 3)).toEqual(peekCards);
    expect(afterPeek.phase).toBe('termEnd');
    expect(closeGate(afterPeek).phase).toBe('nomination');
  });

  it('7 oyunculu oyunda oy engelleme yetkisi verir ve sonraki turda kullanılabilir', () => {
    const base = ackAll(
      makeControlledGame({ roles: ROLES_7, startPresidentIndex: 0 }),
    );
    const state = forceLegislative(base, 'p1', 'p2', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 0, fascist: 2 },
      policyHistory: ['otokrat', 'otokrat'],
      firstThreeResolved: true,
    };
    const afterPolicy = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    expect(afterPolicy.phase).toBe('policyReveal');
    expect(afterPolicy.pendingBlock).toBeNull();

    const afterReveal = closeGate(afterPolicy);
    expect(afterReveal.phase).toBe('termEnd');
    expect(afterReveal.pendingBlock?.playerId).toBe('p1');
    expect(afterReveal.pendingBlock?.usableRound).toBe(2);

    const afterChoice = closeGate(afterReveal);
    expect(afterChoice.phase).toBe('nomination');
    expect(afterChoice.round).toBe(2);
    expect(afterChoice.pendingBlock?.playerId).toBe('p1');

    const blocked = applyAction(afterChoice, 'p1', {
      type: 'use_block',
      targetId: 'p3',
    });
    expect(blocked.blockedVotePlayerId).toBe('p3');
  });
});

describe('suikast, liderlik devri ve zaferler', () => {
  it('5. Otokrat Reform sonrası suikast yapılır; lider ölürse kırmızı Nötr liderliği devralır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 1 }));
    const state = forceLegislative(base, 'p2', 'p5', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 0, fascist: 4 },
      policyHistory: ['otokrat', 'otokrat', 'otokrat', 'otokrat'],
      firstThreeResolved: true,
      notrSide: 'kirmizi',
      notrChoicePending: false,
      leadershipTransferred: false,
      bigVezirOutcome: 'idam',
      democraticPartyPresidentId: 'p4',
      publiclyRevealedRoles: { p3: 'buyuk_vezir' },
      players: state.players.map((p) => {
        if (p.id === 'p3') return { ...p, alive: false, votePower: 0 };
        if (p.id === 'p4') return { ...p, effectiveTeam: 'otokrat' as const };
        return p;
      }),
    };
    const afterPolicy = applyAction(prepared, 'p5', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    expect(afterPolicy.phase).toBe('policyReveal');

    const afterReveal = closeGate(afterPolicy);
    expect(afterReveal.phase).toBe('assassination');
    expect(afterReveal.pendingAssassination?.presidentId).toBe('p2');

    const afterKill = applyAction(afterReveal, 'p2', {
      type: 'assassinate',
      targetId: 'p1',
    });
    expect(getPlayer(afterKill, 'p1').alive).toBe(false);
    expect(afterKill.leaderId).toBe('p4');
    expect(afterKill.leadershipTransferred).toBe(true);
    expect(afterKill.phase).toBe('termEnd');
    expect(afterKill.winner).toBeNull();
    expect(closeGate(afterKill).phase).toBe('nomination');
  });

  it('kırmızı Nötr liderken 7. Otokrat Reform kişisel zafer getirir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 1 }));
    const state = forceLegislative(base, 'p2', 'p5', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 0, fascist: 6 },
      policyHistory: ['otokrat', 'otokrat', 'otokrat', 'otokrat', 'otokrat', 'otokrat'],
      firstThreeResolved: true,
      notrSide: 'kirmizi',
      notrChoicePending: false,
      leadershipTransferred: true,
      leaderId: 'p4',
      players: state.players.map((p) =>
        p.id === 'p4' ? { ...p, effectiveTeam: 'otokrat' as const } : p,
      ),
    };
    const revealed = applyAction(prepared, 'p5', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    expect(revealed.phase).toBe('policyReveal');
    expect(revealed.winner).toBeNull();

    const next = closeGate(revealed);
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('notr');
    expect(next.winnerIds).toEqual(['p4']);
    expect(next.revealedRoles).not.toBeNull();
  });

  it('4. Otokrat Reform sonrası Lider Başbakan seçilirse Otokratlar kazanır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 1 }));
    const state = forceVote(base, 'p2', 'p1');
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 0, fascist: 4 },
      policyHistory: ['otokrat', 'otokrat', 'otokrat', 'otokrat'],
      firstThreeResolved: true,
      notrSide: 'kirmizi',
      notrChoicePending: false,
      players: state.players.map((p) =>
        p.id === 'p4' ? { ...p, effectiveTeam: 'otokrat' as const } : p,
      ),
    };
    const voteGate = voteAll(prepared, true);
    expect(voteGate.phase).toBe('voteResult');

    const next = closeGate(voteGate);
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('otokrat');
    expect(next.winnerIds).toContain('p1');
    expect(next.winnerIds).not.toContain('p4');
  });

  it('6 Demokratik Reform Demokrat zaferini getirir; mavi Nötr ve geçen Büyük Vezir kazanır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['demokratik', 'otokrat']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 5, fascist: 0 },
      policyHistory: ['demokratik', 'demokratik', 'demokratik', 'demokratik', 'demokratik'],
      firstThreeResolved: true,
      notrSide: 'mavi',
      notrChoicePending: false,
      bigVezirOutcome: 'demokrat',
      players: state.players.map((p) => {
        if (p.id === 'p3' || p.id === 'p4') {
          return { ...p, effectiveTeam: 'demokrat' as const };
        }
        return p;
      }),
    };
    const revealed = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'demokratik',
    });
    expect(revealed.phase).toBe('policyReveal');
    expect(revealed.winner).toBeNull();

    const next = closeGate(revealed);
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('demokrat');
    expect(next.winnerIds).toEqual(expect.arrayContaining(['p3', 'p4', 'p5']));
    expect(next.winnerIds).not.toContain('p2');
  });

  it('7 Otokrat Reform Otokrat zaferini getirir ve kırmızı Nötr otomatik kazanmaz', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['otokrat', 'demokratik']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 0, fascist: 6 },
      policyHistory: ['otokrat', 'otokrat', 'otokrat', 'otokrat', 'otokrat', 'otokrat'],
      firstThreeResolved: true,
      notrSide: 'kirmizi',
      notrChoicePending: false,
      players: state.players.map((p) => {
        if (p.id === 'p3') return { ...p, alive: false, votePower: 0 };
        if (p.id === 'p4') return { ...p, effectiveTeam: 'otokrat' as const };
        return p;
      }),
    };
    const revealed = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'otokrat',
    });
    expect(revealed.phase).toBe('policyReveal');
    expect(revealed.winner).toBeNull();

    const next = closeGate(revealed);
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('otokrat');
    expect(next.winnerIds).toEqual(expect.arrayContaining(['p1', 'p2']));
    expect(next.winnerIds).not.toContain('p4');
  });

  it('Lider suikaste kurban giderse ve kırmızı Nötr yoksa Demokratlar kazanır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 1 }));
    const state = forceAssassination(base, 'p2');
    const prepared: GameState = {
      ...state,
      notrSide: 'mavi',
      notrChoicePending: false,
      firstThreeResolved: true,
      players: state.players.map((p) =>
        p.id === 'p4' ? { ...p, effectiveTeam: 'demokrat' as const } : p,
      ),
    };
    const next = applyAction(prepared, 'p2', {
      type: 'assassinate',
      targetId: 'p1',
    });
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('demokrat');
    expect(next.winnerIds).toContain('p4');
    expect(next.winnerIds).not.toContain('p1');
  });

  it('tasfiye hedefleri ölmüşse kırmızı Nötr kişisel zafer kazanır', () => {
    const base = ackAll(
      makeControlledGame({ roles: ROLES_6, startPresidentIndex: 1 }),
    );
    const state = forceAssassination(base, 'p2');
    const prepared: GameState = {
      ...state,
      firstThreeResolved: true,
      notrSide: 'kirmizi',
      notrChoicePending: false,
      leadershipTransferred: true,
      leaderId: 'p4',
      bigVezirOutcome: 'idam',
      democraticPartyPresidentId: 'p4',
      players: state.players.map((p) => {
        if (p.id === 'p3' || p.id === 'p5') {
          return { ...p, alive: false, votePower: 0 };
        }
        if (p.id === 'p4') return { ...p, effectiveTeam: 'otokrat' as const };
        return p;
      }),
    };
    const next = applyAction(prepared, 'p2', {
      type: 'assassinate',
      targetId: 'p1',
    });
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('notr');
    expect(next.winnerIds).toEqual(['p4']);
  });
});

describe('gizlilik ve redaksiyon', () => {
  it('herkese açık durumda rol, deste, oy ve Nötr tarafı sızmaz', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceVote(base, 'p1', 'p2');
    const redacted = redactGameState(state, 'p2');
    const publicJson = JSON.stringify(redacted.public);

    expect(redacted.public.players.every((p) => !('role' in p))).toBe(true);
    expect(redacted.public.players.every((p) => !('votePower' in p))).toBe(true);
    expect(publicJson).not.toContain('"deck"');
    expect(publicJson).not.toContain('"votes"');
    expect(publicJson).not.toContain('"blockedVotePlayerId"');
    expect(publicJson).not.toContain('"leaderId"');
    expect(publicJson).not.toContain('"notrSide"');
    expect(publicJson).not.toContain('"intelligenceOfficeHolderId"');
    expect(publicJson).not.toContain('"legislative"');
    expect(publicJson).not.toContain('"pendingPeek"');
    expect(publicJson).not.toContain('"investigations"');

    expect(redacted.private.role).toBe('otokrat');
    expect(redacted.private.knownPlayers.map((p) => p.id)).toContain('p1');
    expect(redacted.private.legislativeCards).toBeNull();
  });

  it('Başkan ve Başbakan kartları yalnızca yetkili oyuncuya gösterilir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['demokratik', 'otokrat']);
    const presidentView: GameState = {
      ...state,
      phase: 'presidentDiscard',
      legislative: {
        presidentId: 'p1',
        chancellorId: 'p2',
        presidentCards: ['demokratik', 'otokrat', 'otokrat'],
        chancellorCards: null,
        presidentDiscard: null,
      },
    };
    const p1 = redactGameState(presidentView, 'p1');
    const p2 = redactGameState(presidentView, 'p2');
    const p3 = redactGameState(presidentView, 'p3');
    expect(p1.private.legislativeCards).toEqual([
      'demokratik',
      'otokrat',
      'otokrat',
    ]);
    expect(p2.private.legislativeCards).toBeNull();
    expect(p3.private.legislativeCards).toBeNull();
    expect(JSON.stringify(p1.public)).not.toContain('"demokratik"');

    const afterDiscard = applyAction(presidentView, 'p1', {
      type: 'president_discard',
      card: 'otokrat',
    });
    const chancellorView = redactGameState(afterDiscard, 'p2');
    expect(chancellorView.private.legislativeCards).toHaveLength(2);
    expect(redactGameState(afterDiscard, 'p3').private.legislativeCards).toBeNull();
  });

  it('soruşturma sonucu yalnızca yetkili oyuncuya gösterilir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state: GameState = {
      ...base,
      round: 2,
      intelligenceOfficeHolderId: 'p5',
    };
    const next = applyAction(state, 'p5', {
      type: 'investigate',
      targetId: 'p2',
    });
    expect(redactGameState(next, 'p5').private.investigations['p2']).toBe('kotu');
    expect(redactGameState(next, 'p1').private.investigations).toEqual({});
    expect(JSON.stringify(next.log)).not.toContain('kotu');
  });

  it('oy engelleme hedefi yalnızca engelleyene, engellendi bilgisi yalnızca hedefe gider', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    let state = forceVote(base, 'p1', 'p2');
    state = forceBlock(state, 'p1', state.round);
    state = applyAction(state, 'p1', { type: 'use_block', targetId: 'p3' });
    expect(redactGameState(state, 'p1').private.blockTargetId).toBe('p3');
    expect(redactGameState(state, 'p3').private.youWereBlocked).toBe(true);
    expect(redactGameState(state, 'p2').private.blockTargetId).toBeNull();
    expect(redactGameState(state, 'p2').private.youWereBlocked).toBe(false);
    expect(JSON.stringify(redactGameState(state, 'p2').public)).not.toContain(
      'blockedVotePlayerId',
    );
  });

  it('kart inceleme kartları yalnızca Başkan’a gösterilir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forcePeek(base, 'p1', ['demokratik', 'otokrat', 'otokrat']);
    expect(redactGameState(state, 'p1').private.pendingPeekCards).toEqual([
      'demokratik',
      'otokrat',
      'otokrat',
    ]);
    expect(redactGameState(state, 'p2').private.pendingPeekCards).toBeNull();
    expect(JSON.stringify(redactGameState(state, 'p2').public)).not.toContain(
      '"demokratik"',
    );
  });

  it('oyun sonunda tüm roller açıklanır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceLegislative(base, 'p1', 'p2', ['demokratik', 'otokrat']);
    const prepared: GameState = {
      ...state,
      enacted: { democratic: 5, fascist: 0 },
      policyHistory: ['demokratik', 'demokratik', 'demokratik', 'demokratik', 'demokratik'],
      firstThreeResolved: true,
      notrSide: 'mavi',
      notrChoicePending: false,
    };
    const revealed = applyAction(prepared, 'p2', {
      type: 'chancellor_enact',
      card: 'demokratik',
    });
    const next = closeGate(revealed);
    const redacted = redactGameState(next, 'p1');
    expect(redacted.public.revealedRoles).not.toBeNull();
    expect(Object.keys(redacted.public.revealedRoles ?? {})).toHaveLength(5);
  });
});

describe('soruşturma takvimi', () => {
  it('soruşturma hakkı 2. dönemde açılır, 2. Otokrat Reform’a bağlı değildir', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const firstRound: GameState = {
      ...base,
      round: 1,
      enacted: { democratic: 0, fascist: 3 },
      intelligenceOfficeHolderId: 'p5',
    };
    expect(() =>
      applyAction(firstRound, 'p5', { type: 'investigate', targetId: 'p2' }),
    ).toThrow(GameError);

    const secondRound: GameState = {
      ...base,
      round: 2,
      enacted: { democratic: 0, fascist: 0 },
      intelligenceOfficeHolderId: 'p5',
    };
    const next = applyAction(secondRound, 'p5', {
      type: 'investigate',
      targetId: 'p2',
    });
    expect(next.investigations['p5']?.['p2']).toBe('kotu');
    expect(() =>
      applyAction(next, 'p5', { type: 'investigate', targetId: 'p3' }),
    ).toThrow(GameError);

    // Yeni dönemde soruşturma hakkı yeniden açılır.
    const failedVote = voteAll(forceVote(next, 'p1', 'p2'), false);
    expect(failedVote.phase).toBe('voteResult');
    const nextRound = closeGate(failedVote);
    expect(nextRound.round).toBe(3);
    expect(nextRound.investigatedThisRound['p5']).toBeUndefined();
    const again = applyAction(nextRound, 'p5', {
      type: 'investigate',
      targetId: 'p3',
    });
    expect(again.investigations['p5']?.['p3']).toBe('iyi');
  });
});

describe('geçiş kapıları, açık oylama ve dönem özeti', () => {
  it('Büyük Vezir Demokratik tarafa geçip tek oya düşünce oylama açık yapılır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const openState: GameState = {
      ...forceVote(base, 'p1', 'p2'),
      firstThreeResolved: true,
      bigVezirOutcome: 'demokrat',
      notrChoicePending: false,
      notrSide: 'mavi',
      players: base.players.map((player) =>
        player.id === 'p3'
          ? { ...player, effectiveTeam: 'demokrat' as const, votePower: 1 }
          : player,
      ),
    };
    expect(redactGameState(openState, 'p1').public.openVoting).toBe(true);

    const votes: Record<string, boolean> = {
      p1: true,
      p2: true,
      p3: true,
      p4: false,
      p5: false,
    };
    let result = openState;
    for (const [id, choice] of Object.entries(votes)) {
      result = applyAction(result, id, { type: 'vote', choice });
    }

    expect(result.phase).toBe('voteResult');
    expect(result.lastVoteOpen).toBe(true);
    expect(result.lastVoteTally).toMatchObject({ yes: 3, no: 2 });
    const redacted = redactGameState(result, 'p1');
    expect(redacted.public.revealedVotes).toMatchObject({
      p1: true,
      p3: true,
      p4: false,
    });
    expect(redacted.public.lastVoteTally?.entries).toHaveLength(5);
  });

  it('gizli oylamada bireysel tercihler redaksiyonda saklanır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const state = forceVote(base, 'p1', 'p2');
    expect(redactGameState(state, 'p1').public.openVoting).toBe(false);

    const votes: Record<string, boolean> = {
      p1: true,
      p2: true,
      p3: true,
      p4: false,
      p5: false,
    };
    let result = state;
    for (const [id, choice] of Object.entries(votes)) {
      result = applyAction(result, id, { type: 'vote', choice });
    }

    const redacted = redactGameState(result, 'p1');
    expect(redacted.public.lastVoteOpen).toBe(false);
    expect(redacted.public.revealedVotes).toEqual({});
    expect(redacted.public.lastVoteTally?.entries).toEqual([]);
    expect(redacted.public.lastVoteTally).toMatchObject({ yes: 4, no: 2 });
  });

  it('oy sonucu ve dönem özeti yalnızca yetkili oyuncu ya da host tarafından kapatılır', () => {
    const base = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const result = voteAll(forceVote(base, 'p1', 'p2'), true);
    expect(result.phase).toBe('voteResult');
    expect(result.gateEndAt).not.toBeNull();
    expect(() =>
      applyAction(result, 'p3', { type: 'continue' }),
    ).toThrow(GameError);
    expect(redactGameState(result, 'p1').private.canContinue).toBe(true);
    expect(redactGameState(result, 'p3').private.canContinue).toBe(false);

    const legislative = closeGate(result, 'p1');
    expect(legislative.phase).toBe('presidentDiscard');
    expect(legislative.gateEndAt).toBeNull();

    const presidentCards = legislative.legislative?.presidentCards ?? [];
    const discarded = applyAction(legislative, 'p1', {
      type: 'president_discard',
      card: presidentCards[0],
    });
    const chancellorCards = discarded.legislative?.chancellorCards ?? [];
    const revealed = applyAction(discarded, 'p2', {
      type: 'chancellor_enact',
      card: chancellorCards[0],
    });
    expect(revealed.phase).toBe('policyReveal');

    const termEnd = closeGate(revealed, 'p1');
    expect(termEnd.phase).toBe('termEnd');
    expect(termEnd.termSummary).toMatchObject({
      round: 1,
      presidentId: 'p1',
      chancellorId: 'p2',
      voteResult: 'kabul',
      policy: chancellorCards[0],
      outcome: 'legislative',
      nextPresidentId: 'p2',
    });
    expect(termEnd.gateEndAt).not.toBeNull();
    expect(() =>
      applyAction(termEnd, 'p3', { type: 'end_term' }),
    ).toThrow(GameError);
    expect(redactGameState(termEnd, 'p1').private.canEndTerm).toBe(true);
    expect(redactGameState(termEnd, 'p3').private.canEndTerm).toBe(false);

    const nextRound = closeGate(termEnd, 'p1');
    expect(nextRound.phase).toBe('nomination');
    expect(nextRound.round).toBe(2);
    expect(nextRound.termSummary).toBeNull();
    expect(nextRound.gateEndAt).toBeNull();
  });
});

describe('botlar ve entegrasyon', () => {
  it('4 insan + 1 bot ile oyun başlar, bot geçerli aday gösterir ve oy kullanır', () => {
    const state = makeControlledGame({
      roles: ROLES_5,
      bots: [false, false, false, false, true],
      startPresidentIndex: 4,
    });
    let current = state;
    for (const player of state.players.filter((p) => !p.isBot)) {
      current = applyAction(current, player.id, { type: 'ack_role' });
    }
    current = autoResolveBots(current);
    expect(current.phase).toBe('voting');
    expect(current.chancellorId).not.toBeNull();
    expect(current.chancellorId).not.toBe('p5');
    expect(current.votes['p5']).toBeDefined();
  });

  it('tamamen botlardan oluşan oyun sona erer ve tüm rolleri açar', () => {
    const state = makeControlledGame({
      roles: ROLES_7,
      bots: [true, true, true, true, true, true, true],
      startPresidentIndex: 0,
    });
    const finished = autoResolveBots(state, mulberry32(99));
    expect(finished.phase).toBe('gameOver');
    expect(finished.winner).not.toBeNull();
    expect(finished.revealedRoles).not.toBeNull();
    expect(Object.keys(finished.revealedRoles ?? {})).toHaveLength(7);
  });

  it('bot konuşmaları gizli rol veya soruşturma bilgisi içermez', () => {
    const state = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const botLogs = state.log.filter((entry) => entry.kind === 'bot');
    for (const entry of botLogs) {
      expect(entry.text).not.toMatch(/Otokrat Lider|Büyük Vezir|Nötr|İstihbarat Başkanı/);
    }
  });

  it('yeniden başlatma rolleri ve geçmişi sıfırlar', () => {
    const state = ackAll(makeControlledGame({ startPresidentIndex: 0 }));
    const restarted = restartGame(state, mulberry32(5));
    expect(restarted.phase).toBe('roleReveal');
    expect(restarted.round).toBe(0);
    expect(restarted.policyHistory).toEqual([]);
    expect(restarted.winner).toBeNull();
    expect(restarted.players.every((p) => p.alive)).toBe(true);
  });
});
