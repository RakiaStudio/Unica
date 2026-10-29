/**
 * Independent oracles used by the test-suite.
 *
 * These deliberately share no code with `src/`. When a property test says a
 * generated sudoku is unique, that verdict comes from this plain backtracking
 * search, not from the dancing-links engine that produced the puzzle. The
 * engine is not allowed to grade its own homework.
 */

/**
 * Count the solutions of a sudoku grid by backtracking, stopping at `limit`.
 * `grid` is row-major with `0` for empty cells; mutated during search but
 * restored on return.
 */
export function countSudokuSolutions(
  grid: number[][],
  boxRows: number,
  boxCols: number,
  limit = 2,
): number {
  const n = boxRows * boxCols;
  let count = 0;

  const allowed = (r: number, c: number, v: number): boolean => {
    for (let i = 0; i < n; i++) {
      if (grid[r]?.[i] === v) return false;
      if (grid[i]?.[c] === v) return false;
    }
    const r0 = Math.floor(r / boxRows) * boxRows;
    const c0 = Math.floor(c / boxCols) * boxCols;
    for (let dr = 0; dr < boxRows; dr++) {
      for (let dc = 0; dc < boxCols; dc++) {
        if (grid[r0 + dr]?.[c0 + dc] === v) return false;
      }
    }
    return true;
  };

  // Branch on the empty cell with the fewest legal symbols (plain MRV); the
  // oracle must stay fast enough to check hard puzzles, but it is still a
  // textbook backtracking search with no shared code or data structures.
  const search = (): void => {
    if (count >= limit) return;
    let bestR = -1;
    let bestC = -1;
    let bestCandidates: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r]?.[c] !== 0) continue;
        const candidates: number[] = [];
        for (let v = 1; v <= n; v++) if (allowed(r, c, v)) candidates.push(v);
        if (candidates.length === 0) return; // dead end
        if (bestR === -1 || candidates.length < bestCandidates.length) {
          bestR = r;
          bestC = c;
          bestCandidates = candidates;
        }
      }
    }
    if (bestR === -1) {
      count++;
      return;
    }
    const line = grid[bestR];
    if (line === undefined) return;
    for (const v of bestCandidates) {
      line[bestC] = v;
      search();
      line[bestC] = 0;
      if (count >= limit) return;
    }
  };

  search();
  return count;
}

/** Parse the text notation used by `sudoku().format` into a numeric grid. */
export function textToGrid(text: string, n: number): number[][] {
  const chars = Array.from(text.replace(/\s+/g, ''));
  const grid: number[][] = [];
  for (let r = 0; r < n; r++) {
    const line: number[] = [];
    for (let c = 0; c < n; c++) {
      const ch = chars[r * n + c] ?? '.';
      line.push(ch === '.' ? 0 : parseInt(ch, 36));
    }
    grid.push(line);
  }
  return grid;
}

/** A grid is a valid completed sudoku when every row, column and box is a permutation of 1..n. */
export function isValidSudokuSolution(grid: number[][], boxRows: number, boxCols: number): boolean {
  const n = boxRows * boxCols;
  const full = (values: (number | undefined)[]): boolean =>
    new Set(values).size === n && values.every((v) => v !== undefined && v >= 1 && v <= n);
  for (let i = 0; i < n; i++) {
    if (!full(grid[i] ?? [])) return false;
    if (!full(grid.map((line) => line[i]))) return false;
  }
  for (let br = 0; br < n; br += boxRows) {
    for (let bc = 0; bc < n; bc += boxCols) {
      const box: (number | undefined)[] = [];
      for (let dr = 0; dr < boxRows; dr++) {
        for (let dc = 0; dc < boxCols; dc++) box.push(grid[br + dr]?.[bc + dc]);
      }
      if (!full(box)) return false;
    }
  }
  return true;
}

/**
 * The first solution of a sudoku grid found by the same backtracking search as
 * `countSudokuSolutions`, or `undefined` when there is none. Does not mutate
 * `grid`. Used to check rating steps against the answer.
 */
export function solveSudoku(
  grid: number[][],
  boxRows: number,
  boxCols: number,
): number[][] | undefined {
  const n = boxRows * boxCols;
  const work = grid.map((line) => [...line]);

  const allowed = (r: number, c: number, v: number): boolean => {
    for (let i = 0; i < n; i++) {
      if (work[r]?.[i] === v) return false;
      if (work[i]?.[c] === v) return false;
    }
    const r0 = Math.floor(r / boxRows) * boxRows;
    const c0 = Math.floor(c / boxCols) * boxCols;
    for (let dr = 0; dr < boxRows; dr++) {
      for (let dc = 0; dc < boxCols; dc++) {
        if (work[r0 + dr]?.[c0 + dc] === v) return false;
      }
    }
    return true;
  };

  const search = (): boolean => {
    let bestR = -1;
    let bestC = -1;
    let bestCandidates: number[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (work[r]?.[c] !== 0) continue;
        const candidates: number[] = [];
        for (let v = 1; v <= n; v++) if (allowed(r, c, v)) candidates.push(v);
        if (candidates.length === 0) return false;
        if (bestR === -1 || candidates.length < bestCandidates.length) {
          bestR = r;
          bestC = c;
          bestCandidates = candidates;
        }
      }
    }
    if (bestR === -1) return true;
    const line = work[bestR];
    if (line === undefined) return false;
    for (const v of bestCandidates) {
      line[bestC] = v;
      if (search()) return true;
    }
    line[bestC] = 0;
    return false;
  };

  return search() ? work : undefined;
}
