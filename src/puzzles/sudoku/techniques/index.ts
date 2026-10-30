/**
 * The techniques a rating may use, weakest first.
 *
 * The rater always tries this list from the top and starts over after any
 * progress, so a stronger technique is used only when every weaker one is
 * stuck. The difficulty of a puzzle is therefore the level of the strongest
 * technique it needed (ADR-0003). Levels never decrease down the list.
 *
 * The list only grows at the end, and a new technique always goes into a new
 * level above every existing one (never into an existing level). The order is
 * never changed, not even within a level. A puzzle is rated by the first
 * techniques that work, so appending leaves every rating that finished before
 * the new entries exactly as it was: same steps, same hardest technique, same
 * difficulty. Only puzzles rated `beyond` can move, and only into the new
 * level, so `generate({ seed, difficulty })` returns the same puzzle in every
 * version that has that difficulty (ADR-0003).
 */

import type { CandidateGrid, Step, TechniqueName } from '../candidates.js';
import { claiming, pointing } from './intersections.js';
import { finnedSwordfish, finnedXWing, jellyfish, swordfish, xWing } from './fish.js';
import { emptyRectangle, skyscraper, twoStringKite } from './patterns.js';
import { hiddenSingle, nakedSingle } from './singles.js';
import {
  hiddenPair,
  hiddenQuad,
  hiddenTriple,
  nakedPair,
  nakedQuad,
  nakedTriple,
} from './subsets.js';
import { wWing, wxyzWing, xyWing, xyzWing } from './wings.js';

/** `beyond` means the techniques below could not finish the puzzle. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master' | 'beyond';

/** Ordered from easiest to hardest. */
export const DIFFICULTIES: readonly Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'expert',
  'master',
  'beyond',
];

/**
 * The difficulties `generate` can aim for. `beyond` is left out: it only says
 * that the techniques here got stuck, which covers puzzles from one step past
 * master to far harder, so asking for it would not mean anything definite.
 */
export type TargetDifficulty = Exclude<Difficulty, 'beyond'>;

export const TARGET_DIFFICULTIES: readonly TargetDifficulty[] = [
  'easy',
  'medium',
  'hard',
  'expert',
  'master',
];

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
  // 0.3.0. Within expert: subsets, then fish, then single-digit patterns, then
  // wings, following the pair -> pointing -> triple -> x-wing order above.
  { name: 'naked quad', level: 'expert', find: nakedQuad },
  { name: 'hidden quad', level: 'expert', find: hiddenQuad },
  { name: 'swordfish', level: 'expert', find: swordfish },
  { name: 'skyscraper', level: 'expert', find: skyscraper },
  { name: '2-string kite', level: 'expert', find: twoStringKite },
  { name: 'xy-wing', level: 'expert', find: xyWing },
  { name: 'xyz-wing', level: 'expert', find: xyzWing },
  // Master, the level after expert. Within master, in the same family order as expert: fish, then
  // single-digit patterns, then wings.
  { name: 'jellyfish', level: 'master', find: jellyfish },
  { name: 'finned x-wing', level: 'master', find: finnedXWing },
  { name: 'finned swordfish', level: 'master', find: finnedSwordfish },
  { name: 'empty rectangle', level: 'master', find: emptyRectangle },
  { name: 'w-wing', level: 'master', find: wWing },
  { name: 'wxyz-wing', level: 'master', find: wxyzWing },
];

export { claiming, hiddenPair, hiddenSingle, hiddenTriple, nakedPair, nakedSingle, nakedTriple };
export { pointing, xWing };
export { hiddenQuad, nakedQuad, skyscraper, swordfish, twoStringKite, xyWing, xyzWing };
export { emptyRectangle, finnedSwordfish, finnedXWing, jellyfish, wWing, wxyzWing };
