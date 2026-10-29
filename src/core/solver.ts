import { DancingLinks } from 'dancing-links';
import type { ExactCoverProblem, Solution } from './exact-cover.js';

/**
 * The one capability unica needs from an exact cover engine: enumerate up to
 * `limit` solutions. Uniqueness checking is "solve with limit 2", so an engine
 * that can stop early is all the generator requires.
 *
 * The interface exists so the engine is a choice, not a commitment. The default
 * is `dancing-links` (see docs/adr/0001-dancing-links.md); a WebAssembly or
 * worker-backed engine can be dropped in without touching the generator.
 */
export interface ExactCoverSolver {
  /**
   * @param limit Maximum number of solutions to return. Must be a positive integer.
   * @returns Up to `limit` solutions, each sorted ascending by row index.
   */
  solve<T>(problem: ExactCoverProblem<T>, limit: number): Solution[];
}

/**
 * Adapter over `dancing-links` (Knuth's Algorithm X with the dancing links
 * technique). The library is given each row's index as its payload, so results
 * come back as row indices with no extra bookkeeping.
 */
export class DancingLinksSolver implements ExactCoverSolver {
  solve<T>(problem: ExactCoverProblem<T>, limit: number): Solution[] {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError(`limit must be a positive integer, got ${String(limit)}`);
    }
    if (problem.primaryColumns === 0) {
      // The empty selection covers zero primary columns exactly once each.
      return [[]];
    }
    if (problem.rows.length === 0) {
      // Primary columns exist but nothing can cover them.
      return [];
    }

    const dlx = new DancingLinks<number>();
    const results =
      problem.secondaryColumns === 0
        ? solveSimple(dlx, problem, limit)
        : solveComplex(dlx, problem, limit);

    return results.map((solution) => {
      const rows = solution.map((result) => result.data);
      rows.sort((a, b) => a - b);
      return rows;
    });
  }
}

function solveSimple<T>(
  dlx: DancingLinks<number>,
  problem: ExactCoverProblem<T>,
  limit: number,
): { data: number }[][] {
  const solver = dlx.createSolver({ columns: problem.primaryColumns });
  solver.addSparseConstraints(
    problem.rows.map((row, index) => ({ data: index, columnIndices: [...row.primary] })),
  );
  return solver.find(limit);
}

function solveComplex<T>(
  dlx: DancingLinks<number>,
  problem: ExactCoverProblem<T>,
  limit: number,
): { data: number }[][] {
  const solver = dlx.createSolver({
    primaryColumns: problem.primaryColumns,
    secondaryColumns: problem.secondaryColumns,
  });
  solver.addSparseConstraints(
    problem.rows.map((row, index) => ({
      data: index,
      columnIndices: { primary: [...row.primary], secondary: [...(row.secondary ?? [])] },
    })),
  );
  return solver.find(limit);
}

let defaultSolver: ExactCoverSolver | undefined;

/** The engine used when a caller does not pass one. Constructed lazily, once. */
export function getDefaultSolver(): ExactCoverSolver {
  defaultSolver ??= new DancingLinksSolver();
  return defaultSolver;
}
