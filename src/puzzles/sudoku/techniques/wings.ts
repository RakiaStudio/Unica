/**
 * Wings: a pivot cell and two pincers that each see it.
 *
 * - XY-wing: the pivot holds x or y; one pincer holds x or z, the other y or z.
 *   Whichever the pivot is, one pincer is forced to z, so z leaves every cell
 *   that sees both pincers.
 * - XYZ-wing: the pivot holds x, y or z; the pincers are as above. If the pivot
 *   is z, it is z itself; otherwise a pincer is. So z leaves every cell that
 *   sees the pivot and both pincers.
 * - W-wing: two cells that both hold only x or y, and a unit where x has
 *   exactly two places, one seeing each cell. If the first cell is not y it is
 *   x, so its end of the link is not x, the other end is, and the second cell
 *   is y. So y leaves every cell that sees both cells.
 * - WXYZ-wing: a cell and three of its peers that hold four values between
 *   them, where every value but z sits only in cells that all see each other.
 *   Each such value can fill at most one of the four cells, so without z they
 *   could fill only three: one of the cells holding z is z, and z leaves every
 *   cell that sees all of them.
 */

import {
  at,
  cellRef,
  cellValue,
  countBits,
  hasCandidate,
  valuesOf,
  type CandidateGrid,
  type CellCandidates,
  type CellValue,
  type Step,
} from '../candidates.js';
import { makeStep } from './step.js';
import { links, seenByBoth } from './patterns.js';
import { combinations } from './subsets.js';

function wing(grid: CandidateGrid, pivotSize: 2 | 3): Step | undefined {
  const { n, peers } = grid.geometry;
  const technique = pivotSize === 2 ? 'xy-wing' : 'xyz-wing';
  const held = (cell: number): CellCandidates => ({
    cell: cellRef(n, cell),
    values: valuesOf(at(grid.candidates, cell), n),
  });

  for (let pivot = 0; pivot < n * n; pivot++) {
    const pivotMask = at(grid.candidates, pivot);
    if (at(grid.values, pivot) !== 0 || countBits(pivotMask) !== pivotSize) continue;
    const pincers = at(peers, pivot).filter((cell) => {
      const mask = at(grid.candidates, cell);
      if (at(grid.values, cell) !== 0 || countBits(mask) !== 2) return false;
      // A pincer shares exactly one symbol with an XY pivot, and is a subset
      // of an XYZ pivot.
      return pivotSize === 2 ? countBits(mask & pivotMask) === 1 : (mask & ~pivotMask) === 0;
    });
    for (let i = 0; i < pincers.length; i++) {
      for (let j = i + 1; j < pincers.length; j++) {
        const a = at(pincers, i);
        const b = at(pincers, j);
        const maskA = at(grid.candidates, a);
        const maskB = at(grid.candidates, b);
        if (maskA === maskB) continue;
        const shared = maskA & maskB;
        if (countBits(shared) !== 1) continue;
        if (pivotSize === 2 ? (shared & pivotMask) !== 0 : (maskA | maskB) !== pivotMask) {
          continue;
        }
        const z = at(valuesOf(shared, n), 0);
        let eliminations: CellValue[] = seenByBoth(grid, a, b, z);
        if (pivotSize === 3) {
          const ofPivot = new Set(at(peers, pivot));
          eliminations = eliminations.filter(({ row, col }) => ofPivot.has(row * n + col));
        }
        eliminations = eliminations.filter(({ row, col }) => row * n + col !== pivot);
        if (eliminations.length === 0) continue;
        eliminations.sort((x, y) => x.row - y.row || x.col - y.col);
        return makeStep(technique, [], eliminations, {
          pattern: 'wing',
          value: z,
          pivot: held(pivot),
          pincers: [held(a), held(b)],
        });
      }
    }
  }
  return undefined;
}

export const xyWing = (grid: CandidateGrid): Step | undefined => wing(grid, 2);
export const xyzWing = (grid: CandidateGrid): Step | undefined => wing(grid, 3);

export function wWing(grid: CandidateGrid): Step | undefined {
  const { n, peers, units } = grid.geometry;
  const held = (cell: number): CellCandidates => ({
    cell: cellRef(n, cell),
    values: valuesOf(at(grid.candidates, cell), n),
  });
  const sees = (a: number, b: number): boolean => at(peers, a).includes(b);
  const pairs: number[] = [];
  for (let cell = 0; cell < n * n; cell++) {
    if (at(grid.values, cell) === 0 && countBits(at(grid.candidates, cell)) === 2) pairs.push(cell);
  }
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const a = at(pairs, i);
      const b = at(pairs, j);
      const mask = at(grid.candidates, a);
      if (mask !== at(grid.candidates, b) || sees(a, b)) continue;
      const [first, second] = valuesOf(mask, n);
      if (first === undefined || second === undefined) continue;
      for (const [x, y] of [
        [first, second],
        [second, first],
      ] satisfies [number, number][]) {
        for (const link of links(grid, units, x)) {
          const [p, q] = link.cells;
          if (p === a || p === b || q === a || q === b) continue;
          const joined = (sees(p, a) && sees(q, b)) || (sees(p, b) && sees(q, a));
          if (!joined) continue;
          const eliminations = seenByBoth(grid, a, b, y).sort(
            (u, v) => u.row - v.row || u.col - v.col,
          );
          if (eliminations.length === 0) continue;
          const [nearA, nearB] = sees(p, a) && sees(q, b) ? [p, q] : [q, p];
          return makeStep('w-wing', [], eliminations, {
            pattern: 'w-wing',
            value: y,
            linked: x,
            cells: [held(a), held(b)],
            link: { kind: link.unit.kind, index: link.unit.index },
            ends: [cellRef(n, nearA), cellRef(n, nearB)],
          });
        }
      }
    }
  }
  return undefined;
}

export function wxyzWing(grid: CandidateGrid): Step | undefined {
  const { n, peers } = grid.geometry;
  const open = (cell: number): boolean => {
    const size = countBits(at(grid.candidates, cell));
    return at(grid.values, cell) === 0 && size >= 2 && size <= 4;
  };
  const sees = (a: number, b: number): boolean => at(peers, a).includes(b);
  for (let pivot = 0; pivot < n * n; pivot++) {
    if (!open(pivot)) continue;
    const around = at(peers, pivot).filter(open);
    for (const others of combinations(around, 3)) {
      const cells = [pivot, ...others].sort((a, b) => a - b);
      const union = cells.reduce((mask, cell) => mask | at(grid.candidates, cell), 0);
      if (countBits(union) !== 4) continue;
      const holders = (value: number): number[] =>
        cells.filter((cell) => hasCandidate(at(grid.candidates, cell), value));
      const restricted = (value: number): boolean => {
        const found = holders(value);
        return found.every((a, i) => found.slice(i + 1).every((b) => sees(a, b)));
      };
      for (const z of valuesOf(union, n)) {
        if (!valuesOf(union, n).every((w) => w === z || restricted(w))) continue;
        const zCells = holders(z);
        const eliminations: CellValue[] = [];
        for (let cell = 0; cell < n * n; cell++) {
          if (cells.includes(cell) || !hasCandidate(at(grid.candidates, cell), z)) continue;
          if (zCells.every((holder) => sees(cell, holder)))
            eliminations.push(cellValue(n, cell, z));
        }
        if (eliminations.length === 0) continue;
        return makeStep('wxyz-wing', [], eliminations, {
          pattern: 'restricted cells',
          value: z,
          cells: cells.map((cell) => ({
            cell: cellRef(n, cell),
            values: valuesOf(at(grid.candidates, cell), n),
          })),
        });
      }
    }
  }
  return undefined;
}
