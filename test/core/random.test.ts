import { describe, expect, it } from 'vitest';
import { createRng, permutation } from '../../src/index.js';

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('unica');
    const b = createRng('unica');
    const sequenceA = Array.from({ length: 50 }, () => a.next());
    const sequenceB = Array.from({ length: 50 }, () => b.next());
    expect(sequenceA).toEqual(sequenceB);
  });

  it('distinguishes numeric and string seeds and different seeds', () => {
    const fromNumber = createRng(42).next();
    const fromString = createRng('42').next();
    const other = createRng(43).next();
    expect(fromNumber).not.toBe(fromString);
    expect(fromNumber).not.toBe(other);
  });

  it('produces floats in [0, 1) and ints in [0, n)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      const bucket = rng.int(6);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(6);
    }
  });

  it('spreads ints roughly evenly', () => {
    const rng = createRng('distribution');
    const counts = new Array<number>(10).fill(0);
    const samples = 100_000;
    for (let i = 0; i < samples; i++) {
      const bucket = rng.int(10);
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }
    for (const count of counts) {
      // 10% expected per bucket; allow +-10% relative slack.
      expect(count).toBeGreaterThan(samples * 0.09);
      expect(count).toBeLessThan(samples * 0.11);
    }
  });

  it('rejects an invalid bound', () => {
    expect(() => createRng(1).int(0)).toThrow(RangeError);
    expect(() => createRng(1).int(2.5)).toThrow(RangeError);
  });
});

describe('permutation', () => {
  it('is a permutation of 0..n-1', () => {
    const result = permutation(100, createRng('perm'));
    expect([...result].sort((a, b) => a - b)).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it('handles the empty and singleton cases', () => {
    expect(permutation(0, createRng(1))).toEqual([]);
    expect(permutation(1, createRng(1))).toEqual([0]);
  });

  it('is not the identity for a non-trivial length', () => {
    expect(permutation(20, createRng('shuffled'))).not.toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
  });

  it('rejects a negative length', () => {
    expect(() => permutation(-1, createRng(1))).toThrow(RangeError);
  });
});
