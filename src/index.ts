/**
 * @rakiastudio/unica
 *
 * Unique-solution puzzle generation on top of exact cover.
 *
 * - `core`: the exact cover model, the engine adapter, uniqueness classification
 *   and the clue-reduction generator. Puzzle-agnostic.
 * - `puzzles/*`: reductions of concrete puzzles (sudoku, polyomino tiling) to
 *   exact cover, plus parsing and formatting for their natural notations.
 */

export type {
  ExactCoverProblem,
  ExactCoverRow,
  RestrictedProblem,
  Solution,
} from './core/exact-cover.js';
export {
  ExactCoverError,
  liftSolution,
  restrictToClues,
  rowAt,
  solutionOptions,
  validateProblem,
} from './core/exact-cover.js';

export type { ExactCoverSolver } from './core/solver.js';
export { DancingLinksSolver, getDefaultSolver } from './core/solver.js';

export type { Classification, SolutionCount } from './core/classify.js';
export { classify, isMinimal, isUnique, solveUnique } from './core/classify.js';

export type { GeneratedPuzzle, GenerateOptions } from './core/generate.js';
export { generate, randomSolution } from './core/generate.js';

export type { Rng, Seed } from './core/random.js';
export { createRng, permutation } from './core/random.js';

export * from './puzzles/sudoku/index.js';
export * from './puzzles/polyomino/index.js';
export * from './puzzles/queens/index.js';
