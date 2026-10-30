/**
 * The techniques a rating may use, weakest first.
 *
 * The rater always tries this list from the top and starts over after any
 * progress, so a stronger technique is used only when every weaker one is
 * stuck. The difficulty of a puzzle is therefore the level of the strongest
 * technique it needed (ADR-0003). Levels never decrease down the list.
 */

import type { CandidateGrid, Step, TechniqueName } from '../candidates.js';
import { claiming, pointing } from './intersections.js';
import { xWing } from './fish.js';
import { hiddenSingle, nakedSingle } from './singles.js';
import { hiddenPair, hiddenTriple, nakedPair, nakedTriple } from './subsets.js';

/** `beyond` means the techniques below could not finish the puzzle. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'beyond';

/** Ordered from easiest to hardest. */
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'beyond'];

/**
 * The difficulties `generate` can aim for. `beyond` is left out: it only says
 * that the techniques here got stuck, which covers puzzles from one step past
 * medium to far harder, so asking for it would not mean anything definite.
 */
export type TargetDifficulty = Exclude<Difficulty, 'beyond'>;

export const TARGET_DIFFICULTIES: readonly TargetDifficulty[] = ['easy', 'medium', 'hard'];

export interface Technique {
  readonly name: TechniqueName;
  readonly level: TargetDifficulty;
  readonly find: (grid: CandidateGrid) => Step | undefined;
}

export const TECHNIQUES: readonly Technique[] = [
  { name: 'naked single', level: 'easy', find: nakedSingle },
  { name: 'hidden single', level: 'easy', find: hiddenSingle },
  { name: 'naked pair', level: 'medium', find: nakedPair },
  { name: 'hidden pair', level: 'medium', find: hiddenPair },
  { name: 'pointing', level: 'medium', find: pointing },
  { name: 'claiming', level: 'medium', find: claiming },
  { name: 'naked triple', level: 'hard', find: nakedTriple },
  { name: 'hidden triple', level: 'hard', find: hiddenTriple },
  { name: 'x-wing', level: 'hard', find: xWing },
];

export { claiming, hiddenPair, hiddenSingle, hiddenTriple, nakedPair, nakedSingle, nakedTriple };
export { pointing, xWing };
