import { classify } from './classify.js';
import { ExactCoverError, type ExactCoverProblem, type Solution } from './exact-cover.js';
import { createRng, permutation, type Rng, type Seed } from './random.js';
import { getDefaultSolver, type ExactCoverSolver } from './solver.js';

export interface GenerateOptions {
  /**
   * Seed for the generator. The same seed with the same problem always yields the
   * same puzzle. Defaults to a fresh seed derived from the clock; the seed used is
   * always reported in the result.
   */
  readonly seed?: Seed;
  /** Exact cover engine. Defaults to `dancing-links`. */
  readonly solver?: ExactCoverSolver;
  /**
   * Stop removing clues once this many remain. The result is still unique but no
   * longer guaranteed minimal. Omit for a minimal puzzle.
   */
  readonly stopAtClues?: number;
  /**
   * A complete solution to start from. When omitted, a random solution is found by
   * solving the problem under a random row order.
   */
  readonly solution?: Solution;
}

export interface GeneratedPuzzle {
  /** The seed that produced this puzzle. Pass it back to reproduce it. */
  readonly seed: Seed;
  /** Row indices fixed as clues. Sorted ascending. */
  readonly clues: Solution;
  /** The unique solution; always a superset of `clues`. Sorted ascending. */
  readonly solution: Solution;
  /** Rows of `solution` that were removed, in removal order. Sorted by removal, not index. */
  readonly removed: readonly number[];
  /** `true` when every remaining clue is necessary. False only when `stopAtClues` cut the reduction short. */
  readonly minimal: boolean;
}

/**
 * Generate a puzzle with exactly one solution.
 *
 * 1. Obtain a complete solution (randomised through the row order).
 * 2. Start with every solution row as a clue, so the puzzle is trivially unique.
 * 3. Visit the clues in random order. Remove each one if the puzzle stays unique;
 *    otherwise put it back.
 *
 * One pass is enough for minimality. Uniqueness is monotone in the clue set:
 * fewer clues can only admit more solutions, never fewer. So a clue whose removal
 * broke uniqueness at some point would still break it against any later, smaller
 * clue set, and there is no need to revisit it.
 */
export function generate<T>(
  problem: ExactCoverProblem<T>,
  options: GenerateOptions = {},
): GeneratedPuzzle {
  const seed = options.seed ?? freshSeed();
  const rng = createRng(seed);
  const solver = options.solver ?? getDefaultSolver();

  const solution =
    options.solution === undefined
      ? randomSolution(problem, rng, solver)
      : checkedSolution(problem, options.solution, solver);
  const clues = new Set<number>(solution);
  const removed: number[] = [];
  const stopAt = options.stopAtClues ?? 0;

  let minimal = true;
  for (const position of permutation(solution.length, rng)) {
    if (clues.size <= stopAt) {
      minimal = false;
      break;
    }
    const candidate = solution[position];
    if (candidate === undefined) continue;
    clues.delete(candidate);
    if (classify(problem, clues, solver).count === 'unique') {
      removed.push(candidate);
    } else {
      clues.add(candidate);
    }
  }

  return {
    seed,
    clues: [...clues].sort((a, b) => a - b),
    solution: [...solution].sort((a, b) => a - b),
    removed,
    minimal,
  };
}

/**
 * A random solution of a problem. Dancing links explores rows in insertion order
 * within each column, so shuffling the rows before solving randomises which
 * solution is found first. This is not a uniform sample over all solutions, but
 * it is cheap and, for puzzle generation, varied enough.
 */
export function randomSolution<T>(
  problem: ExactCoverProblem<T>,
  rng: Rng,
  solver: ExactCoverSolver = getDefaultSolver(),
): Solution {
  const order = permutation(problem.rows.length, rng);
  const shuffled: ExactCoverProblem<T> = {
    primaryColumns: problem.primaryColumns,
    secondaryColumns: problem.secondaryColumns,
    rows: order.map((originalIndex) => {
      const row = problem.rows[originalIndex];
      if (row === undefined) throw new ExactCoverError(`row ${String(originalIndex)} missing`);
      return row;
    }),
  };
  const found = solver.solve(shuffled, 1)[0];
  if (found === undefined) {
    throw new ExactCoverError('the problem has no solution, so no puzzle can be generated from it');
  }
  const original = found.map((shuffledIndex) => {
    const index = order[shuffledIndex];
    if (index === undefined)
      throw new ExactCoverError(`shuffled row ${String(shuffledIndex)} missing`);
    return index;
  });
  original.sort((a, b) => a - b);
  return original;
}

/**
 * A caller-supplied solution is trusted only after it is checked. With every
 * row of a genuine exact cover fixed as a clue, the restricted problem has that
 * one solution and nothing else; anything less than that means the rows do not
 * cover the problem, and generating from them would report `minimal: true` for a
 * puzzle that was never unique.
 */
function checkedSolution<T>(
  problem: ExactCoverProblem<T>,
  candidate: Solution,
  solver: ExactCoverSolver,
): Solution {
  const sorted = [...new Set(candidate)].sort((a, b) => a - b);
  const result = classify(problem, sorted, solver);
  const notACover = new ExactCoverError('options.solution is not an exact cover of the problem');
  if (result.count !== 'unique' || result.solution === undefined) {
    throw notACover;
  }
  const found = result.solution;
  if (found.length !== sorted.length || !found.every((row, index) => row === sorted[index])) {
    throw notACover;
  }
  return sorted;
}

function freshSeed(): Seed {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}
