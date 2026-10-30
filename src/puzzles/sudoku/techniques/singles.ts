/**
 * Singles: the techniques that place a symbol.
 *
 * - Naked single: a cell has one candidate left, so it holds that symbol.
 * - Hidden single: a symbol has one cell left in some unit, so it goes there.
 */

import {
  at,
  cellRef,
  cellValue,
  countBits,
  hasCandidate,
  unitRef,
  valuesOf,
  type CandidateGrid,
  type Step,
} from '../candidates.js';
import { makeStep } from './step.js';

export function nakedSingle(grid: CandidateGrid): Step | undefined {
  const { n } = grid.geometry;
  for (let cell = 0; cell < n * n; cell++) {
    const mask = at(grid.candidates, cell);
    if (at(grid.values, cell) !== 0 || countBits(mask) !== 1) continue;
    const value = at(valuesOf(mask, n), 0);
    return makeStep('naked single', [cellValue(n, cell, value)], [], {
      pattern: 'naked single',
      cell: cellRef(n, cell),
      value,
    });
  }
  return undefined;
}

export function hiddenSingle(grid: CandidateGrid): Step | undefined {
  const { n, units } = grid.geometry;
  for (const unit of units) {
    for (let value = 1; value <= n; value++) {
      if (unit.cells.some((cell) => at(grid.values, cell) === value)) continue;
      const places = unit.cells.filter((cell) => hasCandidate(at(grid.candidates, cell), value));
      if (places.length !== 1) continue;
      const cell = at(places, 0);
      return makeStep('hidden single', [cellValue(n, cell, value)], [], {
        pattern: 'hidden single',
        unit: unitRef(unit),
        cell: cellRef(n, cell),
        value,
      });
    }
  }
  return undefined;
}
