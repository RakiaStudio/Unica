import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TECHNIQUES, sudoku, type Step } from '../../src/index.js';
import {
  applyStep,
  fromValues,
  geometry,
  type CandidateGrid,
} from '../../src/puzzles/sudoku/candidates.js';
import { countSudokuSolutions, solveSudoku, textToGrid } from '../helpers/brute-force.js';

/**
 * Soundness of the techniques, checked against the answer from the
 * independent oracle. At every state the rater passes through, every
 * technique (not only the one the rater picked) is asked for a step, and that
 * step must agree with the solution: placements put the right symbol in an
 * empty cell, eliminations remove a symbol the solution does not have there.
 */

const seedArb = fc.oneof(fc.integer(), fc.string({ minLength: 1, maxLength: 16 }));

/**
 * Puzzles that need hard techniques, generated once with
 * `sudoku().generate({ seed: 'sound-hard-<i>', difficulty: 'hard' })` (0.2.0).
 * Hard puzzles are about 1 in 300, so generating them here would dominate the
 * test time; as fixtures they are checked for soundness only, which does not
 * depend on how they were found. `rate.test.ts` covers generating to `hard`.
 */
const HARD = [
  {
    hardest: 'x-wing',
    puzzle: '........51.946.....8....4..3...2.....58....3...18..5.4....5.69.2..6..7...6.287...',
  },
  {
    hardest: 'hidden triple',
    puzzle: '.......2..1.93....43........9....1..5..3..9.7.76.....3.594........7.18...47.6....',
  },
  {
    hardest: 'naked triple',
    puzzle: '.9..87.3..56.4.............6......5...21.6..9.......87..4.9.....1.7.8.9...7..5..8',
  },
  {
    hardest: 'x-wing',
    puzzle: '.1......7..8.....22...3.9..5...4...6..36..7...8....1..4.....2..82.7.9..4.....5.7.',
  },
  {
    hardest: 'naked triple',
    puzzle: '.......24.4..9.5..3.7..6...1.......5.6..3.....7..812....46.3...5....8.9........52',
  },
  {
    hardest: 'naked triple',
    puzzle: '.5.6..1.3.8.....5........26...59.....6..14...4....25..67..........287..1..1...49.',
  },
  {
    hardest: 'naked triple',
    puzzle: '...4...2..3...5.9.154.........9.4......36...1..6....8..9....2..6...8.7..2.5....68',
  },
  {
    hardest: 'naked triple',
    puzzle: '.76..194..8.5..1....4....7.1..7..5.....36.....63...8.......7......98...3.......9.',
  },
];

let checkedSteps = 0;

/**
 * Batch numbers for running `total` property runs as tests of `size` runs
 * each. One long synchronous test can starve the vitest worker's RPC on CI
 * ("Timeout calling onTaskUpdate"); each batch's `fc.assert` draws its own
 * random seed, so the batches together cover `total` distinct runs.
 */
function batches(total: number, size: number): number[] {
  return Array.from({ length: total / size }, (_, i) => i + 1);
}

function expectSound(grid: CandidateGrid, step: Step, solution: readonly number[]): void {
  const { n } = grid.geometry;
  for (const { row, col, value } of step.placements) {
    expect(grid.values[row * n + col], step.reason).toBe(0);
    expect(solution[row * n + col], step.reason).toBe(value);
  }
  for (const { row, col, value } of step.eliminations) {
    expect(solution[row * n + col], step.reason).not.toBe(value);
  }
  expect(step.placements.length + step.eliminations.length).toBeGreaterThan(0);
  checkedSteps++;
}

/** Walk the rating, checking every technique at every state and the final grid. */
function walk(boxRows: number, boxCols: number, text: string): void {
  const s = sudoku({ boxRows, boxCols });
  const n = boxRows * boxCols;
  const answer = solveSudoku(textToGrid(text, n), boxRows, boxCols);
  if (answer === undefined) throw new Error('generated puzzle has no solution');
  const solution = answer.flat();
  const rating = s.rate(text);
  let grid = fromValues(geometry(boxRows, boxCols), s.toGrid(s.parse(text)).flat());
  const states = [grid];
  for (const step of rating.steps) {
    grid = applyStep(grid, step);
    states.push(grid);
  }
  for (const state of states) {
    for (const technique of TECHNIQUES) {
      const step = technique.find(state);
      if (step !== undefined) expectSound(state, step, solution);
    }
  }
  // Completeness: a solved rating ends on the oracle's answer.
  if (rating.solved) expect(grid.values).toEqual(solution);
}

describe('rating: soundness against the oracle', () => {
  for (const batch of batches(100, 10)) {
    it(`on generated 9x9 puzzles (batch ${String(batch)})`, () => {
      fc.assert(
        fc.property(seedArb, (seed) => {
          walk(3, 3, sudoku().generate({ seed }).text.puzzle);
        }),
        { numRuns: 10 },
      );
    });
  }

  for (const batch of batches(30, 5)) {
    it(`on generated 9x9 puzzles that need medium techniques (batch ${String(batch)})`, () => {
      const s = sudoku();
      fc.assert(
        fc.property(seedArb, (seed) => {
          const puzzle = s.generate({ seed, difficulty: 'medium' });
          walk(3, 3, puzzle.text.puzzle);
          // Reproducible: the same seed walks the same attempts to the same puzzle.
          expect(s.generate({ seed, difficulty: 'medium' })).toEqual(puzzle);
        }),
        { numRuns: 5 },
      );
    });
  }

  for (const batch of batches(30, 5)) {
    it(`on generated 9x9 puzzles that need expert techniques (batch ${String(batch)})`, () => {
      const s = sudoku();
      fc.assert(
        fc.property(seedArb, (seed) => {
          walk(3, 3, s.generate({ seed, difficulty: 'expert' }).text.puzzle);
        }),
        { numRuns: 5 },
      );
    });
  }

  it('on 9x9 puzzles that need hard techniques', () => {
    for (const { puzzle, hardest } of HARD) {
      expect(countSudokuSolutions(textToGrid(puzzle, 9), 3, 3)).toBe(1);
      expect(sudoku().rate(puzzle)).toMatchObject({ difficulty: 'hard', hardest });
      walk(3, 3, puzzle);
    }
  });

  it('on generated 4x4 and 6x6 puzzles', () => {
    fc.assert(
      fc.property(seedArb, fc.constantFrom([2, 2], [2, 3], [3, 2]), (seed, [boxRows, boxCols]) => {
        walk(boxRows, boxCols, sudoku({ boxRows, boxCols }).generate({ seed }).text.puzzle);
      }),
      { numRuns: 100 },
    );
  });

  it('checked a meaningful number of steps', () => {
    // Runs after the property tests above; guards against a walk that checks nothing.
    expect(checkedSteps).toBeGreaterThan(1000);
  });
});
