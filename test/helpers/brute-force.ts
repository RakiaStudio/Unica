/**
 * Independent oracles used by the test-suite.
 *
 * These deliberately share no code with `src/`. When a property test says a
 * generated sudoku or pentomino puzzle is unique, that verdict comes from a
 * plain backtracking search here, not from the dancing-links engine that
 * produced the puzzle. The engine is not allowed to grade its own homework.
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

/**
 * The twelve pentominoes, drawn here rather than imported, so that a wrong
 * shape in `src/` cannot hide behind the same wrong shape in the oracle.
 */
const PENTOMINO_PICTURES: Readonly<Record<string, readonly string[]>> = {
  F: ['.##', '##.', '.#.'],
  I: ['#####'],
  L: ['####', '#...'],
  N: ['###.', '..##'],
  P: ['###', '##.'],
  T: ['###', '.#.', '.#.'],
  U: ['#.#', '###'],
  V: ['#..', '#..', '###'],
  W: ['#..', '##.', '.##'],
  X: ['.#.', '###', '.#.'],
  Y: ['####', '.#..'],
  Z: ['##.', '.#.', '.##'],
};

type Cells = [number, number][];

/** Every distinct rotation and reflection of a shape, each as `[row, col]` cells sorted column by column. */
function orientations(picture: readonly string[]): Cells[] {
  let cells: Cells = [];
  picture.forEach((line, r) => {
    Array.from(line).forEach((ch, c) => {
      if (ch === '#') cells.push([r, c]);
    });
  });
  const seen = new Map<string, Cells>();
  for (let flip = 0; flip < 2; flip++) {
    for (let turn = 0; turn < 4; turn++) {
      const rows = Math.min(...cells.map(([r]) => r));
      const cols = Math.min(...cells.map(([, c]) => c));
      const shifted: Cells = cells
        .map(([r, c]): [number, number] => [r - rows, c - cols])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      seen.set(JSON.stringify(shifted), shifted);
      cells = cells.map(([r, c]): [number, number] => [c, -r]);
    }
    cells = cells.map(([r, c]): [number, number] => [r, -c]);
  }
  return [...seen.values()];
}

/** All fixed pentominoes by name; 63 in total. */
export function pentominoOrientations(): Map<string, Cells[]> {
  return new Map(
    Object.entries(PENTOMINO_PICTURES).map(([name, picture]) => [name, orientations(picture)]),
  );
}

/**
 * Count the ways to finish a pentomino tiling given in the text notation of
 * `polyominoTiling().format`: one line per row, a piece letter for a clue cell,
 * `.` for an empty cell. Every pentomino is used exactly once; the pieces that
 * already appear stay where they are. Stops at `limit`.
 */
export function countPentominoTilings(text: string, limit = 2): number {
  const board = text
    .trim()
    .split('\n')
    .map((line) => Array.from(line));
  const height = board.length;
  const width = board[0]?.length ?? 0;
  const pieces = pentominoOrientations();
  const unused = new Set(pieces.keys());
  for (const line of board) for (const ch of line) if (ch !== '.') unused.delete(ch);
  let count = 0;

  const empty = (r: number, c: number): boolean => board[r]?.[c] === '.';

  // A region of empty cells whose size is not a multiple of 5 can never be
  // filled; checking this after each placement keeps the search small.
  const fillable = (): boolean => {
    const seen = new Set<number>();
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (!empty(r, c) || seen.has(r * width + c)) continue;
        let size = 0;
        const stack: [number, number][] = [[r, c]];
        seen.add(r * width + c);
        for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
          size++;
          const [y, x] = next;
          for (const [ny, nx] of [
            [y - 1, x],
            [y + 1, x],
            [y, x - 1],
            [y, x + 1],
          ] satisfies [number, number][]) {
            if (nx < 0 || nx >= width || !empty(ny, nx) || seen.has(ny * width + nx)) continue;
            seen.add(ny * width + nx);
            stack.push([ny, nx]);
          }
        }
        if (size % 5 !== 0) return false;
      }
    }
    return true;
  };

  // Fill the first empty cell, column by column from the left, with each
  // unused piece in each orientation whose first cell lands on it.
  const search = (): void => {
    if (count >= limit) return;
    let row = -1;
    let col = -1;
    for (let c = 0; c < width && row < 0; c++) {
      for (let r = 0; r < height; r++) {
        if (empty(r, c)) {
          row = r;
          col = c;
          break;
        }
      }
    }
    if (row < 0) {
      if (unused.size === 0) count++;
      return;
    }
    for (const name of [...unused]) {
      for (const shape of pieces.get(name) ?? []) {
        const [first] = shape;
        if (first === undefined) continue;
        const placed: [number, number][] = shape.map(([r, c]) => [
          row + r - first[0],
          col + c - first[1],
        ]);
        if (!placed.every(([r, c]) => empty(r, c))) continue;
        for (const [r, c] of placed) {
          const line = board[r];
          if (line !== undefined) line[c] = name;
        }
        unused.delete(name);
        if (fillable()) search();
        unused.add(name);
        for (const [r, c] of placed) {
          const line = board[r];
          if (line !== undefined) line[c] = '.';
        }
        if (count >= limit) return;
      }
    }
  };

  if (fillable()) search();
  return count;
}
