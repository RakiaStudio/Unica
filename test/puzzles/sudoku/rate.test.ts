import { describe, expect, it } from 'vitest';
import {
  DIFFICULTIES,
  ExactCoverError,
  TARGET_DIFFICULTIES,
  compareRatings,
  sudoku,
} from '../../../src/index.js';
import { applyStep, fromValues, geometry } from '../../../src/puzzles/sudoku/candidates.js';
import { countSudokuSolutions, solveSudoku, textToGrid } from '../../helpers/brute-force.js';

/** Royle's 17-clue puzzle; also in sudoku.test.ts with its solution. */
const SEVENTEEN =
  '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
const SEVENTEEN_SOLUTION =
  '693784512487512936125963874932651487568247391741398625319475268856129743274836159';

/** "Easter Monster", a well-known 9x9 puzzle that needs far more than x-wing. */
const EASTER_MONSTER =
  '1.......2.9.4...5...6...7...5.9.3.......7.......85..4.7.....6...3...9.8...2.....1';

/** Replay a rating's steps from the givens and return the final grid as digits. */
function replay(text: string): string {
  const s = sudoku();
  const rating = s.rate(text);
  let grid = fromValues(geometry(3, 3), s.toGrid(s.parse(text)).flat());
  for (const step of rating.steps) grid = applyStep(grid, step);
  return grid.values.join('');
}

describe('rate', () => {
  it('rates the 17-clue puzzle easy and solves it to the known answer', () => {
    const rating = sudoku().rate(SEVENTEEN);
    expect(rating.solved).toBe(true);
    expect(rating.difficulty).toBe('easy');
    expect(rating.hardest).toBe('hidden single');
    expect(rating.steps).toHaveLength(81 - 17);
    expect(rating.levels).toEqual({ easy: 64, medium: 0, hard: 0, expert: 0, master: 0 });
    expect((rating.uses['naked single'] ?? 0) + (rating.uses['hidden single'] ?? 0)).toBe(64);
    expect(replay(SEVENTEEN)).toBe(SEVENTEEN_SOLUTION);
  });

  it('rates Easter Monster beyond: it is unique, but nothing here applies', () => {
    expect(countSudokuSolutions(textToGrid(EASTER_MONSTER, 9), 3, 3)).toBe(1);
    const rating = sudoku().rate(EASTER_MONSTER);
    expect(rating).toEqual({
      solved: false,
      difficulty: 'beyond',
      hardest: undefined,
      steps: [],
      uses: {},
      levels: { easy: 0, medium: 0, hard: 0, expert: 0, master: 0 },
    });
  });

  it('rates a full grid easy with no steps', () => {
    const rating = sudoku().rate(SEVENTEEN_SOLUTION);
    expect(rating).toEqual({
      solved: true,
      difficulty: 'easy',
      hardest: undefined,
      steps: [],
      uses: {},
      levels: { easy: 0, medium: 0, hard: 0, expert: 0, master: 0 },
    });
  });

  it('rates a puzzle with no solution beyond', () => {
    // r1c9 has no candidate: its row holds 1-8 and its column holds 9.
    const text = '12345678.' + '........9' + '.'.repeat(63);
    expect(solveSudoku(textToGrid(text, 9), 3, 3)).toBeUndefined();
    const rating = sudoku().rate(text);
    expect(rating.solved).toBe(false);
    expect(rating.difficulty).toBe('beyond');
  });

  it('rates small and rectangular grids', () => {
    const four = sudoku({ boxRows: 2, boxCols: 2 });
    expect(four.rate(four.generate({ seed: 1 }).text.puzzle).solved).toBe(true);
    const six = sudoku({ boxRows: 2, boxCols: 3 });
    const rating = six.rate(six.generate({ seed: 'six' }).text.puzzle);
    expect(DIFFICULTIES).toContain(rating.difficulty);
  });

  it('refuses grids of more than 32 symbols', () => {
    const big = sudoku({ boxRows: 5, boxCols: 7 });
    expect(() => big.rate('.'.repeat(35 * 35))).toThrow(ExactCoverError);
  });
});

describe('compareRatings', () => {
  it('orders by difficulty, then by uses of the hardest level, then by steps above easy', () => {
    const s = sudoku();
    const easy = s.rate(SEVENTEEN);
    const medium = s.generate({ seed: 'daily-2026-10-29', difficulty: 'medium' }).rating;
    const stuck = s.rate(EASTER_MONSTER);
    expect(compareRatings(easy, medium)).toBeLessThan(0);
    expect(compareRatings(medium, stuck)).toBeLessThan(0);
    expect(compareRatings(stuck, stuck)).toBe(0);
    // Within easy, more easy steps count as harder: a full grid needs none.
    expect(compareRatings(easy, s.rate(SEVENTEEN_SOLUTION))).toBeGreaterThan(0);
    const once = { ...medium, levels: { ...medium.levels, medium: 1 } };
    const twice = { ...medium, levels: { ...medium.levels, medium: 2 } };
    expect(compareRatings(once, twice)).toBeLessThan(0);
    const moreEasy = { ...once, steps: [...once.steps, ...once.steps] };
    expect(compareRatings(once, { ...moreEasy, levels: once.levels })).toBeLessThan(0);
  });
});

describe('explain', () => {
  it('lists each step and ends with a summary', () => {
    const lines = sudoku().explain(SEVENTEEN);
    expect(lines).toHaveLength(65);
    expect(lines[0]).toMatch(/^1\. (Naked|Hidden) single: /);
    expect(lines.at(-1)).toBe('Solved: easy, hardest technique hidden single.');
  });

  it('says when there was nothing to do', () => {
    expect(sudoku().explain(SEVENTEEN_SOLUTION)).toEqual(['Solved: nothing to do (easy).']);
  });

  it('says when it got stuck', () => {
    const lines = sudoku().explain(EASTER_MONSTER);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^Stuck: .*\(beyond\)/);
  });
});

describe('generate with a difficulty', () => {
  const s = sudoku();

  it('prints what the README says', () => {
    const puzzle = s.generate({ seed: 'daily-2026-10-29', difficulty: 'medium' });
    expect(puzzle.rating.difficulty).toBe('medium');
    expect(puzzle.rating.hardest).toBe('naked pair');
    expect(puzzle.attempts).toBe(12);
    expect(puzzle.seed).toBe('daily-2026-10-29:12');
    const lines = s.explain(puzzle.text.puzzle);
    expect(lines.slice(0, 2)).toEqual([
      '1. Naked single: r1c3 can only be 8',
      '2. Hidden single: 6 can only go in r2c2 within row 2',
    ]);
    expect(lines[22]).toBe(
      '23. Naked pair: r7c4 and r7c6 hold only 2 and 5 between them, so 2 and 5 leave the other cells of row 7',
    );
    expect(lines.at(-1)).toBe('Solved: medium, hardest technique naked pair.');
    const ja = s.explain(puzzle.text.puzzle, { locale: 'ja' });
    expect(ja.slice(0, 2)).toEqual([
      '1. Naked single：1行3列 に入るのは 8 だけ',
      '2. Hidden single：2行目で 6 が入るのは 2行2列 だけ',
    ]);
    expect(ja.at(-1)).toBe('解けました：難易度は「ふつう」、最も強い手筋は「Naked pair」です。');
  });

  for (const difficulty of TARGET_DIFFICULTIES) {
    it(`finds a ${difficulty} puzzle, unique by the oracle, that re-rates the same`, () => {
      const puzzle = s.generate({ seed: 'target', difficulty });
      expect(puzzle.rating.difficulty).toBe(difficulty);
      expect(s.rate(puzzle.text.puzzle)).toEqual(puzzle.rating);
      expect(countSudokuSolutions(textToGrid(puzzle.text.puzzle, 9), 3, 3)).toBe(1);
      expect(puzzle.minimal).toBe(true);
      expect(puzzle.attempts).toBeGreaterThanOrEqual(1);
      // Same options, same result; the returned seed alone gives the same puzzle.
      expect(s.generate({ seed: 'target', difficulty })).toEqual(puzzle);
      expect(s.generate({ seed: puzzle.seed }).text.puzzle).toBe(puzzle.text.puzzle);
    });
  }

  it('derives later attempts from the base seed', () => {
    const puzzle = s.generate({ seed: 'target', difficulty: 'hard' });
    expect(puzzle.attempts).toBeGreaterThan(1);
    expect(puzzle.seed).toBe(`target:${String(puzzle.attempts)}`);
  });

  it('works without a seed and reports the one it used', () => {
    const puzzle = s.generate({ difficulty: 'easy' });
    const base = puzzle.attempts === 1 ? puzzle.seed : String(puzzle.seed).split(':')[0];
    expect(base).toBeDefined();
    expect(s.generate({ seed: puzzle.seed }).text.puzzle).toBe(puzzle.text.puzzle);
  });

  it('gives up after maxAttempts', () => {
    const four = sudoku({ boxRows: 2, boxCols: 2 });
    expect(() => four.generate({ seed: 's', difficulty: 'hard', maxAttempts: 5 })).toThrow(
      /no hard puzzle in 5 attempts from seed s/,
    );
  });

  it('does not aim for beyond, even from untyped callers', () => {
    // A caller without types, such as plain JavaScript, can still pass it.
    const options: unknown = { seed: 1, difficulty: 'beyond' };
    expect(() => {
      Reflect.apply(s.generate.bind(s), undefined, [options]);
    }).toThrow(/difficulty must be one of easy, medium, hard, expert, master, got beyond/);
  });

  it('rejects a bad maxAttempts', () => {
    expect(() => s.generate({ seed: 1, difficulty: 'easy', maxAttempts: 0 })).toThrow(
      ExactCoverError,
    );
    expect(() => s.generate({ seed: 1, difficulty: 'easy', maxAttempts: 1.5 })).toThrow(
      /maxAttempts must be a positive integer, got 1.5/,
    );
  });

  it('without a difficulty, behaves exactly as before', () => {
    const plain = s.generate({ seed: 'plain' });
    expect(plain).not.toHaveProperty('rating');
    expect(plain).not.toHaveProperty('attempts');
  });
});
