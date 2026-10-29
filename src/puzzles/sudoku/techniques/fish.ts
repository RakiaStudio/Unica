/**
 * X-wing: in two rows, a symbol can only go in the same two columns.
 *
 * Each of the two rows needs the symbol once, in one of those two columns, and
 * the two rows cannot use the same column. So the symbol occupies both columns
 * within those rows, and leaves every other cell of the two columns. The same
 * holds with rows and columns swapped.
 */

import {
  at,
  cellValue,
  hasCandidate,
  symbol,
  type CandidateGrid,
  type CellValue,
  type Step,
  type Unit,
} from '../candidates.js';

/** Positions (index within the line) where `value` can go, or `undefined` when placed. */
function positions(grid: CandidateGrid, line: Unit, value: number): number[] | undefined {
  if (line.cells.some((cell) => at(grid.values, cell) === value)) return undefined;
  const result: number[] = [];
  line.cells.forEach((cell, position) => {
    if (hasCandidate(at(grid.candidates, cell), value)) result.push(position);
  });
  return result;
}

function xWingAlong(
  grid: CandidateGrid,
  bases: readonly Unit[],
  covers: readonly Unit[],
  value: number,
): Step | undefined {
  const { n } = grid.geometry;
  const pairs: { base: Unit; at: [number, number] }[] = [];
  for (const base of bases) {
    const found = positions(grid, base, value);
    if (found?.length === 2) pairs.push({ base, at: [at(found, 0), at(found, 1)] });
  }
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const a = at(pairs, i);
      const b = at(pairs, j);
      if (a.at[0] !== b.at[0] || a.at[1] !== b.at[1]) continue;
      const lines = a.at.map((position) => at(covers, position));
      const eliminations: CellValue[] = [];
      for (const line of lines) {
        for (const cell of line.cells) {
          if (a.base.cells.includes(cell) || b.base.cells.includes(cell)) continue;
          if (hasCandidate(at(grid.candidates, cell), value)) {
            eliminations.push(cellValue(n, cell, value));
          }
        }
      }
      if (eliminations.length === 0) continue;
      eliminations.sort((x, y) => x.row - y.row || x.col - y.col);
      const kind = a.base.kind === 'row' ? 'rows' : 'columns';
      const other = a.base.kind === 'row' ? 'columns' : 'rows';
      const [first, second] = lines.map((line) => String(line.index + 1));
      return {
        technique: 'x-wing',
        placements: [],
        eliminations,
        reason: `X-wing: ${symbol(value)} in ${kind} ${String(a.base.index + 1)} and ${String(b.base.index + 1)} can only go in ${other} ${first ?? '?'} and ${second ?? '?'}, so ${symbol(value)} leaves the rest of those ${other}`,
      };
    }
  }
  return undefined;
}

export function xWing(grid: CandidateGrid): Step | undefined {
  const { n, rows, columns } = grid.geometry;
  for (let value = 1; value <= n; value++) {
    const step = xWingAlong(grid, rows, columns, value) ?? xWingAlong(grid, columns, rows, value);
    if (step !== undefined) return step;
  }
  return undefined;
}
