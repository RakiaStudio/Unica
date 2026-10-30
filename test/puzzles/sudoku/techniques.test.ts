import { describe, expect, it } from 'vitest';
import {
  geometry,
  type CandidateGrid,
  type Geometry,
} from '../../../src/puzzles/sudoku/candidates.js';
import {
  TECHNIQUES,
  claiming,
  hiddenPair,
  hiddenQuad,
  hiddenSingle,
  hiddenTriple,
  nakedPair,
  nakedQuad,
  nakedSingle,
  nakedTriple,
  pointing,
  skyscraper,
  swordfish,
  twoStringKite,
  xWing,
  xyWing,
  xyzWing,
} from '../../../src/puzzles/sudoku/techniques/index.js';
import { combinations } from '../../../src/puzzles/sudoku/techniques/subsets.js';

/**
 * Handcrafted candidate states. Each starts from an empty grid where every
 * cell allows every symbol, then narrows a few cells so that exactly one
 * pattern is present.
 */

const bitsOf = (values: readonly number[]): number =>
  values.reduce((mask, value) => mask | (1 << (value - 1)), 0);

function empty(shape: Geometry): number[] {
  return Array.from({ length: shape.n * shape.n }, () => shape.full);
}

function state(shape: Geometry, candidates: number[], values?: number[]): CandidateGrid {
  return {
    geometry: shape,
    values: values ?? Array.from({ length: shape.n * shape.n }, () => 0),
    candidates,
  };
}

/** Remove `value` from every listed cell. */
function remove(candidates: number[], cells: readonly number[], value: number): void {
  for (const cell of cells) candidates[cell] = (candidates[cell] ?? 0) & ~bitsOf([value]);
}

const nine = geometry(3, 3);
const four = geometry(2, 2);
const row0 = [0, 1, 2, 3, 4, 5, 6, 7, 8];

describe('techniques on an empty grid', () => {
  it('none of them finds anything when every cell allows every symbol', () => {
    for (const technique of TECHNIQUES) {
      expect(technique.find(state(nine, empty(nine)))).toBeUndefined();
    }
  });

  it('none of them finds anything on a solved grid', () => {
    const values = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
    const solved = state(
      four,
      values.map(() => 0),
      values,
    );
    for (const technique of TECHNIQUES) expect(technique.find(solved)).toBeUndefined();
  });

  it('are listed weakest first, and levels never decrease', () => {
    const order = ['easy', 'medium', 'hard', 'expert'];
    const levels = TECHNIQUES.map((technique) => order.indexOf(technique.level));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(TECHNIQUES.map((technique) => technique.name)).toEqual([
      'naked single',
      'hidden single',
      'naked pair',
      'hidden pair',
      'pointing',
      'claiming',
      'naked triple',
      'hidden triple',
      'x-wing',
      'naked quad',
      'hidden quad',
      'swordfish',
      'skyscraper',
      '2-string kite',
      'xy-wing',
      'xyz-wing',
    ]);
  });
});

describe('nakedSingle', () => {
  it('places the only candidate of a cell', () => {
    const candidates = empty(four);
    candidates[5] = bitsOf([3]);
    const step = nakedSingle(state(four, candidates));
    expect(step).toEqual({
      technique: 'naked single',
      placements: [{ row: 1, col: 1, value: 3 }],
      eliminations: [],
      reason: 'Naked single: r2c2 can only be 3',
    });
  });
});

describe('hiddenSingle', () => {
  it('finds a symbol with one place in a row', () => {
    const candidates = empty(nine);
    remove(
      candidates,
      row0.filter((cell) => cell !== 4),
      7,
    );
    const step = hiddenSingle(state(nine, candidates));
    expect(step?.placements).toEqual([{ row: 0, col: 4, value: 7 }]);
    expect(step?.reason).toBe('Hidden single: 7 can only go in r1c5 within row 1');
  });

  it('finds a symbol with one place in a column', () => {
    const candidates = empty(nine);
    remove(candidates, [0, 9, 18, 27, 36, 45, 54, 72], 2);
    expect(hiddenSingle(state(nine, candidates))?.reason).toBe(
      'Hidden single: 2 can only go in r8c1 within column 1',
    );
  });

  it('finds a symbol with one place in a box', () => {
    const candidates = empty(nine);
    // Box 5 (rows 4-6, columns 4-6 in 1-based terms): 9 only in r5c5.
    remove(candidates, [30, 31, 32, 39, 41, 48, 49, 50], 9);
    expect(hiddenSingle(state(nine, candidates))?.reason).toBe(
      'Hidden single: 9 can only go in r5c5 within box 5',
    );
  });

  it('skips symbols already placed in the unit', () => {
    const values = Array.from({ length: 16 }, () => 0);
    values[0] = 1;
    const candidates = empty(four);
    candidates[0] = 0;
    expect(hiddenSingle(state(four, candidates, values))).toBeUndefined();
  });
});

describe('nakedPair', () => {
  it('removes the pair from the rest of the row', () => {
    const candidates = empty(nine);
    candidates[0] = bitsOf([1, 2]);
    candidates[5] = bitsOf([1, 2]);
    const step = nakedPair(state(nine, candidates));
    expect(step?.technique).toBe('naked pair');
    expect(step?.eliminations).toHaveLength(14);
    expect(step?.eliminations.every(({ row, value }) => row === 0 && value <= 2)).toBe(true);
    expect(step?.reason).toBe(
      'Naked pair: r1c1 and r1c6 hold only 1 and 2 between them, so 1 and 2 leave the other cells of row 1',
    );
  });

  it('ignores a pair with nothing to remove', () => {
    const candidates = empty(four);
    candidates[0] = bitsOf([1, 2]);
    candidates[1] = bitsOf([1, 2]);
    candidates[2] = bitsOf([3, 4]);
    candidates[3] = bitsOf([3, 4]);
    candidates[4] = bitsOf([3, 4]);
    candidates[5] = bitsOf([3, 4]);
    // Row 1 is a pair with nothing left to remove; the step found must come from elsewhere.
    const step = nakedPair(state(four, candidates));
    expect(step?.reason).not.toMatch(/row 1$/);
  });
});

describe('hiddenPair', () => {
  it('clears every other candidate from the two cells', () => {
    const candidates = empty(nine);
    for (const value of [3, 4])
      remove(
        candidates,
        row0.filter((cell) => cell > 1),
        value,
      );
    const step = hiddenPair(state(nine, candidates));
    expect(step?.technique).toBe('hidden pair');
    expect(step?.eliminations).toHaveLength(14);
    expect(step?.eliminations.every(({ row, col }) => row === 0 && col <= 1)).toBe(true);
    expect(step?.reason).toBe(
      'Hidden pair: in row 1, 3 and 4 can only go in r1c1 and r1c2, so those cells hold nothing else',
    );
  });
});

describe('pointing', () => {
  it('removes a symbol confined to one row of a box from the rest of that row', () => {
    const candidates = empty(nine);
    remove(candidates, [9, 10, 11, 18, 19, 20], 5);
    const step = pointing(state(nine, candidates));
    expect(step?.eliminations).toEqual(
      [3, 4, 5, 6, 7, 8].map((col) => ({ row: 0, col, value: 5 })),
    );
    expect(step?.reason).toBe(
      'Pointing: in box 1, 5 is confined to row 1, so 5 leaves the rest of row 1',
    );
  });

  it('works along a column too', () => {
    const candidates = empty(nine);
    remove(candidates, [1, 2, 10, 11, 19, 20], 5);
    expect(pointing(state(nine, candidates))?.reason).toBe(
      'Pointing: in box 1, 5 is confined to column 1, so 5 leaves the rest of column 1',
    );
  });
});

describe('claiming', () => {
  it('removes a symbol confined to one box of a row from the rest of that box', () => {
    const candidates = empty(nine);
    remove(candidates, [3, 4, 5, 6, 7, 8], 6);
    const step = claiming(state(nine, candidates));
    expect(step?.eliminations).toEqual(
      [9, 10, 11, 18, 19, 20].map((cell) => ({
        row: Math.floor(cell / 9),
        col: cell % 9,
        value: 6,
      })),
    );
    expect(step?.reason).toBe(
      'Claiming: in row 1, 6 is confined to box 1, so 6 leaves the rest of box 1',
    );
  });
});

describe('nakedTriple', () => {
  it('finds three cells sharing three symbols when no pair does', () => {
    const candidates = empty(nine);
    candidates[0] = bitsOf([1, 2]);
    candidates[1] = bitsOf([2, 3]);
    candidates[2] = bitsOf([1, 3]);
    const grid = state(nine, candidates);
    expect(nakedPair(grid)).toBeUndefined();
    const step = nakedTriple(grid);
    expect(step?.technique).toBe('naked triple');
    expect(step?.eliminations).toHaveLength(18);
    expect(step?.reason).toBe(
      'Naked triple: r1c1, r1c2 and r1c3 hold only 1, 2 and 3 between them, so 1, 2 and 3 leave the other cells of row 1',
    );
  });
});

describe('hiddenTriple', () => {
  it('finds three symbols confined to three cells when no pair is', () => {
    const candidates = empty(nine);
    for (const value of [1, 2, 3])
      remove(
        candidates,
        row0.filter((cell) => cell > 2),
        value,
      );
    const grid = state(nine, candidates);
    expect(hiddenPair(grid)).toBeUndefined();
    const step = hiddenTriple(grid);
    expect(step?.eliminations).toHaveLength(18);
    expect(step?.reason).toBe(
      'Hidden triple: in row 1, 1, 2 and 3 can only go in r1c1, r1c2 and r1c3, so those cells hold nothing else',
    );
  });
});

describe('xWing', () => {
  it('finds a symbol locked to two columns in two rows', () => {
    const candidates = empty(nine);
    for (const r of [1, 6]) {
      remove(
        candidates,
        row0.filter((c) => c !== 2 && c !== 7).map((c) => r * 9 + c),
        4,
      );
    }
    const step = xWing(state(nine, candidates));
    expect(step?.eliminations).toHaveLength(14);
    expect(
      step?.eliminations.every(
        ({ col, row }) => (col === 2 || col === 7) && row !== 1 && row !== 6,
      ),
    ).toBe(true);
    expect(step?.reason).toBe(
      'X-wing: 4 in rows 2 and 7 can only go in columns 3 and 8, so 4 leaves the rest of those columns',
    );
  });

  it('finds the same pattern with rows and columns swapped', () => {
    const candidates = empty(nine);
    for (const c of [0, 5]) {
      remove(
        candidates,
        row0.filter((r) => r !== 3 && r !== 8).map((r) => r * 9 + c),
        8,
      );
    }
    expect(xWing(state(nine, candidates))?.reason).toBe(
      'X-wing: 8 in columns 1 and 6 can only go in rows 4 and 9, so 8 leaves the rest of those rows',
    );
  });

  it('ignores a pattern with nothing to remove, and rows that do not line up', () => {
    const candidates = empty(four);
    // 1 in rows 1 and 2 only at columns 1 and 2, and nowhere else in those columns.
    remove(candidates, [2, 3, 6, 7, 8, 9, 12, 13], 1);
    // 2 in rows 1 and 3, but at different columns.
    remove(candidates, [1, 2], 2);
    remove(candidates, [8, 11], 2);
    expect(xWing(state(four, candidates))).toBeUndefined();
  });
});

describe('nakedQuad', () => {
  it('finds four cells sharing four symbols when no smaller subset does', () => {
    const candidates = empty(nine);
    candidates[0] = bitsOf([1, 2]);
    candidates[1] = bitsOf([2, 3]);
    candidates[2] = bitsOf([3, 4]);
    candidates[3] = bitsOf([1, 4]);
    const grid = state(nine, candidates);
    expect(nakedPair(grid)).toBeUndefined();
    expect(nakedTriple(grid)).toBeUndefined();
    const step = nakedQuad(grid);
    expect(step?.eliminations).toHaveLength(20);
    expect(step?.reason).toBe(
      'Naked quad: r1c1, r1c2, r1c3 and r1c4 hold only 1, 2, 3 and 4 between them, so 1, 2, 3 and 4 leave the other cells of row 1',
    );
  });
});

describe('hiddenQuad', () => {
  it('finds four symbols confined to four cells when no smaller subset is', () => {
    const candidates = empty(nine);
    for (const value of [1, 2, 3, 4])
      remove(
        candidates,
        row0.filter((cell) => cell > 3),
        value,
      );
    const grid = state(nine, candidates);
    expect(hiddenTriple(grid)).toBeUndefined();
    const step = hiddenQuad(grid);
    expect(step?.eliminations).toHaveLength(20);
    expect(step?.reason).toBe(
      'Hidden quad: in row 1, 1, 2, 3 and 4 can only go in r1c1, r1c2, r1c3 and r1c4, so those cells hold nothing else',
    );
  });
});

describe('swordfish', () => {
  it('finds a symbol locked to three columns in three rows when no x-wing is', () => {
    const candidates = empty(nine);
    const keep: [number, number[]][] = [
      [0, [1, 4]],
      [4, [4, 7]],
      [8, [1, 7]],
    ];
    for (const [r, cols] of keep) {
      remove(
        candidates,
        row0.filter((c) => !cols.includes(c)).map((c) => r * 9 + c),
        4,
      );
    }
    const grid = state(nine, candidates);
    expect(xWing(grid)).toBeUndefined();
    const step = swordfish(grid);
    expect(step?.eliminations).toHaveLength(18);
    expect(
      step?.eliminations.every(
        ({ row, col }) => [1, 4, 7].includes(col) && ![0, 4, 8].includes(row),
      ),
    ).toBe(true);
    expect(step?.reason).toBe(
      'Swordfish: 4 in rows 1, 5 and 9 can only go in columns 2, 5 and 8, so 4 leaves the rest of those columns',
    );
  });

  it('finds the same pattern with rows and columns swapped', () => {
    const candidates = empty(nine);
    const keep: [number, number[]][] = [
      [0, [1, 4]],
      [4, [4, 7]],
      [8, [1, 7]],
    ];
    for (const [c, rows] of keep) {
      remove(
        candidates,
        row0.filter((r) => !rows.includes(r)).map((r) => r * 9 + c),
        4,
      );
    }
    expect(swordfish(state(nine, candidates))?.reason).toBe(
      'Swordfish: 4 in columns 1, 5 and 9 can only go in rows 2, 5 and 8, so 4 leaves the rest of those rows',
    );
  });
});

describe('skyscraper', () => {
  it('removes a symbol from the cells that see both tops', () => {
    const candidates = empty(nine);
    remove(
      candidates,
      row0.filter((c) => c !== 0 && c !== 4),
      6,
    );
    remove(
      candidates,
      row0.filter((c) => c !== 0 && c !== 3).map((c) => 54 + c),
      6,
    );
    const step = skyscraper(state(nine, candidates));
    expect(step?.eliminations).toEqual([
      { row: 1, col: 3, value: 6 },
      { row: 2, col: 3, value: 6 },
      { row: 7, col: 4, value: 6 },
      { row: 8, col: 4, value: 6 },
    ]);
    expect(step?.reason).toBe(
      'Skyscraper: 6 can only go in two cells in row 1 and in row 7, linked in column 1, so one of r1c5 and r7c4 is 6 and 6 leaves the cells that see both',
    );
  });

  it('works with columns as the base', () => {
    const candidates = empty(nine);
    remove(
      candidates,
      row0.filter((r) => r !== 0 && r !== 4).map((r) => r * 9),
      6,
    );
    remove(
      candidates,
      row0.filter((r) => r !== 0 && r !== 3).map((r) => r * 9 + 6),
      6,
    );
    expect(skyscraper(state(nine, candidates))?.reason).toBe(
      'Skyscraper: 6 can only go in two cells in column 1 and in column 7, linked in row 1, so one of r5c1 and r4c7 is 6 and 6 leaves the cells that see both',
    );
  });

  it('ignores links whose ends are not joined, or that remove nothing', () => {
    const candidates = empty(four);
    // 1 in rows 1 and 3 at columns 1-2 and 3-4: no shared column.
    remove(candidates, [2, 3, 8, 9], 1);
    expect(skyscraper(state(four, candidates))).toBeUndefined();
  });
});

describe('twoStringKite', () => {
  it('joins a row and a column through a box', () => {
    const candidates = empty(nine);
    remove(candidates, [0, 2, 3, 4, 5, 6, 8], 5);
    remove(candidates, [0, 9, 27, 36, 45, 63, 72], 5);
    const step = twoStringKite(state(nine, candidates));
    expect(step?.eliminations).toEqual([{ row: 6, col: 7, value: 5 }]);
    expect(step?.reason).toBe(
      '2-string kite: 5 can only go in two cells in row 1 and in column 1, linked in box 1, so one of r1c8 and r7c1 is 5 and 5 leaves the cells that see both',
    );
  });
});

describe('xyWing', () => {
  it('removes the shared symbol from cells that see both pincers', () => {
    const candidates = empty(nine);
    candidates[0] = bitsOf([1, 2]);
    candidates[4] = bitsOf([1, 3]);
    candidates[27] = bitsOf([2, 3]);
    const step = xyWing(state(nine, candidates));
    expect(step?.eliminations).toEqual([{ row: 3, col: 4, value: 3 }]);
    expect(step?.reason).toBe(
      'XY-wing: pivot r1c1 (1 or 2) with pincers r1c5 (1 or 3) and r4c1 (2 or 3), so one of the pincers is 3 and 3 leaves the cells that see both pincers',
    );
  });

  it('ignores pincers that do not form a wing', () => {
    const candidates = empty(nine);
    candidates[0] = bitsOf([1, 2]);
    candidates[4] = bitsOf([1, 3]);
    candidates[27] = bitsOf([1, 3]);
    candidates[40] = bitsOf([1, 4]);
    expect(xyWing(state(nine, candidates))).toBeUndefined();
  });
});

describe('xyzWing', () => {
  it('removes the shared symbol from cells that see the pivot and both pincers', () => {
    const candidates = empty(nine);
    candidates[0] = bitsOf([1, 2, 3]);
    candidates[1] = bitsOf([1, 3]);
    candidates[27] = bitsOf([2, 3]);
    const grid = state(nine, candidates);
    expect(xyWing(grid)).toBeUndefined();
    const step = xyzWing(grid);
    expect(step?.eliminations).toEqual([
      { row: 1, col: 0, value: 3 },
      { row: 2, col: 0, value: 3 },
    ]);
    expect(step?.reason).toBe(
      'XYZ-wing: pivot r1c1 (1, 2 or 3) with pincers r1c2 (1 or 3) and r4c1 (2 or 3), so one of the three is 3 and 3 leaves the cells that see all three',
    );
  });
});

describe('combinations', () => {
  it('lists k-subsets in order', () => {
    expect(combinations([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ]);
    expect(combinations([1, 2], 3)).toEqual([]);
  });
});
