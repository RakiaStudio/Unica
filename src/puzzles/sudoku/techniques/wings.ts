/**
 * Wings: a pivot cell and two pincers that each see it.
 *
 * - XY-wing: the pivot holds x or y; one pincer holds x or z, the other y or z.
 *   Whichever the pivot is, one pincer is forced to z, so z leaves every cell
 *   that sees both pincers.
 * - XYZ-wing: the pivot holds x, y or z; the pincers are as above. If the pivot
 *   is z, it is z itself; otherwise a pincer is. So z leaves every cell that
 *   sees the pivot and both pincers.
 */

import {
  at,
  cellRef,
  countBits,
  valuesOf,
  type CandidateGrid,
  type CellCandidates,
  type CellValue,
  type Step,
} from '../candidates.js';
import { makeStep } from './step.js';
import { seenByBoth } from './patterns.js';

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
