import { describe, expect, it } from 'vitest';
import {
  DancingLinksSolver,
  ExactCoverError,
  MAX_QUEENS,
  isMinimal,
  queens,
} from '../../src/index.js';
import { countQueens } from '../helpers/brute-force.js';

const solver = new DancingLinksSolver();

// Known counts of N-queens solutions (OEIS A000170).
const KNOWN: readonly [number, number][] = [
  [1, 1],
  [2, 0],
  [3, 0],
  [4, 2],
  [5, 10],
  [6, 4],
  [7, 40],
  [8, 92],
];

describe('queens oracle', () => {
  it('counts the known number of solutions on empty boards', () => {
    for (const [n, count] of KNOWN) {
      expect(countQueens('.'.repeat(n * n), n, 1000)).toBe(count);
    }
  });

  it('rejects given queens that attack each other', () => {
    expect(countQueens('Q.......Q' + '.'.repeat(72), 9)).toBe(0);
    expect(countQueens('QQ..' + '.'.repeat(12), 4)).toBe(0);
    expect(countQueens('Q....Q..' + '.'.repeat(56), 8)).toBe(0);
  });
});

describe('queens()', () => {
  it('reduces to exact cover with the known number of solutions', () => {
    for (const [n, count] of KNOWN) {
      const board = queens({ n });
      expect(board.problem().primaryColumns).toBe(2 * n);
      expect(board.problem().secondaryColumns).toBe(2 * (2 * n - 1));
      expect(solver.solve(board.problem(), 1000)).toHaveLength(count);
    }
  });

  it('defaults to 8 queens', () => {
    expect(queens().n).toBe(8);
  });

  it('formats and parses board text', () => {
    const board = queens({ n: 4 });
    const text = '.Q..\n...Q\nQ...\n..Q.';
    const rows = board.parse(text);
    expect(rows).toEqual([1, 7, 8, 14]);
    expect(board.format(rows)).toBe(text);
    expect(board.parse(text.toLowerCase())).toEqual(rows);
  });

  it('solves a board with one completion, and not one with several', () => {
    const board = queens({ n: 4 });
    expect(board.solve('.Q..\n....\n....\n....')).toBe('.Q..\n...Q\nQ...\n..Q.');
    expect(board.solve('.'.repeat(16))).toBeUndefined();
  });

  it('generates a unique, minimal, reproducible puzzle', () => {
    const board = queens();
    const puzzle = board.generate({ seed: 'queens' });
    expect(countQueens(puzzle.text.puzzle, 8)).toBe(1);
    expect(isMinimal(board.problem(), puzzle.clues)).toBe(true);
    expect(puzzle.minimal).toBe(true);
    expect(board.solve(puzzle.text.puzzle)).toBe(puzzle.text.solution);
    expect(puzzle.text.solution.split('Q')).toHaveLength(9);
    expect(board.generate({ seed: 'queens' })).toEqual(puzzle);
  });

  it('rejects bad sizes and bad text', () => {
    expect(() => queens({ n: 0 })).toThrow(ExactCoverError);
    expect(() => queens({ n: 2.5 })).toThrow(ExactCoverError);
    expect(() => queens({ n: MAX_QUEENS + 1 })).toThrow(/n must be an integer from 1 to 32/);
    const board = queens({ n: 4 });
    expect(() => board.parse('....')).toThrow(/expected 16 squares, got 4/);
    expect(() => board.parse('X' + '.'.repeat(15))).toThrow(/square 0: 'X'/);
    expect(() => board.format([16])).toThrow(/row index out of range: 16/);
    expect(() => queens({ n: 3 }).generate({ seed: 1 })).toThrow(ExactCoverError);
  });
});
