import { describe, expect, it } from 'vitest';
import {
  DEMOCRATIC_WIN_THRESHOLD,
  GAME_CONFIG,
  getInvestigationResult,
  getRoleCounts,
} from '../src/config/gameConfig';
import { startGame } from '../src/game/engine';
import { mulberry32 } from '../src/game/rng';
import type { Role } from '../src/game/types';

const PLAYER_COUNTS = [5, 6, 7, 8, 9, 10];

describe('rol dağılımı ve sabitler', () => {
  it('demokratik zafer eşiği tek kaynaktan 5 olarak gelir', () => {
    expect(DEMOCRATIC_WIN_THRESHOLD).toBe(5);
    expect(GAME_CONFIG.democraticWinThreshold).toBe(5);
  });

  it.each(PLAYER_COUNTS)('%i oyuncu için rol sayıları toplamı oyuncu sayısına eşittir', (count) => {
    const counts = getRoleCounts(count);
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(count);
    expect(counts.otokrat_lider).toBe(1);
    expect(counts.buyuk_vezir).toBe(1);
    expect(counts.notr).toBe(1);
    expect(counts.istihbarat_baskani).toBe(1);
  });

  it('5-10 arası her oyuncu sayısında rolleri benzersiz dağıtır', () => {
    for (const count of PLAYER_COUNTS) {
      const players = Array.from({ length: count }, (_, index) => ({
        id: `p${index + 1}`,
        name: `Oyuncu ${index + 1}`,
        avatarId: 'a1',
        isBot: false,
        isHost: index === 0,
        joinedAt: index,
      }));
      const state = startGame({ players, mode: 'local', rng: mulberry32(count) });
      const counts = getRoleCounts(count);
      const roles = state.players.map((p) => p.role);
      for (const role of Object.keys(counts) as Role[]) {
        expect(roles.filter((r) => r === role)).toHaveLength(counts[role]);
      }
      expect(new Set(state.players.map((p) => p.id)).size).toBe(count);
    }
  });

  it('deste 8 Demokratik ve 12 Otokrat kartından oluşur', () => {
    const players = Array.from({ length: 5 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Oyuncu ${index + 1}`,
      avatarId: 'a1',
      isBot: false,
      isHost: index === 0,
      joinedAt: index,
    }));
    const state = startGame({ players, mode: 'local', rng: mulberry32(1) });
    const allCards = [...state.deck, ...state.discardPile];
    expect(allCards.filter((card) => card === 'demokratik')).toHaveLength(8);
    expect(allCards.filter((card) => card === 'otokrat')).toHaveLength(12);
  });

  it('soruşturma sonucu yalnızca sıradan Otokrat için Kötü döner', () => {
    expect(getInvestigationResult('otokrat')).toBe('kotu');
    for (const role of [
      'otokrat_lider',
      'buyuk_vezir',
      'notr',
      'istihbarat_baskani',
      'sade_demokrat',
    ] as Role[]) {
      expect(getInvestigationResult(role)).toBe('iyi');
    }
  });

  it('Büyük Vezir 2, diğer rolleri 1 oy gücüyle başlar', () => {
    const players = Array.from({ length: 6 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Oyuncu ${index + 1}`,
      avatarId: 'a1',
      isBot: false,
      isHost: index === 0,
      joinedAt: index,
    }));
    const state = startGame({ players, mode: 'local', rng: mulberry32(3) });
    for (const player of state.players) {
      expect(player.votePower).toBe(player.role === 'buyuk_vezir' ? 2 : 1);
    }
  });
});
