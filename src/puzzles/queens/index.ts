/**
 * N queens as exact cover.
 *
 * An `n x n` board, `n` queens, no two attacking each other. A *placement* is a
 * queen on one square, and it covers:
 *
 *   row(r)            every row holds exactly one queen         (primary)
 *   column(c)         every column holds exactly one queen      (primary)
 *   diagonal(r + c)   no diagonal holds two queens              (secondary)
 *   anti(r - c)       no anti-diagonal holds two queens         (secondary)
 *
 * The diagonals are secondary because most of them hold no queen at all in a
 * solution; exact cover's at-most-once columns say exactly that.
 *
 * A puzzle places some queens as clues; the player places the rest. With
 * `generate`, the clues are chosen so that the completion is unique.
 */

import {
  ExactCoverError,
  type ExactCoverProblem,
  type ExactCoverRow,
  type Solution,
} from '../../core/exact-cover.js';
import { solveUnique } from '../../core/classify.js';
import { generate, type GeneratedPuzzle, type GenerateOptions } from '../../core/generate.js';

/** A queen on row `row`, column `col`, both 0-based. */
export interface QueenPlacement {
  readonly row: number;
  readonly col: number;
}

export interface QueensOptions {
  /** Board size and number of queens. Default 8. */
  readonly n?: number;
}

export interface QueensGenerated extends GeneratedPuzzle {
  readonly text: {
    readonly puzzle: string;
    readonly solution: string;
  };
}

export interface Queens {
  readonly n: number;
  problem(): ExactCoverProblem<QueenPlacement>;
  /** Board text: `n` lines of `n` characters, `Q` for a queen, `.` for an empty square. */
  format(rows: Solution): string;
  /** Row indices of the queens in board text. Whitespace between lines is ignored. */
  parse(text: string): number[];
  generate(options?: GenerateOptions): QueensGenerated;
  /** The only completion of the queens in `text`, as board text, or `undefined` if none or several. */
  solve(text: string): string | undefined;
}

/** The largest board accepted; generation slows down well before this. */
export const MAX_QUEENS = 32;

export function queens(options: QueensOptions = {}): Queens {
  const n = options.n ?? 8;
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUEENS) {
    throw new ExactCoverError(
      `n must be an integer from 1 to ${String(MAX_QUEENS)}, got ${String(n)}`,
    );
  }
  const diagonals = 2 * n - 1;

  let cachedProblem: ExactCoverProblem<QueenPlacement> | undefined;
  const problem = (): ExactCoverProblem<QueenPlacement> => {
    if (cachedProblem !== undefined) return cachedProblem;
    const rows: ExactCoverRow<QueenPlacement>[] = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        rows.push({
          option: { row, col },
          primary: [row, n + col],
          secondary: [row + col, diagonals + row - col + n - 1],
        });
      }
    }
    cachedProblem = { primaryColumns: 2 * n, secondaryColumns: 2 * diagonals, rows };
    return cachedProblem;
  };

  const format = (rowIndices: Solution): string => {
    const grid: string[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => '.'));
    for (const index of rowIndices) {
      if (!Number.isInteger(index) || index < 0 || index >= n * n) {
        throw new ExactCoverError(`row index out of range: ${String(index)}`);
      }
      const line = grid[Math.floor(index / n)];
      if (line !== undefined) line[index % n] = 'Q';
    }
    return grid.map((line) => line.join('')).join('\n');
  };

  const parse = (text: string): number[] => {
    const chars = Array.from(text.replace(/\s+/g, ''));
    if (chars.length !== n * n) {
      throw new ExactCoverError(`expected ${String(n * n)} squares, got ${String(chars.length)}`);
    }
    const placed: number[] = [];
    chars.forEach((ch, index) => {
      if (ch === 'Q' || ch === 'q') placed.push(index);
      else if (ch !== '.') {
        throw new ExactCoverError(`square ${String(index)}: '${ch}' is neither 'Q' nor '.'`);
      }
    });
    return placed;
  };

  return {
    n,
    problem,
    format,
    parse,
    generate(generateOptions) {
      const generated = generate(problem(), generateOptions);
      return {
        ...generated,
        text: { puzzle: format(generated.clues), solution: format(generated.solution) },
      };
    },
    solve(text) {
      const solution = solveUnique(problem(), parse(text));
      return solution === undefined ? undefined : format(solution);
    },
  };
}
