import type { Rng } from './types.ts';

/** Testlerde tekrarlanabilir rastgelelik için. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function secureRng(): Rng {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    return () => {
      const arr = new Uint32Array(1);
      cryptoObj.getRandomValues(arr);
      return arr[0] / 4294967296;
    };
  }
  return Math.random;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) {
    throw new Error('Boş listeden seçim yapılamaz.');
  }
  return items[Math.floor(rng() * items.length)];
}

export function chance(probability: number, rng: Rng): boolean {
  return rng() < probability;
}

export function randomInt(maxExclusive: number, rng: Rng): number {
  return Math.floor(rng() * maxExclusive);
}
