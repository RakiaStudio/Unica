import { describe, expect, it } from 'vitest';
import { ExactCoverError } from '../../../src/index.js';
import {
  applyStep,
  at,
  fromValues,
  geometry,
  isConsistent,
  isSolved,
  symbol,
  valuesOf,
} from '../../../src/puzzles/sudoku/candidates.js';

describe('geometry', () => {
  it('describes a 9x9 grid', () => {
    const shape = geometry(3, 3);
    expect(shape.n).toBe(9);
    expect(shape.units).toHaveLength(27);
    expect(shape.peers.every((peers) => peers.length === 20)).toBe(true);
    expect(at(shape.boxes, 4).cells).toEqual([30, 31, 32, 39, 40, 41, 48, 49, 50]);
    expect(shape.full).toBe(0x1ff);
  });

  it('is computed once per shape', () => {
    expect(geometry(2, 3)).toBe(geometry(2, 3));
  });

  it('supports up to 32 symbols and refuses more', () => {
    expect(geometry(4, 8).full).toBe(-1);
    expect(() => geometry(5, 7)).toThrow(ExactCoverError);
    expect(() => geometry(5, 7)).toThrow(/at most 32 symbols, got 35/);
  });
});

describe('fromValues', () => {
  const shape = geometry(2, 2);

  it('removes each given from its peers', () => {
    const values = Array.from({ length: 16 }, () => 0);
    values[0] = 1;
    const grid = fromValues(shape, values);
    expect(grid.candidates[0]).toBe(0);
    expect(valuesOf(at(grid.candidates, 1), 4)).toEqual([2, 3, 4]);
    expect(valuesOf(at(grid.candidates, 5), 4)).toEqual([2, 3, 4]);
    expect(valuesOf(at(grid.candidates, 15), 4)).toEqual([1, 2, 3, 4]);
  });

  it('rejects a wrong length, a bad symbol and clashing givens', () => {
    expect(() => fromValues(shape, [0])).toThrow(/expected 16 cells, got 1/);
    const bad = Array.from({ length: 16 }, () => 0);
    bad[3] = 5;
    expect(() => fromValues(shape, bad)).toThrow(/cell 3: 5 is not a symbol/);
    const clash = Array.from({ length: 16 }, () => 0);
    clash[0] = 2;
    clash[5] = 2;
    expect(() => fromValues(shape, clash)).toThrow(/givens clash: cells 0 and 5 both hold 2/);
  });
});

describe('applyStep, isSolved, isConsistent', () => {
  const shape = geometry(2, 2);

  it('places, eliminates and leaves the input untouched', () => {
    const grid = fromValues(
      shape,
      Array.from({ length: 16 }, () => 0),
    );
    const next = applyStep(grid, {
      technique: 'naked single',
      placements: [{ row: 0, col: 0, value: 1 }],
      eliminations: [{ row: 3, col: 3, value: 2 }],
      reason: '',
    });
    expect(next.values[0]).toBe(1);
    expect(valuesOf(at(next.candidates, 1), 4)).toEqual([2, 3, 4]);
    expect(valuesOf(at(next.candidates, 15), 4)).toEqual([1, 3, 4]);
    expect(grid.values[0]).toBe(0);
    expect(isSolved(next)).toBe(false);
    expect(isConsistent(next)).toBe(true);
  });

  it('sees an empty cell with no candidate', () => {
    // r1c4 is empty but its row holds 1, 2 and 3 and its column holds 4.
    const values = [1, 2, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(isConsistent(fromValues(shape, values))).toBe(false);
  });

  it('sees a symbol with nowhere left to go in a unit', () => {
    const grid = fromValues(
      shape,
      Array.from({ length: 16 }, () => 0),
    );
    const eliminations = [0, 1, 2, 3].map((col) => ({ row: 0, col, value: 4 }));
    const broken = applyStep(grid, {
      technique: 'pointing',
      placements: [],
      eliminations,
      reason: '',
    });
    expect(isConsistent(broken)).toBe(false);
  });

  it('a full grid is solved', () => {
    const values = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
    const grid = fromValues(shape, values);
    expect(isSolved(grid)).toBe(true);
    expect(isConsistent(grid)).toBe(true);
  });
});

describe('helpers', () => {
  it('at names the index it could not read', () => {
    expect(() => at([1, 2], 5)).toThrow(/index 5 out of range \(2 items\)/);
  });

  it('symbol uses letters above 9', () => {
    expect(symbol(1)).toBe('1');
    expect(symbol(10)).toBe('A');
    expect(symbol(36)).toBe('?');
  });
});
