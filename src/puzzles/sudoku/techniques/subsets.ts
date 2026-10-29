/**
 * Subsets: k cells and k symbols locked to each other inside one unit.
 *
 * - Naked subset: k cells whose candidates together are exactly k symbols. Those
 *   symbols must fill those cells, so they leave every other cell of the unit.
 * - Hidden subset: k symbols whose places together are exactly k cells. Those
 *   cells must hold those symbols, so every other candidate leaves them.
 *
 * Pairs (k = 2) and triples (k = 3) are rated as separate techniques.
 */

import {
  at,
  bit,
  cellName,
  cellValue,
  countBits,
  hasCandidate,
  symbol,
  unitName,
  valuesOf,
  type CandidateGrid,
  type CellValue,
  type Step,
  type TechniqueName,
} from '../candidates.js';

/** All k-element combinations of `items`, in lexicographic order of positions. */
export function combinations<T>(items: readonly T[], k: number): T[][] {
  const result: T[][] = [];
  const chosen: T[] = [];
  const walk = (start: number): void => {
    if (chosen.length === k) {
      result.push([...chosen]);
      return;
    }
    for (let i = start; i <= items.length - (k - chosen.length); i++) {
      chosen.push(at(items, i));
      walk(i + 1);
      chosen.pop();
    }
  };
  walk(0);
  return result;
}

function list(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${at(parts, parts.length - 1)}`;
}

function nakedSubset(grid: CandidateGrid, k: number, technique: TechniqueName): Step | undefined {
  const { n, units } = grid.geometry;
  const label = technique.charAt(0).toUpperCase() + technique.slice(1);
  for (const unit of units) {
    const open = unit.cells.filter((cell) => at(grid.values, cell) === 0);
    const small = open.filter((cell) => {
      const count = countBits(at(grid.candidates, cell));
      return count >= 1 && count <= k;
    });
    for (const group of combinations(small, k)) {
      const union = group.reduce((mask, cell) => mask | at(grid.candidates, cell), 0);
      if (countBits(union) !== k) continue;
      const symbols = valuesOf(union, n);
      const eliminations: CellValue[] = [];
      for (const cell of open) {
        if (group.includes(cell)) continue;
        for (const value of symbols) {
          if (hasCandidate(at(grid.candidates, cell), value)) {
            eliminations.push(cellValue(n, cell, value));
          }
        }
      }
      if (eliminations.length === 0) continue;
      const names = symbols.map(symbol);
      return {
        technique,
        placements: [],
        eliminations,
        reason: `${label}: ${list(group.map((cell) => cellName(n, cell)))} hold only ${list(names)} between them, so ${list(names)} leave the other cells of ${unitName(unit)}`,
      };
    }
  }
  return undefined;
}

function hiddenSubset(grid: CandidateGrid, k: number, technique: TechniqueName): Step | undefined {
  const { n, units } = grid.geometry;
  const label = technique.charAt(0).toUpperCase() + technique.slice(1);
  for (const unit of units) {
    const placed = unit.cells.reduce((mask, cell) => {
      const value = at(grid.values, cell);
      return value === 0 ? mask : mask | bit(value);
    }, 0);
    const missing: number[] = [];
    for (let value = 1; value <= n; value++) if ((placed & bit(value)) === 0) missing.push(value);
    const placesOf = new Map(
      missing.map((value) => [
        value,
        unit.cells.filter((cell) => hasCandidate(at(grid.candidates, cell), value)),
      ]),
    );
    const candidatesFor = missing.filter((value) => {
      const count = placesOf.get(value)?.length ?? 0;
      return count >= 1 && count <= k;
    });
    for (const group of combinations(candidatesFor, k)) {
      const cells = [...new Set(group.flatMap((value) => placesOf.get(value) ?? []))].sort(
        (a, b) => a - b,
      );
      if (cells.length !== k) continue;
      const keep = group.reduce((mask, value) => mask | bit(value), 0);
      const eliminations: CellValue[] = [];
      for (const cell of cells) {
        for (const value of valuesOf(at(grid.candidates, cell) & ~keep, n)) {
          eliminations.push(cellValue(n, cell, value));
        }
      }
      if (eliminations.length === 0) continue;
      return {
        technique,
        placements: [],
        eliminations,
        reason: `${label}: in ${unitName(unit)}, ${list(group.map(symbol))} can only go in ${list(cells.map((cell) => cellName(n, cell)))}, so those cells hold nothing else`,
      };
    }
  }
  return undefined;
}

export const nakedPair = (grid: CandidateGrid): Step | undefined =>
  nakedSubset(grid, 2, 'naked pair');
export const hiddenPair = (grid: CandidateGrid): Step | undefined =>
  hiddenSubset(grid, 2, 'hidden pair');
export const nakedTriple = (grid: CandidateGrid): Step | undefined =>
  nakedSubset(grid, 3, 'naked triple');
export const hiddenTriple = (grid: CandidateGrid): Step | undefined =>
  hiddenSubset(grid, 3, 'hidden triple');
