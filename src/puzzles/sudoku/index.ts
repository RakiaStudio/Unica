/**
 * Sudoku as exact cover.
 *
 * A sudoku of box size `boxRows x boxCols` has `n = boxRows * boxCols` symbols on an
 * `n x n` grid. Placing symbol `v` at `(r, c)` covers four primary columns:
 *
 *   cell(r, c)      every cell holds exactly one symbol
 *   row(r, v)       every row holds every symbol exactly once
 *   column(c, v)    every column holds every symbol exactly once
 *   box(b, v)       every box holds every symbol exactly once
 *
 * That is the whole reduction; there are no secondary columns. The standard
 * 9x9 grid has 324 primary columns and 729 rows.
 */

import {
  ExactCoverError,
  type ExactCoverProblem,
  type ExactCoverRow,
  type Solution,
} from '../../core/exact-cover.js';
import { generate, type GeneratedPuzzle, type GenerateOptions } from '../../core/generate.js';
import { classify, type Classification } from '../../core/classify.js';
import type { Seed } from '../../core/random.js';
import type { ExactCoverSolver } from '../../core/solver.js';
import { geometry } from './candidates.js';
import { explainRating, rateValues, type Rating } from './rate.js';
import type { Difficulty } from './techniques/index.js';

export type { CellValue, Step, TechniqueName } from './candidates.js';
export type { Rating } from './rate.js';
export { DIFFICULTIES, TECHNIQUES, type Difficulty, type Technique } from './techniques/index.js';

export interface SudokuPlacement {
  /** 0-based row. */
  readonly row: number;
  /** 0-based column. */
  readonly col: number;
  /** 1-based symbol, in `1..n`. */
  readonly value: number;
}

export interface SudokuOptions {
  /** Rows per box. Default 3. */
  readonly boxRows?: number;
  /** Columns per box. Default 3. */
  readonly boxCols?: number;
}

export interface SudokuGenerated extends GeneratedPuzzle {
  /** Row-major grid text, `.` for empty cells; symbols above 9 use letters A-Z. */
  readonly text: {
    readonly puzzle: string;
    readonly solution: string;
  };
  readonly clueCount: number;
}

export interface SudokuGenerateOptions extends GenerateOptions {
  /**
   * Keep generating until `rate` gives this difficulty. Attempt 1 uses `seed`;
   * attempt k uses the seed `` `${seed}:${k}` ``. The same seed therefore gives
   * the same puzzle, and the returned `seed` reproduces it directly.
   */
  readonly difficulty: Difficulty;
  /**
   * Give up after this many attempts with an `ExactCoverError`. Default 2000:
   * about 1 in 300 generated 9x9 puzzles rates `hard`, so 2000 attempts find
   * one with probability above 99.9%. The other levels take a few attempts.
   */
  readonly maxAttempts?: number;
}

export interface SudokuRatedPuzzle extends SudokuGenerated {
  /** How many puzzles were generated to find this one. */
  readonly attempts: number;
  /** The rating that matched the requested difficulty. */
  readonly rating: Rating;
}

export interface Sudoku {
  readonly n: number;
  readonly boxRows: number;
  readonly boxCols: number;
  /** The exact cover problem. Built once per `Sudoku` instance and reused. */
  problem(): ExactCoverProblem<SudokuPlacement>;
  /** Row index of a placement. Inverse of `placement`. */
  rowIndex(placement: SudokuPlacement): number;
  /** Placement for a row index. Inverse of `rowIndex`. */
  placement(rowIndex: number): SudokuPlacement;
  /** Parse grid text (`n*n` characters, `.`/`0` empty; whitespace ignored) into clue row indices. */
  parse(text: string): number[];
  /** Format a set of row indices as grid text. Cells not covered are `.`. */
  format(rows: Solution): string;
  /** Format as an `n x n` matrix of symbols, `0` for empty. */
  toGrid(rows: Solution): number[][];
  /** Solve a puzzle given as text; `undefined` when it has no or several solutions. */
  solve(text: string, solver?: ExactCoverSolver): string | undefined;
  /** Count solutions (up to two) of a puzzle given as text. */
  classify(text: string, solver?: ExactCoverSolver): Classification;
  /** Generate a unique (and, by default, minimal) puzzle. */
  generate(options?: GenerateOptions): SudokuGenerated;
  /** Generate a unique, minimal puzzle that rates at the requested difficulty. */
  generate(options: SudokuGenerateOptions): SudokuRatedPuzzle;
  /**
   * Solve with human techniques, weakest first, and report the strongest one
   * needed. Grids of at most 32 symbols. Assumes the puzzle has one solution
   * (check with `classify`); otherwise the result is `beyond`.
   */
  rate(text: string): Rating;
  /** The steps of `rate` as numbered sentences, followed by a one-line summary. */
  explain(text: string): string[];
}

const SYMBOLS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function sudoku(options: SudokuOptions = {}): Sudoku {
  const boxRows = options.boxRows ?? 3;
  const boxCols = options.boxCols ?? 3;
  if (!Number.isInteger(boxRows) || !Number.isInteger(boxCols) || boxRows < 1 || boxCols < 1) {
    throw new ExactCoverError('boxRows and boxCols must be positive integers');
  }
  const n = boxRows * boxCols;
  if (n > SYMBOLS.length) {
    throw new ExactCoverError(
      `grids above ${String(SYMBOLS.length)}x${String(SYMBOLS.length)} have no text notation`,
    );
  }
  const cells = n * n;

  const rowIndex = ({ row, col, value }: SudokuPlacement): number => {
    if (row < 0 || row >= n || col < 0 || col >= n || value < 1 || value > n) {
      throw new ExactCoverError(`placement out of range: ${JSON.stringify({ row, col, value })}`);
    }
    return (row * n + col) * n + (value - 1);
  };

  const placement = (index: number): SudokuPlacement => {
    if (!Number.isInteger(index) || index < 0 || index >= cells * n) {
      throw new ExactCoverError(`row index out of range: ${String(index)}`);
    }
    const value = (index % n) + 1;
    const cell = Math.floor(index / n);
    return { row: Math.floor(cell / n), col: cell % n, value };
  };

  const boxOf = (row: number, col: number): number =>
    Math.floor(row / boxRows) * boxRows + Math.floor(col / boxCols);

  let cached: ExactCoverProblem<SudokuPlacement> | undefined;
  const problem = (): ExactCoverProblem<SudokuPlacement> => {
    if (cached !== undefined) return cached;
    const rows: ExactCoverRow<SudokuPlacement>[] = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        for (let value = 1; value <= n; value++) {
          const v = value - 1;
          rows.push({
            option: { row, col, value },
            primary: [
              row * n + col,
              cells + row * n + v,
              2 * cells + col * n + v,
              3 * cells + boxOf(row, col) * n + v,
            ],
          });
        }
      }
    }
    cached = { primaryColumns: 4 * cells, secondaryColumns: 0, rows };
    return cached;
  };

  const toGrid = (rows: Solution): number[][] => {
    const grid: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
    for (const index of rows) {
      const p = placement(index);
      const line = grid[p.row];
      if (line === undefined) throw new ExactCoverError('unreachable: grid row missing');
      line[p.col] = p.value;
    }
    return grid;
  };

  const format = (rows: Solution): string =>
    toGrid(rows)
      .map((line) =>
        line.map((value) => (value === 0 ? '.' : (SYMBOLS[value - 1] ?? '?'))).join(''),
      )
      .join('\n');

  const parse = (text: string): number[] => {
    // The notation is ASCII-only (digits, letters, `.`), so code-point iteration is exact.
    const chars = Array.from(text.replace(/\s+/g, ''));
    if (chars.length !== cells) {
      throw new ExactCoverError(`expected ${String(cells)} cells, got ${String(chars.length)}`);
    }
    const clues: number[] = [];
    chars.forEach((char, cell) => {
      if (char === '.' || char === '0') return;
      const value = SYMBOLS.indexOf(char.toUpperCase()) + 1;
      if (value < 1 || value > n) {
        throw new ExactCoverError(
          `cell ${String(cell)}: '${char}' is not a symbol in 1..${String(n)}`,
        );
      }
      clues.push(rowIndex({ row: Math.floor(cell / n), col: cell % n, value }));
    });
    return clues;
  };

  const rate = (text: string): Rating => {
    const shape = geometry(boxRows, boxCols);
    return rateValues(shape, toGrid(parse(text)).flat());
  };

  const generateBasic = (options?: GenerateOptions): SudokuGenerated => {
    const generated = generate(problem(), options);
    return {
      ...generated,
      text: { puzzle: format(generated.clues), solution: format(generated.solution) },
      clueCount: generated.clues.length,
    };
  };

  function generateSudoku(options?: GenerateOptions): SudokuGenerated;
  function generateSudoku(options: SudokuGenerateOptions): SudokuRatedPuzzle;
  function generateSudoku(
    options: GenerateOptions | SudokuGenerateOptions = {},
  ): SudokuGenerated | SudokuRatedPuzzle {
    if (!('difficulty' in options)) return generateBasic(options);
    const { difficulty, maxAttempts = 2000, ...rest } = options;
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new ExactCoverError(
        `maxAttempts must be a positive integer, got ${String(maxAttempts)}`,
      );
    }
    // Attempt 1 settles the base seed (fresh when none was given); later
    // attempts derive theirs from it, so the whole search is reproducible.
    let base: Seed | undefined = rest.seed;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const seed: Seed | undefined =
        attempt === 1 || base === undefined ? base : `${String(base)}:${String(attempt)}`;
      const puzzle = generateBasic(seed === undefined ? rest : { ...rest, seed });
      base ??= puzzle.seed;
      const rating = rate(puzzle.text.puzzle);
      if (rating.difficulty === difficulty) return { ...puzzle, attempts: attempt, rating };
    }
    throw new ExactCoverError(
      `no ${difficulty} puzzle in ${String(maxAttempts)} attempts from seed ${String(base)}`,
    );
  }

  return {
    n,
    boxRows,
    boxCols,
    problem,
    rowIndex,
    placement,
    parse,
    format,
    toGrid,
    classify: (text, solver) => classify(problem(), parse(text), solver),
    solve(text, solver) {
      const result = classify(problem(), parse(text), solver);
      return result.count === 'unique' && result.solution !== undefined
        ? format(result.solution)
        : undefined;
    },
    generate: generateSudoku,
    rate,
    explain: (text) => explainRating(rate(text)),
  };
}
