/**
 * Verify an installed copy of @rakiastudio/unica against its three guarantees.
 *
 * The release workflow installs the version it just published from npm into an
 * empty directory and runs this script there, the way a user would get the
 * package. Run inside this repository it resolves the package to its own
 * `dist/` instead (`npm run build && node scripts/verify-published.mjs`).
 *
 * The oracles below share no code with `src/` or with `test/helpers/`: they are
 * plain backtracking searches written for this script, so the package is never
 * asked to grade its own output. Each oracle is first calibrated on counts that
 * are known independently (288 complete 4x4 sudokus, 8 pentomino tilings of the
 * 3x20 rectangle).
 *
 * Set EXPECT_VERSION to fail unless the resolved package has that version.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  ExactCoverError,
  PENTOMINOES,
  classify,
  generate,
  polyominoTiling,
  sudoku,
} from '@rakiastudio/unica';
import { polyominoTiling as polyominoSubpath } from '@rakiastudio/unica/polyomino';
import { sudoku as sudokuSubpath } from '@rakiastudio/unica/sudoku';

const require = createRequire(import.meta.url);
const installed = require('@rakiastudio/unica/package.json').version;

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === '' ? '' : `  (${detail})`}`);
}

// ---------------------------------------------------------------------------
// Sudoku oracle: backtracking on the cell with the fewest candidates.

const SYMBOLS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function parseGrid(text, n) {
  const cells = [...text.replace(/\s+/g, '')];
  if (cells.length !== n * n) throw new Error(`expected ${n * n} cells, got ${cells.length}`);
  return cells.map((c) => (c === '.' ? 0 : SYMBOLS.indexOf(c) + 1));
}

function allowed(grid, boxRows, boxCols, index, value) {
  const n = boxRows * boxCols;
  const row = Math.floor(index / n);
  const col = index % n;
  for (let k = 0; k < n; k++) {
    if (grid[row * n + k] === value || grid[k * n + col] === value) return false;
  }
  const r0 = row - (row % boxRows);
  const c0 = col - (col % boxCols);
  for (let a = 0; a < boxRows; a++) {
    for (let b = 0; b < boxCols; b++) {
      if (grid[(r0 + a) * n + c0 + b] === value) return false;
    }
  }
  return true;
}

function countSudoku(start, boxRows, boxCols, limit = 2) {
  const n = boxRows * boxCols;
  const grid = [...start];
  let count = 0;
  const search = () => {
    let best = -1;
    let bestValues = [];
    for (let i = 0; i < n * n; i++) {
      if (grid[i] !== 0) continue;
      const values = [];
      for (let v = 1; v <= n; v++) if (allowed(grid, boxRows, boxCols, i, v)) values.push(v);
      if (best < 0 || values.length < bestValues.length) {
        best = i;
        bestValues = values;
        if (values.length < 2) break;
      }
    }
    if (best < 0) {
      count++;
      return;
    }
    for (const v of bestValues) {
      grid[best] = v;
      search();
      grid[best] = 0;
      if (count >= limit) return;
    }
  };
  search();
  return count;
}

function isCompleteGrid(grid, boxRows, boxCols) {
  return grid.every((value, index) => {
    if (value === 0) return false;
    const copy = [...grid];
    copy[index] = 0;
    return allowed(copy, boxRows, boxCols, index, value);
  });
}

// ---------------------------------------------------------------------------
// Pentomino oracle: fill the first empty cell, prune regions not divisible by 5.

function orientations(cells) {
  const seen = new Map();
  let current = cells.map(([x, y]) => [x, y]);
  for (let flip = 0; flip < 2; flip++) {
    for (let turn = 0; turn < 4; turn++) {
      current = current.map(([x, y]) => [y, -x]);
      const minX = Math.min(...current.map((c) => c[0]));
      const minY = Math.min(...current.map((c) => c[1]));
      const normal = current
        .map(([x, y]) => [x - minX, y - minY])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      seen.set(JSON.stringify(normal), normal);
    }
    current = current.map(([x, y]) => [-x, y]);
  }
  return [...seen.values()];
}

function regionsDivisibleByFive(board, width, height) {
  const seen = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (board[i] !== '.' || seen[i] === 1) continue;
    let size = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length > 0) {
      const j = stack.pop();
      size++;
      const x = j % width;
      const y = (j - x) / width;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const k = ny * width + nx;
        if (board[k] === '.' && seen[k] === 0) {
          seen[k] = 1;
          stack.push(k);
        }
      }
    }
    if (size % 5 !== 0) return false;
  }
  return true;
}

const PIECES = new Map(PENTOMINOES.map((p) => [p.name, orientations(p.cells)]));

function countTilings(start, width, height, limit = 2) {
  const board = [...start];
  const used = new Set(board.filter((c) => c !== '.'));
  let count = 0;
  const search = () => {
    const empty = board.indexOf('.');
    if (empty < 0) {
      count++;
      return;
    }
    const x0 = empty % width;
    const y0 = (empty - x0) / width;
    for (const [name, shapes] of PIECES) {
      if (used.has(name)) continue;
      for (const shape of shapes) {
        // The shape's first cell (top row, leftmost) must land on the first empty cell.
        const [ax, ay] = shape[0];
        const cells = [];
        for (const [x, y] of shape) {
          const X = x - ax + x0;
          const Y = y - ay + y0;
          if (X < 0 || X >= width || Y < 0 || Y >= height || board[Y * width + X] !== '.') break;
          cells.push(Y * width + X);
        }
        if (cells.length !== shape.length) continue;
        for (const c of cells) board[c] = name;
        used.add(name);
        if (regionsDivisibleByFive(board, width, height)) search();
        for (const c of cells) board[c] = '.';
        used.delete(name);
        if (count >= limit) return;
      }
    }
  };
  search();
  return count;
}

// ---------------------------------------------------------------------------
// Checks

console.log(`@rakiastudio/unica ${installed}`);
const expected = process.env.EXPECT_VERSION;
if (expected !== undefined && expected !== '') {
  check(`installed version is ${expected}`, installed === expected, installed);
}

// 1. The oracles themselves, on counts known independently of this package.
check('oracle: 288 complete 4x4 sudokus', countSudoku(Array(16).fill(0), 2, 2, 1000) === 288);
check('oracle: 8 pentomino tilings of 3x20', countTilings(Array(60).fill('.'), 20, 3, 1000) === 8);

// 2. The README examples.
const s = sudoku();
const daily = s.generate({ seed: 'daily-2026-10-29' });
check(
  'README: sudoku for seed daily-2026-10-29',
  daily.text.puzzle.trim() ===
    '6...9.74.\n5..43....\n8........\n..7.5...8\n.....65..\n.....1.32\n3..18..7.\n..6..3...\n..52.....',
);
check(
  'README: 24 clues, minimal, seed reported',
  daily.clueCount === 24 && daily.minimal && daily.seed === 'daily-2026-10-29',
);
check('README: solve returns the solution', s.solve(daily.text.puzzle) === daily.text.solution);
check(
  'README: classify reports unique',
  s.classify('..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..')
    .count === 'unique',
);
const tiling = polyominoTiling({ width: 10, height: 6, pieces: PENTOMINOES }).generate({
  seed: 42,
});
check(
  'README: pentomino puzzle for seed 42',
  tiling.text.puzzle.trim() ===
    '..........\n..........\n...UU.....\n....U.....\n.L.UU.....\n.LLLL.....',
);
check(
  'README: pentomino solution for seed 42',
  tiling.text.solution.trim() ===
    'TTTNNNZVVV\nITNNFFZZZV\nITXUUFFWZV\nIXXXUFWWPP\nILXUUWWYPP\nILLLLYYYYP',
);
const knuth = {
  primaryColumns: 7,
  secondaryColumns: 0,
  rows: [
    { option: 'A', primary: [0, 3, 6] },
    { option: 'B', primary: [0, 3] },
    { option: 'C', primary: [3, 4, 6] },
    { option: 'D', primary: [2, 4, 5] },
    { option: 'E', primary: [1, 2, 5, 6] },
    { option: 'F', primary: [1, 6] },
  ],
};
const knuthResult = classify(knuth, []);
check(
  'README: Knuth example has the one cover {B, D, F}',
  knuthResult.count === 'unique' && JSON.stringify(knuthResult.solution) === '[1,3,5]',
);
check('README: Knuth example needs no clues', generate(knuth, { seed: 1 }).clues.length === 0);

// The difficulty rating (0.2.0 and later). Royle's 17-clue puzzle has the
// fewest clues possible and is solved by singles alone; its answer is known
// independently, and the oracle confirms it is the only one.
if (typeof s.rate === 'function') {
  const seventeen =
    '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
  const answer =
    '693784512487512936125963874932651487568247391741398625319475268856129743274836159';
  const rating = s.rate(seventeen);
  const filled = [...seventeen].map(Number);
  for (const step of rating.steps) {
    for (const { row, col, value } of step.placements) filled[row * 9 + col] = value;
  }
  check(
    'rating: the 17-clue puzzle is unique by the oracle',
    countSudoku(parseGrid(seventeen.replace(/0/g, '.'), 9), 3, 3) === 1,
  );
  check(
    'rating: the 17-clue puzzle rates easy and is solved to the known answer',
    rating.solved && rating.difficulty === 'easy' && filled.join('') === answer,
    `${rating.difficulty}, ${String(rating.steps.length)} steps`,
  );
} else {
  console.log(`skip rating checks: ${installed} has no rate()`);
}

// 3. Unique and minimal, by the oracles.
const seeds = (count, prefix) => Array.from({ length: count }, (_, i) => `${prefix}-${i}`);

function verifySudoku(boxRows, boxCols, seedList) {
  const n = boxRows * boxCols;
  const generator = sudoku({ boxRows, boxCols });
  const tally = { unique: 0, minimal: 0, complete: 0, consistent: 0 };
  for (const seed of seedList) {
    const puzzle = generator.generate({ seed });
    const clues = parseGrid(puzzle.text.puzzle, n);
    const solution = parseGrid(puzzle.text.solution, n);
    if (countSudoku(clues, boxRows, boxCols) === 1) tally.unique++;
    if (isCompleteGrid(solution, boxRows, boxCols)) tally.complete++;
    if (clues.every((v, i) => v === 0 || v === solution[i])) tally.consistent++;
    const everyClueNeeded = clues.every((v, i) => {
      if (v === 0) return true;
      const without = [...clues];
      without[i] = 0;
      return countSudoku(without, boxRows, boxCols) >= 2;
    });
    if (everyClueNeeded && puzzle.minimal) tally.minimal++;
  }
  const total = `/${seedList.length}`;
  check(`sudoku ${n}x${n}: unique`, tally.unique === seedList.length, tally.unique + total);
  check(`sudoku ${n}x${n}: minimal`, tally.minimal === seedList.length, tally.minimal + total);
  check(
    `sudoku ${n}x${n}: solution is a complete grid`,
    tally.complete === seedList.length,
    tally.complete + total,
  );
  check(
    `sudoku ${n}x${n}: clues agree with the solution`,
    tally.consistent === seedList.length,
    tally.consistent + total,
  );
}

function verifyPentomino(width, height, seedList) {
  const board = polyominoTiling({ width, height, pieces: PENTOMINOES });
  const tally = { unique: 0, minimal: 0, complete: 0 };
  for (const seed of seedList) {
    const puzzle = board.generate({ seed });
    const placed = [...puzzle.text.puzzle.replace(/\s+/g, '')];
    const solution = [...puzzle.text.solution.replace(/\s+/g, '')];
    if (countTilings(placed, width, height) === 1) tally.unique++;
    if (!solution.includes('.') && countTilings(solution, width, height) === 1) tally.complete++;
    const pieces = [...new Set(placed.filter((c) => c !== '.'))];
    const everyPieceNeeded = pieces.every(
      (name) =>
        countTilings(
          placed.map((c) => (c === name ? '.' : c)),
          width,
          height,
        ) >= 2,
    );
    if (everyPieceNeeded && puzzle.minimal) tally.minimal++;
  }
  const total = `/${seedList.length}`;
  const tag = `pentomino ${width}x${height}`;
  check(`${tag}: unique`, tally.unique === seedList.length, tally.unique + total);
  check(`${tag}: minimal`, tally.minimal === seedList.length, tally.minimal + total);
  check(
    `${tag}: solution is a full tiling`,
    tally.complete === seedList.length,
    tally.complete + total,
  );
}

verifySudoku(2, 2, seeds(50, 'four'));
verifySudoku(2, 3, seeds(30, 'six'));
verifySudoku(3, 3, seeds(30, 'nine'));
verifyPentomino(20, 3, [1, 2, 3, 4, 5, 6, 7, 8]);
verifyPentomino(10, 6, [42, 7, 'a', 'b']);

// 4. Reproducible, including across processes.
const inChild = (seed) =>
  execFileSync(process.execPath, [
    '--input-type=module',
    '-e',
    `import { sudoku } from '@rakiastudio/unica';
     process.stdout.write(sudoku().generate({ seed: ${JSON.stringify(seed)} }).text.puzzle);`,
  ]).toString();
const here = s.generate({ seed: 'repro' }).text.puzzle;
check('reproducible: same seed in two other processes', inChild('repro') === inChild('repro'));
check('reproducible: other process matches this one', inChild('repro') === here);
check(
  'reproducible: number 1 and string "1" are different seeds',
  s.generate({ seed: 1 }).text.puzzle !== s.generate({ seed: '1' }).text.puzzle,
);
const distinct = new Set(seeds(20, 'variety').map((seed) => s.generate({ seed }).text.puzzle));
check('variety: 20 seeds give 20 puzzles', distinct.size === 20, `${distinct.size}/20`);
const unseeded = s.generate();
check(
  'no seed: the reported seed regenerates the puzzle',
  s.generate({ seed: unseeded.seed }).text.puzzle === unseeded.text.puzzle,
);

// 5. Edge cases.
check('solve: several solutions gives undefined', s.solve('.'.repeat(81)) === undefined);
check('classify: empty grid is multiple', s.classify('.'.repeat(81)).count === 'multiple');
check(
  'generate: a starting solution that is not a cover is rejected',
  (() => {
    try {
      generate(knuth, { solution: [0, 1] });
      return false;
    } catch (error) {
      return error instanceof ExactCoverError;
    }
  })(),
);
const early = s.generate({ seed: 'stop', stopAtClues: 40 });
check(
  'stopAtClues: still unique, reported as not minimal',
  countSudoku(parseGrid(early.text.puzzle, 9), 3, 3) === 1 && !early.minimal,
  `${early.clueCount} clues`,
);

// 6. Subpath exports.
check(
  'subpaths ./sudoku and ./polyomino load',
  typeof sudokuSubpath === 'function' && typeof polyominoSubpath === 'function',
);

console.log(failures === 0 ? 'all checks passed' : `${failures} check(s) failed`);
process.exitCode = failures === 0 ? 0 : 1;
