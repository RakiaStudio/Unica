import { describe, expect, it } from 'vitest';
import {
  ExactCoverError,
  createRng,
  generate,
  isMinimal,
  isUnique,
  randomSolution,
  type ExactCoverProblem,
} from '../../src/index.js';
import { knuthExample, knuthSolution } from '../fixtures/knuth.js';

/** 2 x 2 x 2 = 8 solutions over three independent columns. */
const eightSolutions: ExactCoverProblem<string> = {
  primaryColumns: 3,
  secondaryColumns: 0,
  rows: [
    { option: 'a0', primary: [0] },
    { option: 'a1', primary: [0] },
    { option: 'b0', primary: [1] },
    { option: 'b1', primary: [1] },
    { option: 'c0', primary: [2] },
    { option: 'c1', primary: [2] },
  ],
};

describe('generate', () => {
  it('is reproducible from its seed', () => {
    const first = generate(eightSolutions, { seed: 'repro' });
    const second = generate(eightSolutions, { seed: first.seed });
    expect(second).toEqual(first);
  });

  it('reports a seed even when none was given', () => {
    const puzzle = generate(eightSolutions);
    expect(puzzle.seed).toBeTruthy();
    expect(generate(eightSolutions, { seed: puzzle.seed })).toEqual(puzzle);
  });

  it('produces clues that are a subset of a valid solution', () => {
    const puzzle = generate(eightSolutions, { seed: 1 });
    const solutionSet = new Set(puzzle.solution);
    expect(puzzle.clues.every((clue) => solutionSet.has(clue))).toBe(true);
    expect(puzzle.solution).toHaveLength(3);
    expect(puzzle.clues.length + puzzle.removed.length).toBe(3);
  });

  it('produces a unique and minimal puzzle', () => {
    // Every column has two interchangeable rows, so all three clues are needed.
    const puzzle = generate(eightSolutions, { seed: 'minimal' });
    expect(puzzle.minimal).toBe(true);
    expect(puzzle.clues).toHaveLength(3);
    expect(puzzle.removed).toEqual([]);
    expect(isUnique(eightSolutions, puzzle.clues)).toBe(true);
    expect(isMinimal(eightSolutions, puzzle.clues)).toBe(true);
  });

  it('removes every clue when the problem is unique on its own', () => {
    const puzzle = generate(knuthExample, { seed: 'knuth' });
    expect(puzzle.solution).toEqual([...knuthSolution]);
    expect(puzzle.clues).toEqual([]);
    expect(puzzle.removed).toHaveLength(3);
    expect(puzzle.minimal).toBe(true);
  });

  it('can start from a given solution', () => {
    const puzzle = generate(eightSolutions, { seed: 'given', solution: [1, 2, 5] });
    expect(puzzle.solution).toEqual([1, 2, 5]);
    expect(puzzle.clues).toEqual([1, 2, 5]);
  });

  it('stops early at stopAtClues and says the result may not be minimal', () => {
    // Knuth's example needs zero clues, so stopping at 2 leaves redundant ones.
    const puzzle = generate(knuthExample, { seed: 'stop', stopAtClues: 2 });
    expect(puzzle.clues).toHaveLength(2);
    expect(puzzle.minimal).toBe(false);
    expect(isUnique(knuthExample, puzzle.clues)).toBe(true);
  });

  it('throws when the problem has no solution', () => {
    const impossible: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 0,
      rows: [{ option: 'a', primary: [0] }],
    };
    expect(() => generate(impossible, { seed: 1 })).toThrow(ExactCoverError);
  });
});

describe('randomSolution', () => {
  it('returns a valid, sorted solution', () => {
    const solution = randomSolution(eightSolutions, createRng('rs'));
    expect(solution).toHaveLength(3);
    expect([...solution].sort((a, b) => a - b)).toEqual(solution);
    expect(isUnique(eightSolutions, solution)).toBe(true);
  });

  it('varies with the seed', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      seen.add(randomSolution(eightSolutions, createRng(seed)).join(','));
    }
    // Eight solutions exist; forty seeds should find more than one of them.
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('generate: options.solution validation', () => {
  it('rejects a solution that does not cover the problem', () => {
    // Rows 1 and 2 cover columns 0 and 1; column 2 is left uncovered.
    expect(() => generate(eightSolutions, { seed: 1, solution: [1, 2] })).toThrow(
      /not an exact cover/,
    );
    // Rows 0 and 1 both cover column 0: not a cover either.
    expect(() => generate(eightSolutions, { seed: 1, solution: [0, 1, 2, 4] })).toThrow(
      ExactCoverError,
    );
  });

  it('rejects a partial cover even when the rest is forced', () => {
    // {B, D} extends uniquely to {B, D, F}, but it is not itself a cover.
    expect(() => generate(knuthExample, { seed: 1, solution: [1, 3] })).toThrow(
      /not an exact cover/,
    );
  });

  it('accepts a valid solution in any order and normalises it', () => {
    const puzzle = generate(eightSolutions, { seed: 'order', solution: [5, 2, 1] });
    expect(puzzle.solution).toEqual([1, 2, 5]);
  });
});
