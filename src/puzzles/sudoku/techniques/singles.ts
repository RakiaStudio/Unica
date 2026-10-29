/**
 * Singles: the techniques that place a symbol.
 *
 * - Naked single: a cell has one candidate left, so it holds that symbol.
 * - Hidden single: a symbol has one cell left in some unit, so it goes there.
 */

import {
  at,
  cellName,
  cellValue,
  countBits,
  hasCandidate,
  symbol,
  unitName,
  valuesOf,
  type CandidateGrid,
  type Step,
} from '../candidates.js';

export function nakedSingle(grid: CandidateGrid): Step | undefined {
  const { n } = grid.geometry;
  for (let cell = 0; cell < n * n; cell++) {
    const mask = at(grid.candidates, cell);
    if (at(grid.values, cell) !== 0 || countBits(mask) !== 1) continue;
    const value = at(valuesOf(mask, n), 0);
    return {
      technique: 'naked single',
      placements: [cellValue(n, cell, value)],
      eliminations: [],
      reason: `Naked single: ${cellName(n, cell)} can only be ${symbol(value)}`,
    };
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
      return {
        technique: 'hidden single',
        placements: [cellValue(n, cell, value)],
        eliminations: [],
        reason: `Hidden single: ${symbol(value)} can only go in ${cellName(n, cell)} within ${unitName(unit)}`,
      };
    }
  }
  return undefined;
}
