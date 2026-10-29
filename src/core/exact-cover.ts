/**
 * Exact cover: the single abstraction every puzzle in unica is reduced to.
 *
 * An exact cover problem is a set of columns and a set of rows. Each row covers
 * some columns. A solution is a subset of rows such that every *primary* column
 * is covered exactly once and every *secondary* column is covered at most once.
 *
 * A puzzle is an exact cover problem plus a set of *clues*: rows that are fixed
 * in advance. A puzzle is *unique* when exactly one solution contains all of its
 * clues, and *minimal* when removing any single clue breaks uniqueness.
 */

/** A row of the exact cover matrix: one candidate choice (e.g. "put 5 at r3c7"). */
export interface ExactCoverRow<TOption> {
  /** The domain-level object this row represents. Opaque to the core. */
  readonly option: TOption;
  /** Primary columns this row covers. Must be non-empty for a row to be usable as a clue. */
  readonly primary: readonly number[];
  /** Secondary (at-most-once) columns this row covers. */
  readonly secondary?: readonly number[];
}

export interface ExactCoverProblem<TOption> {
  readonly primaryColumns: number;
  readonly secondaryColumns: number;
  readonly rows: readonly ExactCoverRow<TOption>[];
}

/**
 * A solution: indices into `problem.rows`, in ascending order.
 * Sorted so that two solutions can be compared structurally.
 */
export type Solution = readonly number[];

export class ExactCoverError extends Error {
  override readonly name = 'ExactCoverError';
}

/**
 * Validate a problem's structural invariants once, at the boundary.
 * The solver assumes these hold and does no checking in its hot path.
 */
export function validateProblem<T>(problem: ExactCoverProblem<T>): void {
  const { primaryColumns, secondaryColumns, rows } = problem;
  if (!Number.isInteger(primaryColumns) || primaryColumns < 0) {
    throw new ExactCoverError(
      `primaryColumns must be a non-negative integer, got ${String(primaryColumns)}`,
    );
  }
  if (!Number.isInteger(secondaryColumns) || secondaryColumns < 0) {
    throw new ExactCoverError(
      `secondaryColumns must be a non-negative integer, got ${String(secondaryColumns)}`,
    );
  }
  rows.forEach((row, index) => {
    checkColumns(row.primary, primaryColumns, index, 'primary');
    if (row.secondary !== undefined) {
      checkColumns(row.secondary, secondaryColumns, index, 'secondary');
    }
  });
}

function checkColumns(
  columns: readonly number[],
  bound: number,
  rowIndex: number,
  kind: 'primary' | 'secondary',
): void {
  const seen = new Set<number>();
  for (const column of columns) {
    if (!Number.isInteger(column) || column < 0 || column >= bound) {
      throw new ExactCoverError(
        `row ${String(rowIndex)}: ${kind} column ${String(column)} is out of range [0, ${String(bound)})`,
      );
    }
    if (seen.has(column)) {
      throw new ExactCoverError(
        `row ${String(rowIndex)}: ${kind} column ${String(column)} listed twice`,
      );
    }
    seen.add(column);
  }
}

/** Map a solution (row indices) back to the domain-level options. */
export function solutionOptions<T>(problem: ExactCoverProblem<T>, solution: Solution): T[] {
  return solution.map((rowIndex) => rowAt(problem, rowIndex).option);
}

/** Bounds-checked row access; the index type alone cannot guarantee validity. */
export function rowAt<T>(problem: ExactCoverProblem<T>, rowIndex: number): ExactCoverRow<T> {
  const row = problem.rows[rowIndex];
  if (row === undefined) {
    throw new ExactCoverError(
      `row index ${String(rowIndex)} is out of range (${String(problem.rows.length)} rows)`,
    );
  }
  return row;
}

/**
 * The restriction of a problem to a set of clues.
 *
 * Rows kept: the clue rows themselves, plus every row that shares no column with
 * any clue row. Because every other row covering a clue's primary columns has
 * been removed, each clue row is the *only* row that can cover those columns,
 * so every solution of the restricted problem necessarily contains every clue.
 * This is how clues are encoded without adding columns or special-casing the
 * solver: a clue is a forced row, and a forced row is one with no competitors.
 *
 * `rowMap[i]` gives the original row index of restricted row `i`, so solutions
 * of the restricted problem can be translated back with `liftSolution`.
 */
export interface RestrictedProblem<TOption> {
  readonly problem: ExactCoverProblem<TOption>;
  readonly rowMap: readonly number[];
}

export function restrictToClues<T>(
  problem: ExactCoverProblem<T>,
  clues: Iterable<number>,
): RestrictedProblem<T> {
  const clueSet = new Set<number>();
  const coveredPrimary = new Uint8Array(problem.primaryColumns);
  const coveredSecondary = new Uint8Array(problem.secondaryColumns);

  for (const clue of clues) {
    if (clueSet.has(clue)) continue;
    const row = rowAt(problem, clue);
    if (row.primary.length === 0) {
      throw new ExactCoverError(
        `row ${String(clue)} covers no primary column and cannot be a clue`,
      );
    }
    for (const column of row.primary) {
      if (coveredPrimary[column] === 1) {
        throw new ExactCoverError(
          `clues conflict: primary column ${String(column)} is covered by two clues`,
        );
      }
      coveredPrimary[column] = 1;
    }
    for (const column of row.secondary ?? []) {
      if (coveredSecondary[column] === 1) {
        throw new ExactCoverError(
          `clues conflict: secondary column ${String(column)} is covered by two clues`,
        );
      }
      coveredSecondary[column] = 1;
    }
    clueSet.add(clue);
  }

  const rows: ExactCoverRow<T>[] = [];
  const rowMap: number[] = [];
  problem.rows.forEach((row, index) => {
    if (clueSet.has(index) || !conflicts(row, coveredPrimary, coveredSecondary)) {
      rows.push(row);
      rowMap.push(index);
    }
  });

  return {
    problem: {
      primaryColumns: problem.primaryColumns,
      secondaryColumns: problem.secondaryColumns,
      rows,
    },
    rowMap,
  };
}

function conflicts<T>(row: ExactCoverRow<T>, primary: Uint8Array, secondary: Uint8Array): boolean {
  for (const column of row.primary) {
    if (primary[column] === 1) return true;
  }
  if (row.secondary !== undefined) {
    for (const column of row.secondary) {
      if (secondary[column] === 1) return true;
    }
  }
  return false;
}

/** Translate a solution of a restricted problem back to original row indices. */
export function liftSolution(restricted: RestrictedProblem<unknown>, solution: Solution): Solution {
  const lifted = solution.map((rowIndex) => {
    const original = restricted.rowMap[rowIndex];
    if (original === undefined) {
      throw new ExactCoverError(`restricted row ${String(rowIndex)} has no original`);
    }
    return original;
  });
  lifted.sort((a, b) => a - b);
  return lifted;
}
