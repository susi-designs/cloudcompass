/**
 * Small deterministic PRNG (mulberry32). Same seed → same sequence on every
 * machine, so tests and screenshots are stable (CLAUDE.md §7).
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  /** Random element of a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Approximately normal noise with mean 0 and the given std deviation. */
  gaussian(stdDev: number): number;
  /** true with probability p. */
  chance(p: number): boolean;
  /** Fisher–Yates shuffle into a new array (engine-independent, unlike sort-based shuffles). */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    pick: (items) => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error('pick() called with an empty array');
      return item;
    },
    gaussian: (stdDev) => {
      // Irwin–Hall approximation: sum of 6 uniforms.
      let sum = 0;
      for (let i = 0; i < 6; i += 1) sum += next();
      return (sum - 3) * stdDev * Math.SQRT2;
    },
    chance: (p) => next() < p,
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i] as (typeof out)[number];
        out[i] = out[j] as (typeof out)[number];
        out[j] = tmp;
      }
      return out;
    },
  };
  return rng;
}

/** Round to cents. */
export const round2 = (value: number): number => Math.round(value * 100) / 100;
