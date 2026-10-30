/**
 * Rating: solve a puzzle the way a person would, and report how hard that was.
 *
 * The loop tries the techniques weakest first, applies the first step found,
 * and starts over from the weakest. It stops when the grid is full or no
 * technique applies. Every step is sound (implied by the candidates alone), so
 * a full grid is the solution, and the rating is the level of the strongest
 * technique used (ADR-0003).
 */

import {
  applyStep,
  at,
  fromValues,
  isConsistent,
  isSolved,
  type Geometry,
  type Step,
  type TechniqueName,
} from './candidates.js';
import { TECHNIQUES, type Difficulty } from './techniques/index.js';

export interface Rating {
  /** `true` when the techniques filled the whole grid. */
  readonly solved: boolean;
  /** Level of `hardest`; `beyond` when not solved. `easy` for a grid with nothing left to do. */
  readonly difficulty: Difficulty;
  /** The strongest technique used, or `undefined` when no step was needed. */
  readonly hardest: TechniqueName | undefined;
  /** Every step, in the order applied. */
  readonly steps: readonly Step[];
}

/** Rate a grid given as symbols, `0` for empty cells. */
export function rateValues(shape: Geometry, values: readonly number[]): Rating {
  let grid = fromValues(shape, values);
  const steps: Step[] = [];
  let hardestIndex = -1;

  while (!isSolved(grid) && isConsistent(grid)) {
    let progressed = false;
    for (let index = 0; index < TECHNIQUES.length; index++) {
      const step = at(TECHNIQUES, index).find(grid);
      if (step === undefined) continue;
      grid = applyStep(grid, step);
      steps.push(step);
      hardestIndex = Math.max(hardestIndex, index);
      progressed = true;
      break;
    }
    if (!progressed) break;
  }

  const solved = isSolved(grid) && isConsistent(grid);
  const hardest = hardestIndex < 0 ? undefined : at(TECHNIQUES, hardestIndex);
  return {
    solved,
    difficulty: solved ? (hardest?.level ?? 'easy') : 'beyond',
    hardest: hardest?.name,
    steps,
  };
}

/** Human-readable lines for a rating: one per step, then a summary. */
export function explainRating(rating: Rating): string[] {
  const lines = rating.steps.map((step, i) => `${String(i + 1)}. ${step.reason}`);
  if (rating.solved) {
    lines.push(
      rating.hardest === undefined
        ? 'Solved: nothing to do (easy).'
        : `Solved: ${rating.difficulty}, hardest technique ${rating.hardest}.`,
    );
  } else {
    lines.push(
      'Stuck: none of the rated techniques applies here (beyond). The puzzle may still have one solution; it needs techniques stronger than xyz-wing.',
    );
  }
  return lines;
}
