/**
 * Candidate grids: the state a human solver works on.
 *
 * Each empty cell holds the set of symbols that no filled peer rules out,
 * stored as a bitmask (bit `v - 1` for symbol `v`), which is why rating is
 * limited to grids of at most 32 symbols. A grid is an immutable value: a
 * technique reads it and returns a step, and `applyStep` returns a new grid.
 */

import { ExactCoverError } from '../../core/exact-cover.js';
import type { SudokuPlacement } from './index.js';

/** The most symbols a candidate bitmask can hold. */
export const MAX_RATED_SYMBOLS = 32;

export type UnitKind = 'row' | 'column' | 'box';

/** A row, column or box: `n` cells that must hold every symbol once. */
export interface Unit {
  readonly kind: UnitKind;
  /** 0-based. Boxes are numbered left to right, top to bottom. */
  readonly index: number;
  /** Cell indices (`row * n + col`) in reading order. */
  readonly cells: readonly number[];
}

/** Everything about a grid's shape that techniques need, computed once per shape. */
export interface Geometry {
  readonly n: number;
  readonly boxRows: number;
  readonly boxCols: number;
  /** All rows, then all columns, then all boxes. */
  readonly units: readonly Unit[];
  readonly rows: readonly Unit[];
  readonly columns: readonly Unit[];
  readonly boxes: readonly Unit[];
  /** Box index of each cell. */
  readonly boxOf: readonly number[];
  /** For each cell, every other cell sharing a row, column or box with it. */
  readonly peers: readonly (readonly number[])[];
  /** Bitmask with every symbol set. */
  readonly full: number;
}

export interface CandidateGrid {
  readonly geometry: Geometry;
  /** Symbol in each cell, `0` when empty. Row-major. */
  readonly values: readonly number[];
  /** Candidate bitmask of each cell; `0` for filled cells. */
  readonly candidates: readonly number[];
}

/** A placement or an elimination, in the same shape the rest of the sudoku API uses. */
export type CellValue = SudokuPlacement;

/** One deduction: what a technique found, and why, in one sentence. */
export interface Step {
  readonly technique: TechniqueName;
  readonly placements: readonly CellValue[];
  readonly eliminations: readonly CellValue[];
  readonly reason: string;
}

export type TechniqueName =
  | 'naked single'
  | 'hidden single'
  | 'naked pair'
  | 'hidden pair'
  | 'pointing'
  | 'claiming'
  | 'naked triple'
  | 'hidden triple'
  | 'x-wing';

/** Element access that names the index when it fails, instead of yielding `undefined`. */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new ExactCoverError(
      `index ${String(index)} out of range (${String(items.length)} items)`,
    );
  }
  return item;
}

export function bit(value: number): number {
  return 1 << (value - 1);
}

export function hasCandidate(mask: number, value: number): boolean {
  return (mask & bit(value)) !== 0;
}

export function countBits(mask: number): number {
  let count = 0;
  let rest = mask;
  while (rest !== 0) {
    rest &= rest - 1;
    count++;
  }
  return count;
}

/** Symbols in a mask, ascending. */
export function valuesOf(mask: number, n: number): number[] {
  const values: number[] = [];
  for (let value = 1; value <= n; value++) if (hasCandidate(mask, value)) values.push(value);
  return values;
}

const geometries = new Map<string, Geometry>();

export function geometry(boxRows: number, boxCols: number): Geometry {
  const key = `${String(boxRows)}x${String(boxCols)}`;
  const known = geometries.get(key);
  if (known !== undefined) return known;

  const n = boxRows * boxCols;
  if (n > MAX_RATED_SYMBOLS) {
    throw new ExactCoverError(
      `rating supports grids of at most ${String(MAX_RATED_SYMBOLS)} symbols, got ${String(n)}`,
    );
  }
  const range = Array.from({ length: n }, (_, i) => i);
  const boxOf = Array.from({ length: n * n }, (_, cell) => {
    const row = Math.floor(cell / n);
    const col = cell % n;
    return Math.floor(row / boxRows) * boxRows + Math.floor(col / boxCols);
  });
  const rows = range.map((r): Unit => ({
    kind: 'row',
    index: r,
    cells: range.map((c) => r * n + c),
  }));
  const columns = range.map((c): Unit => ({
    kind: 'column',
    index: c,
    cells: range.map((r) => r * n + c),
  }));
  const boxes = range.map((b): Unit => ({
    kind: 'box',
    index: b,
    cells: boxOf.flatMap((box, cell) => (box === b ? [cell] : [])),
  }));
  const peers = Array.from({ length: n * n }, (_, cell) => {
    const set = new Set<number>([
      ...at(rows, Math.floor(cell / n)).cells,
      ...at(columns, cell % n).cells,
      ...at(boxes, at(boxOf, cell)).cells,
    ]);
    set.delete(cell);
    return [...set].sort((a, b) => a - b);
  });

  const made: Geometry = {
    n,
    boxRows,
    boxCols,
    units: [...rows, ...columns, ...boxes],
    rows,
    columns,
    boxes,
    boxOf,
    peers,
    // Masks live in the signed 32-bit range the bitwise operators produce, so
    // `| 0` puts this one there too (for n = 32 it is -1: every bit set).
    full: (2 ** n - 1) | 0,
  };
  geometries.set(key, made);
  return made;
}

/**
 * The candidate grid of a puzzle: givens placed, every other cell holding the
 * symbols its filled peers allow. Throws when two givens clash.
 */
export function fromValues(shape: Geometry, values: readonly number[]): CandidateGrid {
  const { n, peers, full } = shape;
  if (values.length !== n * n) {
    throw new ExactCoverError(`expected ${String(n * n)} cells, got ${String(values.length)}`);
  }
  const candidates = values.map((value) => (value === 0 ? full : 0));
  values.forEach((value, cell) => {
    if (value === 0) return;
    if (!Number.isInteger(value) || value < 1 || value > n) {
      throw new ExactCoverError(`cell ${String(cell)}: ${String(value)} is not a symbol`);
    }
    for (const peer of at(peers, cell)) {
      if (at(values, peer) === value) {
        throw new ExactCoverError(
          `givens clash: cells ${String(cell)} and ${String(peer)} both hold ${String(value)}`,
        );
      }
      candidates[peer] = at(candidates, peer) & ~bit(value);
    }
  });
  return { geometry: shape, values: [...values], candidates };
}

/** The grid after a step: placements filled (and removed from their peers), eliminations removed. */
export function applyStep(grid: CandidateGrid, step: Step): CandidateGrid {
  const { n, peers } = grid.geometry;
  const values = [...grid.values];
  const candidates = [...grid.candidates];
  for (const { row, col, value } of step.placements) {
    const cell = row * n + col;
    values[cell] = value;
    candidates[cell] = 0;
    for (const peer of at(peers, cell)) candidates[peer] = at(candidates, peer) & ~bit(value);
  }
  for (const { row, col, value } of step.eliminations) {
    const cell = row * n + col;
    candidates[cell] = at(candidates, cell) & ~bit(value);
  }
  return { geometry: grid.geometry, values, candidates };
}

export function isSolved(grid: CandidateGrid): boolean {
  return grid.values.every((value) => value !== 0);
}

/**
 * `false` when the grid has visibly broken: an empty cell with no candidate,
 * or a unit where some missing symbol has nowhere left to go. A sound
 * technique never produces this from a puzzle that has a solution.
 */
export function isConsistent(grid: CandidateGrid): boolean {
  const { n, units } = grid.geometry;
  for (let cell = 0; cell < n * n; cell++) {
    if (at(grid.values, cell) === 0 && at(grid.candidates, cell) === 0) return false;
  }
  return units.every((unit) => {
    let placed = 0;
    let open = 0;
    for (const cell of unit.cells) {
      const value = at(grid.values, cell);
      if (value !== 0) placed |= bit(value);
      open |= at(grid.candidates, cell);
    }
    return (placed | open) === grid.geometry.full;
  });
}

/** `r3c5`: 1-based row and column, the usual notation in solving guides. */
export function cellName(n: number, cell: number): string {
  return `r${String(Math.floor(cell / n) + 1)}c${String((cell % n) + 1)}`;
}

/** `row 3`, `column 5`, `box 2`: 1-based. */
export function unitName(unit: Unit): string {
  return `${unit.kind} ${String(unit.index + 1)}`;
}

const SYMBOLS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function symbol(value: number): string {
  return SYMBOLS[value - 1] ?? '?';
}

export function cellValue(n: number, cell: number, value: number): CellValue {
  return { row: Math.floor(cell / n), col: cell % n, value };
}
