import { describe, expect, it } from 'vitest';
import { PENTOMINOES, polyominoTiling, queens, sudoku } from '../../src/index.js';
import { PENTOMINO, QUEENS, SUDOKU } from '../fixtures/generated-0.6.2.js';

const flat = (text: string): string => text.replace(/\s+/g, '');

/**
 * Reproducible across versions for plain `generate`, not only for sudoku with a
 * difficulty (see test/puzzles/sudoku/compat.test.ts): the same seed gives the
 * puzzle the published packages gave.
 */
describe('plain generate, compared with the published packages', () => {
  for (const fixture of SUDOKU) {
    it(`sudoku ${String(fixture.boxRows)}x${String(fixture.boxCols)} boxes, seed ${String(fixture.seed)}`, () => {
      const puzzle = sudoku({ boxRows: fixture.boxRows, boxCols: fixture.boxCols }).generate({
        seed: fixture.seed,
      });
      expect(flat(puzzle.text.puzzle)).toBe(fixture.puzzle);
      expect(puzzle.clueCount).toBe(fixture.clueCount);
    });
  }

  for (const fixture of PENTOMINO) {
    it(`pentomino ${String(fixture.width)}x${String(fixture.height)}, seed ${String(fixture.seed)}`, () => {
      const puzzle = polyominoTiling({
        width: fixture.width,
        height: fixture.height,
        pieces: PENTOMINOES,
      }).generate({ seed: fixture.seed });
      expect(flat(puzzle.text.puzzle)).toBe(fixture.puzzle);
      expect(flat(puzzle.text.solution)).toBe(fixture.solution);
    });
  }

  for (const fixture of QUEENS) {
    it(`${String(fixture.n)} queens, seed ${String(fixture.seed)}`, () => {
      const puzzle = queens({ n: fixture.n }).generate({ seed: fixture.seed });
      expect(flat(puzzle.text.puzzle)).toBe(fixture.puzzle);
      expect(flat(puzzle.text.solution)).toBe(fixture.solution);
    });
  }
});
