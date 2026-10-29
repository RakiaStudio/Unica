import {
  liftSolution,
  restrictToClues,
  type ExactCoverProblem,
  type Solution,
} from './exact-cover.js';
import { getDefaultSolver, type ExactCoverSolver } from './solver.js';

/** How many solutions a (problem, clues) pair has, as far as the generator cares. */
export type SolutionCount = 'none' | 'unique' | 'multiple';

export interface Classification {
  readonly count: SolutionCount;
  /** The solution when `count` is `'unique'`; one of the solutions when `'multiple'`. */
  readonly solution: Solution | undefined;
}

/**
 * Classify the number of solutions that contain the given clues.
 *
 * Asks the engine for at most two solutions: one is enough to know the puzzle
 * is solvable, two are enough to know it is not unique. This bound is what
 * makes uniqueness checking cheap enough to run dozens of times per puzzle
 * during generation.
 */
export function classify<T>(
  problem: ExactCoverProblem<T>,
  clues: Iterable<number>,
  solver: ExactCoverSolver = getDefaultSolver(),
): Classification {
  const restricted = restrictToClues(problem, clues);
  const found = solver.solve(restricted.problem, 2);
  const first = found[0];
  if (first === undefined) {
    return { count: 'none', solution: undefined };
  }
  return {
    count: found.length === 1 ? 'unique' : 'multiple',
    solution: liftSolution(restricted, first),
  };
}

/** `true` when exactly one solution contains the clues. */
export function isUnique<T>(
  problem: ExactCoverProblem<T>,
  clues: Iterable<number>,
  solver?: ExactCoverSolver,
): boolean {
  return classify(problem, clues, solver).count === 'unique';
}

/**
 * `true` when the puzzle is unique *and* removing any single clue makes it
 * non-unique. Minimality is what separates "a puzzle with a solution" from
 * "a puzzle with no redundant information".
 */
export function isMinimal<T>(
  problem: ExactCoverProblem<T>,
  clues: Iterable<number>,
  solver: ExactCoverSolver = getDefaultSolver(),
): boolean {
  const clueList = [...new Set(clues)];
  if (!isUnique(problem, clueList, solver)) return false;
  return clueList.every((clue) => {
    const without = clueList.filter((other) => other !== clue);
    return classify(problem, without, solver).count !== 'unique';
  });
}

/** Solve a puzzle: the unique solution, or `undefined` when it has none or several. */
export function solveUnique<T>(
  problem: ExactCoverProblem<T>,
  clues: Iterable<number>,
  solver?: ExactCoverSolver,
): Solution | undefined {
  const result = classify(problem, clues, solver);
  return result.count === 'unique' ? result.solution : undefined;
}
