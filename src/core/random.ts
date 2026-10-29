/**
 * Deterministic randomness. Every generated puzzle carries the seed that
 * produced it, so a bug report is a seed, not a screenshot.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). `n` must be a positive integer. */
  int(n: number): number;
}

export type Seed = number | string;

/**
 * sfc32 ("Small Fast Counter"), a public-domain 32-bit PRNG by Chris Doty-Humphrey
 * that passes PractRand. Four 32-bit words of state, seeded through a string hash so
 * that human-readable seeds ("daily-2026-10-29") are as good as numeric ones.
 */
export function createRng(seed: Seed): Rng {
  const [a0, b0, c0, d0] = hashSeed(seed);
  let a = a0;
  let b = b0;
  let c = c0;
  let d = d0;

  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };

  // Discard the first outputs: sfc32 needs a few rounds to mix a weak seed.
  for (let i = 0; i < 12; i++) next();

  return {
    next,
    int(n: number): number {
      if (!Number.isInteger(n) || n < 1) {
        throw new RangeError(`int(n): n must be a positive integer, got ${String(n)}`);
      }
      return Math.floor(next() * n);
    },
  };
}

/** Expand any seed into four 32-bit words with MurmurHash3's x86 32-bit finalizer mix. */
function hashSeed(seed: Seed): [number, number, number, number] {
  const text = typeof seed === 'number' ? `n:${String(seed)}` : `s:${seed}`;
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const word = (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
  return [word(), word(), word(), word()];
}

/**
 * A uniformly random permutation of `0..n-1` (Fisher-Yates). The generator only
 * ever needs to shuffle *indices*, which keeps this free of generic index juggling.
 */
export function permutation(n: number, rng: Rng): number[] {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`permutation(n): n must be a non-negative integer, got ${String(n)}`);
  }
  const items = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const a = elementAt(items, i);
    const b = elementAt(items, j);
    items[i] = b;
    items[j] = a;
  }
  return items;
}

function elementAt(items: readonly number[], index: number): number {
  const value = items[index];
  if (value === undefined) {
    throw new RangeError(`index ${String(index)} out of range`);
  }
  return value;
}
