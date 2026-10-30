/**
 * Intersections (locked candidates): a box and a line share a few cells.
 *
 * - Pointing: inside a box, a symbol's places all lie on one row or column.
 *   The symbol is in the box on that line, so it leaves the rest of the line.
 * - Claiming: inside a row or column, a symbol's places all lie in one box.
 *   The symbol is on the line in that box, so it leaves the rest of the box.
 */

import {
  at,
  cellValue,
  hasCandidate,
  unitRef,
  type CandidateGrid,
  type CellValue,
  type Step,
  type Unit,
} from '../candidates.js';
import { makeStep } from './step.js';

function placesIn(grid: CandidateGrid, unit: Unit, value: number): number[] | undefined {
  if (unit.cells.some((cell) => at(grid.values, cell) === value)) return undefined;
  const places = unit.cells.filter((cell) => hasCandidate(at(grid.candidates, cell), value));
  return places.length === 0 ? undefined : places;
}

/** Every cell of `target` outside `source` that still has `value` as a candidate. */
function eliminate(grid: CandidateGrid, target: Unit, source: Unit, value: number): CellValue[] {
  const { n } = grid.geometry;
  return target.cells
    .filter((cell) => !source.cells.includes(cell))
    .filter((cell) => hasCandidate(at(grid.candidates, cell), value))
    .map((cell) => cellValue(n, cell, value));
}

export function pointing(grid: CandidateGrid): Step | undefined {
  const { n, boxes, rows, columns } = grid.geometry;
  for (const box of boxes) {
    for (let value = 1; value <= n; value++) {
      const places = placesIn(grid, box, value);
      if (places === undefined) continue;
      const first = at(places, 0);
      for (const line of [at(rows, Math.floor(first / n)), at(columns, first % n)]) {
        if (!places.every((cell) => line.cells.includes(cell))) continue;
        const eliminations = eliminate(grid, line, box, value);
        if (eliminations.length === 0) continue;
        return makeStep('pointing', [], eliminations, {
          pattern: 'pointing',
          box: unitRef(box),
          line: unitRef(line),
          value,
        });
      }
    }
  }
  return undefined;
}

export function claiming(grid: CandidateGrid): Step | undefined {
  const { n, boxes, rows, columns, boxOf } = grid.geometry;
  for (const line of [...rows, ...columns]) {
    for (let value = 1; value <= n; value++) {
      const places = placesIn(grid, line, value);
      if (places === undefined) continue;
      const box = at(boxes, at(boxOf, at(places, 0)));
      if (!places.every((cell) => box.cells.includes(cell))) continue;
      const eliminations = eliminate(grid, box, line, value);
      if (eliminations.length === 0) continue;
      return makeStep('claiming', [], eliminations, {
        pattern: 'claiming',
        line: unitRef(line),
        box: unitRef(box),
        value,
      });
    }
  }
  return undefined;
}
