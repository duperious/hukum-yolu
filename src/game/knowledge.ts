import { getPlayer } from './helpers';
import type { GameState, KnownPlayer } from './types';

/**
 * Bir oyuncunun kurallara göre tanıdığı diğer oyuncular.
 * Bu bilgi yalnızca ilgili oyuncunun özel görünümüne gönderilir.
 */
export function getKnownPlayersFor(state: GameState, playerId: string): KnownPlayer[] {
  const viewer = getPlayer(state, playerId);
  if (!viewer) return [];
  const total = state.players.length;
  const known: KnownPlayer[] = [];

  if (viewer.role === 'otokrat_lider') {
    for (const p of state.players) {
      if (p.id !== viewer.id && p.role === 'otokrat') {
        known.push({ id: p.id, name: p.name, role: p.role });
      }
    }
  } else if (viewer.role === 'otokrat') {
    for (const p of state.players) {
      if (p.id === viewer.id) continue;
      if (total <= 6) {
        if (p.role === 'otokrat' || p.role === 'otokrat_lider') {
          known.push({ id: p.id, name: p.name, role: p.role });
        }
      } else if (p.role === 'otokrat') {
        known.push({ id: p.id, name: p.name, role: p.role });
      }
    }
  }
  return known;
}

/** Botun rolüne göre güvendiği, kesin olarak Otokrat takımından bildiği oyuncular. */
export function knownFascistIds(state: GameState, botId: string): Set<string> {
  const bot = getPlayer(state, botId);
  const result = new Set<string>();
  if (!bot) return result;
  if (bot.role === 'otokrat_lider') {
    for (const p of state.players) {
      if (p.id !== bot.id && p.role === 'otokrat') result.add(p.id);
    }
  } else if (bot.role === 'otokrat') {
    for (const p of state.players) {
      if (p.id === bot.id) continue;
      if (state.players.length <= 6) {
        if (p.role === 'otokrat' || p.role === 'otokrat_lider') result.add(p.id);
      } else if (p.role === 'otokrat') {
        result.add(p.id);
      }
    }
  }
  return result;
}
