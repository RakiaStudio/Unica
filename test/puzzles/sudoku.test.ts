import { describe, expect, it } from 'vitest';
import { ExactCoverError, isMinimal, sudoku } from '../../src/index.js';
import { countSudokuSolutions, isValidSudokuSolution, textToGrid } from '../helpers/brute-force.js';

/**
 * A 17-clue puzzle from Gordon Royle's collection of minimum-clue sudokus.
 * 17 is the proven minimum number of clues for a unique 9x9 sudoku
 * (McGuire, Tugemann & Civario, 2012).
 */
const SEVENTEEN =
  '000000010400000000020000000000050407008000300001090000300400200050100000000806000';

const SEVENTEEN_SOLUTION = [
  '693784512',
  '487512936',
  '125963874',
  '932651487',
  '568247391',
  '741398625',
  '319475268',
  '856129743',
  '274836159',
].join('\n');

describe('sudoku() reduction', () => {
  it('has 324 primary columns and 729 rows for 9x9', () => {
    const problem = sudoku().problem();
    expect(problem.primaryColumns).toBe(324);
    expect(problem.secondaryColumns).toBe(0);
    expect(problem.rows).toHaveLength(729);
    expect(problem.rows.every((row) => row.primary.length === 4)).toBe(true);
  });

  it('builds the problem once and reuses it', () => {
    const s = sudoku();
    expect(s.problem()).toBe(s.problem());
  });

  it('rowIndex and placement are inverses', () => {
    const s = sudoku();
    for (let index = 0; index < 729; index += 37) {
      expect(s.rowIndex(s.placement(index))).toBe(index);
    }
    expect(() => s.placement(729)).toThrow(ExactCoverError);
    expect(() => s.rowIndex({ row: 0, col: 0, value: 10 })).toThrow(ExactCoverError);
  });

  it('supports rectangular boxes', () => {
    const s = sudoku({ boxRows: 2, boxCols: 3 });
    expect(s.n).toBe(6);
    expect(s.problem().primaryColumns).toBe(4 * 36);
    const puzzle = s.generate({ seed: 'six' });
    const grid = textToGrid(puzzle.text.solution, 6);
    expect(isValidSudokuSolution(grid, 2, 3)).toBe(true);
    expect(countSudokuSolutions(textToGrid(puzzle.text.puzzle, 6), 2, 3)).toBe(1);
  });

  it('rejects impossible box sizes', () => {
    expect(() => sudoku({ boxRows: 0 })).toThrow(ExactCoverError);
    expect(() => sudoku({ boxRows: 6, boxCols: 7 })).toThrow(/text notation/);
  });
});

describe('sudoku() text notation', () => {
  it('parse and format round-trip, accepting 0 and . for empties', () => {
    const s = sudoku();
    const clues = s.parse(SEVENTEEN);
    expect(clues).toHaveLength(17);
    const text = s.format(clues);
    expect(text.replace(/\n/g, '')).toBe(SEVENTEEN.replace(/0/g, '.'));
    expect(s.parse(text)).toEqual(clues);
  });

  it('ignores whitespace', () => {
    const s = sudoku();
    expect(s.parse(SEVENTEEN_SOLUTION)).toEqual(s.parse(SEVENTEEN_SOLUTION.replace(/\n/g, ' ')));
  });

  it('rejects the wrong cell count and unknown symbols', () => {
    const s = sudoku();
    expect(() => s.parse('123')).toThrow(/expected 81 cells/);
    expect(() => s.parse(SEVENTEEN.replace('4', 'Z'))).toThrow(/not a symbol/);
  });

  it('uses letters beyond 9 for larger grids', () => {
    const s = sudoku({ boxRows: 4, boxCols: 4 });
    const index = s.rowIndex({ row: 0, col: 0, value: 16 });
    expect(s.format([index]).startsWith('G')).toBe(true);
    expect(s.parse(s.format([index]))).toEqual([index]);
  });
});

describe('sudoku() solving', () => {
  it('solves the 17-clue puzzle to its known solution', () => {
    expect(sudoku().solve(SEVENTEEN)).toBe(SEVENTEEN_SOLUTION);
    expect(sudoku().classify(SEVENTEEN).count).toBe('unique');
  });

  it('the oracle agrees that the 17-clue puzzle is unique and minimal', () => {
    expect(countSudokuSolutions(textToGrid(SEVENTEEN, 9), 3, 3)).toBe(1);
    const s = sudoku();
    expect(isMinimal(s.problem(), s.parse(SEVENTEEN))).toBe(true);
  });

  it('returns undefined for an under-determined grid', () => {
    const s = sudoku();
    expect(s.solve('.'.repeat(81))).toBeUndefined();
    expect(s.classify('.'.repeat(81)).count).toBe('multiple');
  });

  it('rejects a contradictory grid as malformed input rather than "no solution"', () => {
    const s = sudoku();
    // Two 1s in the first row: the clues are not even a partial solution.
    const text = '11' + '.'.repeat(79);
    expect(() => s.solve(text)).toThrow(/conflict/);
  });
});

describe('sudoku() generation', () => {
  it('is reproducible and reports what it did', () => {
    const s = sudoku();
    const a = s.generate({ seed: 'daily-2026-10-29' });
    const b = s.generate({ seed: 'daily-2026-10-29' });
    expect(a).toEqual(b);
    expect(a.clueCount).toBe(a.clues.length);
    expect(a.clueCount + a.removed.length).toBe(81);
    expect(a.minimal).toBe(true);
  });

  it('produces a puzzle the oracle finds unique, with a valid solution', () => {
    const s = sudoku();
    const puzzle = s.generate({ seed: 'oracle' });
    expect(countSudokuSolutions(textToGrid(puzzle.text.puzzle, 9), 3, 3)).toBe(1);
    expect(isValidSudokuSolution(textToGrid(puzzle.text.solution, 9), 3, 3)).toBe(true);
    expect(s.solve(puzzle.text.puzzle)).toBe(puzzle.text.solution);
  });

  it('never goes below the proven minimum of 17 clues', () => {
    const s = sudoku();
    for (let seed = 0; seed < 5; seed++) {
      expect(s.generate({ seed }).clueCount).toBeGreaterThanOrEqual(17);
    }
  });
});
