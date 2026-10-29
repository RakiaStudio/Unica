import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  PENTOMINOES,
  classify,
  createRng,
  generate,
  isMinimal,
  isUnique,
  permutation,
  polyominoTiling,
  sudoku,
  type ExactCoverProblem,
} from '../../src/index.js';
import { countSudokuSolutions, isValidSudokuSolution, textToGrid } from '../helpers/brute-force.js';

/**
 * The guarantees the library sells, stated as properties and checked against
 * randomly chosen seeds. The uniqueness verdicts below come from the
 * independent backtracking oracle in test/helpers, not from the engine.
 */

const seedArb = fc.oneof(fc.integer(), fc.string({ minLength: 1, maxLength: 16 }));

describe('generate: properties', () => {
  it('every generated 4x4 sudoku is unique (oracle) and minimal', () => {
    const s = sudoku({ boxRows: 2, boxCols: 2 });
    fc.assert(
      fc.property(seedArb, (seed) => {
        const puzzle = s.generate({ seed });
        expect(countSudokuSolutions(textToGrid(puzzle.text.puzzle, 4), 2, 2)).toBe(1);
        expect(isValidSudokuSolution(textToGrid(puzzle.text.solution, 4), 2, 2)).toBe(true);
        expect(puzzle.minimal).toBe(true);
        expect(isMinimal(s.problem(), puzzle.clues)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('every generated 9x9 sudoku is unique (oracle), minimal and reproducible', () => {
    const s = sudoku();
    fc.assert(
      fc.property(seedArb, (seed) => {
        const puzzle = s.generate({ seed });
        expect(countSudokuSolutions(textToGrid(puzzle.text.puzzle, 9), 3, 3)).toBe(1);
        expect(isValidSudokuSolution(textToGrid(puzzle.text.solution, 9), 3, 3)).toBe(true);
        expect(isMinimal(s.problem(), puzzle.clues)).toBe(true);
        expect(s.generate({ seed })).toEqual(puzzle);
      }),
      { numRuns: 12 },
    );
  });

  it('the clue set is a fixed point of reduction: no single clue can still be removed', () => {
    const s = sudoku({ boxRows: 2, boxCols: 2 });
    fc.assert(
      fc.property(seedArb, (seed) => {
        const puzzle = s.generate({ seed });
        for (const clue of puzzle.clues) {
          const without = puzzle.clues.filter((other) => other !== clue);
          expect(classify(s.problem(), without).count).not.toBe('unique');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('a generated pentomino puzzle on 3x20 is unique and minimal', () => {
    const tiling = polyominoTiling({ width: 20, height: 3, pieces: PENTOMINOES });
    fc.assert(
      fc.property(seedArb, (seed) => {
        const puzzle = tiling.generate({ seed });
        expect(isUnique(tiling.problem(), puzzle.clues)).toBe(true);
        expect(isMinimal(tiling.problem(), puzzle.clues)).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it('on a product of independent binary choices, every clue is necessary', () => {
    // k columns, each coverable by exactly two rows: 2^k solutions. The only
    // unique puzzles are the ones that fix all k columns.
    const problemOfSize = (k: number): ExactCoverProblem<string> => ({
      primaryColumns: k,
      secondaryColumns: 0,
      rows: Array.from({ length: 2 * k }, (_, i) => ({
        option: `r${String(i)}`,
        primary: [i >> 1],
      })),
    });
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), seedArb, (k, seed) => {
        const puzzle = generate(problemOfSize(k), { seed });
        expect(puzzle.clues).toHaveLength(k);
        expect(puzzle.removed).toEqual([]);
        expect(puzzle.minimal).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

describe('permutation: properties', () => {
  it('is always a bijection on 0..n-1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), seedArb, (n, seed) => {
        const result = permutation(n, createRng(seed));
        expect(result).toHaveLength(n);
        expect(new Set(result).size).toBe(n);
        expect(result.every((value) => Number.isInteger(value) && value >= 0 && value < n)).toBe(
          true,
        );
      }),
    );
  });
});
