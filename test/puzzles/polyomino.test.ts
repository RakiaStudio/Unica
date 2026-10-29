import { describe, expect, it } from 'vitest';
import {
  DancingLinksSolver,
  ExactCoverError,
  PENTOMINOES,
  classify,
  distinctOrientations,
  isMinimal,
  isUnique,
  polyominoTiling,
} from '../../src/index.js';

const solver = new DancingLinksSolver();

describe('distinctOrientations', () => {
  it('counts the 63 fixed pentominoes', () => {
    // Classic result: the 12 free pentominoes have 63 orientations in total.
    const total = PENTOMINOES.reduce(
      (sum, piece) => sum + distinctOrientations(piece.cells, true, true).length,
      0,
    );
    expect(total).toBe(63);
  });

  it('knows the symmetry of individual pieces', () => {
    const count = (name: string, rotations: boolean, reflections: boolean): number => {
      const piece = PENTOMINOES.find((candidate) => candidate.name === name);
      if (piece === undefined) throw new Error(name);
      return distinctOrientations(piece.cells, rotations, reflections).length;
    };
    expect(count('X', true, true)).toBe(1);
    expect(count('I', true, true)).toBe(2);
    expect(count('T', true, true)).toBe(4);
    expect(count('F', true, true)).toBe(8);
    // Without reflections, chiral pieces lose their mirror images.
    expect(count('F', true, false)).toBe(4);
    expect(count('L', false, true)).toBe(2);
    expect(count('L', false, false)).toBe(1);
  });

  it('normalises shapes to the origin', () => {
    const [only] = distinctOrientations(
      [
        [5, 5],
        [6, 5],
      ],
      false,
      false,
    );
    expect(only).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });
});

describe('polyominoTiling()', () => {
  it('validates its input', () => {
    expect(() => polyominoTiling({ width: 0, height: 1, pieces: PENTOMINOES })).toThrow(
      ExactCoverError,
    );
    expect(() => polyominoTiling({ width: 2, height: 2, pieces: [] })).toThrow(
      /at least one piece/,
    );
    expect(() =>
      polyominoTiling({
        width: 2,
        height: 2,
        pieces: [
          { name: 'a', cells: [[0, 0]] },
          { name: 'a', cells: [[0, 0]] },
        ],
      }),
    ).toThrow(/duplicate/);
    expect(() =>
      polyominoTiling({ width: 2, height: 2, pieces: [{ name: 'a', cells: [] }] }),
    ).toThrow(/no cells/);
  });

  it('finds all 8 tilings of the 3x20 rectangle with pentominoes', () => {
    // 2 solutions up to symmetry (Golomb), times the 4 symmetries of a rectangle.
    const tiling = polyominoTiling({ width: 20, height: 3, pieces: PENTOMINOES });
    const solutions = solver.solve(tiling.problem(), 1000);
    expect(solutions).toHaveLength(8);
    for (const solution of solutions) {
      expect(solution).toHaveLength(12);
      const text = tiling.format(solution);
      expect(text).not.toContain('.');
      expect(new Set(text.replace(/\n/g, '')).size).toBe(12);
    }
  });

  it('treats holes as cells that need no cover', () => {
    // 3x3 with the centre removed: a ring of eight cells, tiled by dominoes
    // used any number of times (two tilings exist).
    const tiling = polyominoTiling({
      width: 3,
      height: 3,
      holes: [[1, 1]],
      pieces: [
        {
          name: 'D',
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
      ],
      eachPieceOnce: false,
    });
    expect(tiling.problem().primaryColumns).toBe(8);
    const result = classify(tiling.problem(), []);
    expect(result.count).toBe('multiple');
    expect(tiling.format([])).toBe('...\n.#.\n...');
  });

  it('with eachPieceOnce=false a 2x2 board has two domino tilings', () => {
    const tiling = polyominoTiling({
      width: 2,
      height: 2,
      pieces: [
        {
          name: 'D',
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
      ],
      eachPieceOnce: false,
    });
    expect(tiling.problem().primaryColumns).toBe(4);
    expect(solver.solve(tiling.problem(), 10)).toHaveLength(2);
  });

  it('with eachPieceOnce=true the piece columns force every piece to appear', () => {
    const tiling = polyominoTiling({
      width: 2,
      height: 2,
      pieces: [
        {
          name: 'A',
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
        {
          name: 'B',
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
      ],
    });
    // Two named dominoes on a 2x2 board: 2 layouts x 2 assignments = 4.
    expect(tiling.problem().primaryColumns).toBe(6);
    expect(solver.solve(tiling.problem(), 10)).toHaveLength(4);
  });

  it('generates a unique, minimal puzzle on the 3x20 board', () => {
    const tiling = polyominoTiling({ width: 20, height: 3, pieces: PENTOMINOES });
    const puzzle = tiling.generate({ seed: 'tsugia' });
    expect(puzzle.minimal).toBe(true);
    expect(puzzle.clues.length).toBeLessThan(12);
    expect(isUnique(tiling.problem(), puzzle.clues)).toBe(true);
    expect(isMinimal(tiling.problem(), puzzle.clues)).toBe(true);
    expect(puzzle.text.solution).not.toContain('.');
    expect(puzzle.text.puzzle).toContain('.');
  });

  it('rejects unknown pieces and bad row indices', () => {
    const tiling = polyominoTiling({
      width: 2,
      height: 2,
      pieces: [
        {
          name: 'D',
          cells: [
            [0, 0],
            [1, 0],
          ],
        },
      ],
    });
    expect(() => tiling.orientations('Q')).toThrow(/unknown piece/);
    expect(() => tiling.format([999])).toThrow(/out of range/);
  });
});
