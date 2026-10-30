/**
 * Single-digit patterns: two strong links for one symbol, joined by a weak one.
 *
 * A strong link is a unit where the symbol has exactly two places: one of the
 * two cells holds it. If one end of each of two strong links sees the other
 * (shares a unit with it), at most one of those two ends holds the symbol, so
 * at least one of the two far ends does. The symbol then leaves every cell
 * that sees both far ends.
 *
 * - Skyscraper: two rows (or two columns) whose near ends share a column (or
 *   row).
 * - 2-string kite: a row and a column whose near ends share a box.
 * - Empty rectangle: a box where the symbol can only go in one row and one
 *   column of the box, and a strong link outside the box with one end in that
 *   row (or column). If the cell where the box's column (or row) meets the far
 *   end's row (or column) held the symbol, the far end would not, so the near
 *   end would; then the box would have no place left for the symbol.
 */

import {
  at,
  cellRef,
  cellValue,
  hasCandidate,
  unitRef,
  type CandidateGrid,
  type CellValue,
  type Step,
  type TechniqueName,
  type Unit,
} from '../candidates.js';
import { makeStep } from './step.js';

export interface Link {
  readonly unit: Unit;
  readonly cells: readonly [number, number];
}

/** Units where `value` is still missing and has exactly two places. */
export function links(grid: CandidateGrid, units: readonly Unit[], value: number): Link[] {
  const result: Link[] = [];
  for (const unit of units) {
    if (unit.cells.some((cell) => at(grid.values, cell) === value)) continue;
    const places = unit.cells.filter((cell) => hasCandidate(at(grid.candidates, cell), value));
    if (places.length === 2) result.push({ unit, cells: [at(places, 0), at(places, 1)] });
  }
  return result;
}

/** Cells other than `a` and `b` that see both and still allow `value`. */
export function seenByBoth(grid: CandidateGrid, a: number, b: number, value: number): CellValue[] {
  const { n, peers } = grid.geometry;
  const ofB = new Set(at(peers, b));
  return at(peers, a)
    .filter((cell) => cell !== b && ofB.has(cell))
    .filter((cell) => hasCandidate(at(grid.candidates, cell), value))
    .map((cell) => cellValue(n, cell, value));
}

/** Both ways of reading a link: [near, far]. */
function ends(link: Link): [number, number][] {
  return [
    [link.cells[0], link.cells[1]],
    [link.cells[1], link.cells[0]],
  ];
}

/**
 * Try every way of joining `first` and `second` by a weak link between one end
 * of each, where `joined` decides which near ends count for this technique.
 */
function join(
  grid: CandidateGrid,
  first: Link,
  second: Link,
  value: number,
  technique: TechniqueName,
  joined: (a: number, b: number) => Unit | undefined,
): Step | undefined {
  const { n } = grid.geometry;
  for (const [near1, far1] of ends(first)) {
    for (const [near2, far2] of ends(second)) {
      if (new Set([near1, far1, near2, far2]).size < 4) continue;
      const via = joined(near1, near2);
      if (via === undefined) continue;
      const eliminations = seenByBoth(grid, far1, far2, value).sort(
        (x, y) => x.row - y.row || x.col - y.col,
      );
      if (eliminations.length === 0) continue;
      return makeStep(technique, [], eliminations, {
        pattern: 'linked pairs',
        value,
        links: [unitRef(first.unit), unitRef(second.unit)],
        via: unitRef(via),
        ends: [cellRef(n, far1), cellRef(n, far2)],
      });
    }
  }
  return undefined;
}

export function skyscraper(grid: CandidateGrid): Step | undefined {
  const { n, rows, columns } = grid.geometry;
  for (let value = 1; value <= n; value++) {
    const orientations: [readonly Unit[], readonly Unit[]][] = [
      [rows, columns],
      [columns, rows],
    ];
    for (const [bases, across] of orientations) {
      const found = links(grid, bases, value);
      for (let i = 0; i < found.length; i++) {
        for (let j = i + 1; j < found.length; j++) {
          const step = join(grid, at(found, i), at(found, j), value, 'skyscraper', (a, b) => {
            return across.find((unit) => unit.cells.includes(a) && unit.cells.includes(b));
          });
          if (step !== undefined) return step;
        }
      }
    }
  }
  return undefined;
}

export function twoStringKite(grid: CandidateGrid): Step | undefined {
  const { n, rows, columns, boxes, boxOf } = grid.geometry;
  for (let value = 1; value <= n; value++) {
    const rowLinks = links(grid, rows, value);
    const columnLinks = links(grid, columns, value);
    for (const row of rowLinks) {
      for (const column of columnLinks) {
        const step = join(grid, row, column, value, '2-string kite', (a, b) => {
          const box = at(boxOf, a);
          return box === at(boxOf, b) ? at(boxes, box) : undefined;
        });
        if (step !== undefined) return step;
      }
    }
  }
  return undefined;
}

/** Rows or columns of a box, as unit indices. */
function linesOfBox(start: number, size: number): number[] {
  return Array.from({ length: size }, (_, i) => start + i);
}

export function emptyRectangle(grid: CandidateGrid): Step | undefined {
  const { n, boxRows, boxCols, rows, columns, boxes } = grid.geometry;
  for (let value = 1; value <= n; value++) {
    const rowLinks = links(grid, rows, value);
    const columnLinks = links(grid, columns, value);
    for (const box of boxes) {
      if (box.cells.some((cell) => at(grid.values, cell) === value)) continue;
      const places = box.cells.filter((cell) => hasCandidate(at(grid.candidates, cell), value));
      if (places.length < 2) continue;
      const first = at(box.cells, 0);
      const boxRowsHere = linesOfBox(Math.floor(first / n), boxRows);
      const boxColsHere = linesOfBox(first % n, boxCols);
      // Not confined to one line of the box: that would be pointing.
      if (new Set(places.map((cell) => Math.floor(cell / n))).size < 2) continue;
      if (new Set(places.map((cell) => cell % n)).size < 2) continue;
      for (const r of boxRowsHere) {
        for (const c of boxColsHere) {
          if (!places.every((cell) => Math.floor(cell / n) === r || cell % n === c)) continue;
          const row = at(rows, r);
          const column = at(columns, c);
          // A column link outside the box with one end in row r: the far end's
          // row meets column c at the target.
          for (const link of columnLinks) {
            if (boxColsHere.includes(link.unit.index)) continue;
            for (const [near, far] of [
              [link.cells[0], link.cells[1]],
              [link.cells[1], link.cells[0]],
            ] satisfies [number, number][]) {
              const farRow = Math.floor(far / n);
              if (Math.floor(near / n) !== r || boxRowsHere.includes(farRow)) continue;
              const target = farRow * n + c;
              if (!hasCandidate(at(grid.candidates, target), value)) continue;
              return makeStep('empty rectangle', [], [cellValue(n, target, value)], {
                pattern: 'empty rectangle',
                value,
                box: unitRef(box),
                row: unitRef(row),
                column: unitRef(column),
                link: unitRef(link.unit),
                ends: [cellRef(n, near), cellRef(n, far)],
              });
            }
          }
          // The same with a row link and column c.
          for (const link of rowLinks) {
            if (boxRowsHere.includes(link.unit.index)) continue;
            for (const [near, far] of [
              [link.cells[0], link.cells[1]],
              [link.cells[1], link.cells[0]],
            ] satisfies [number, number][]) {
              const farCol = far % n;
              if (near % n !== c || boxColsHere.includes(farCol)) continue;
              const target = r * n + farCol;
              if (!hasCandidate(at(grid.candidates, target), value)) continue;
              return makeStep('empty rectangle', [], [cellValue(n, target, value)], {
                pattern: 'empty rectangle',
                value,
                box: unitRef(box),
                row: unitRef(row),
                column: unitRef(column),
                link: unitRef(link.unit),
                ends: [cellRef(n, near), cellRef(n, far)],
              });
            }
          }
        }
      }
    }
  }
  return undefined;
}
