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
import { english, LOCALES, type Locale, type LocaleName } from './locales.js';
import {
  TARGET_DIFFICULTIES,
  TECHNIQUES,
  type Difficulty,
  type TargetDifficulty,
} from './techniques/index.js';

export interface Rating {
  /** `true` when the techniques filled the whole grid. */
  readonly solved: boolean;
  /** Level of `hardest`; `beyond` when not solved. `easy` for a grid with nothing left to do. */
  readonly difficulty: Difficulty;
  /** The strongest technique used, or `undefined` when no step was needed. */
  readonly hardest: TechniqueName | undefined;
  /** Every step, in the order applied. */
  readonly steps: readonly Step[];
  /** How many steps used each technique; techniques never used are left out. */
  readonly uses: Readonly<Partial<Record<TechniqueName, number>>>;
  /** How many steps used a technique of each level, `0` for unused levels. */
  readonly levels: Readonly<Record<TargetDifficulty, number>>;
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
  const uses: Partial<Record<TechniqueName, number>> = {};
  const levels: Record<TargetDifficulty, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
  for (const { technique } of steps) {
    uses[technique] = (uses[technique] ?? 0) + 1;
    const level = TECHNIQUES.find(({ name }) => name === technique)?.level;
    if (level !== undefined) levels[level] += 1;
  }
  return {
    solved,
    difficulty: solved ? (hardest?.level ?? 'easy') : 'beyond',
    hardest: hardest?.name,
    steps,
    uses,
    levels,
  };
}

const ORDER: readonly Difficulty[] = [...TARGET_DIFFICULTIES, 'beyond'];

/**
 * Order two ratings from easier to harder without weights: by difficulty, then
 * by how many steps needed the hardest level, then by how many steps needed
 * anything above `easy`. Negative when `a` is easier.
 */
export function compareRatings(a: Rating, b: Rating): number {
  const byLevel = ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty);
  if (byLevel !== 0) return byLevel;
  const top = (rating: Rating): number =>
    rating.difficulty === 'beyond' ? 0 : rating.levels[rating.difficulty];
  const aboveEasy = (rating: Rating): number => rating.steps.length - rating.levels.easy;
  return top(a) - top(b) || aboveEasy(a) - aboveEasy(b);
}

/** A locale given by name, or a caller's own. */
export function resolveLocale(locale: LocaleName | Locale = 'en'): Locale {
  return typeof locale === 'string' ? LOCALES[locale] : locale;
}

/** Human-readable lines for a rating: one per step, then a summary. English by default. */
export function explainRating(rating: Rating, locale: Locale = english): string[] {
  const lines = rating.steps.map((step, i) => locale.line(i + 1, locale.reason(step)));
  lines.push(locale.summary(rating));
  return lines;
}
