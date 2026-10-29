import type { ExactCoverProblem } from '../../src/index.js';

/**
 * The worked example from Knuth, "Dancing Links" (2000), section 1.
 * Seven columns (here 0..6 for the paper's 1..7), six rows A..F.
 * The unique exact cover is {B, D, F}.
 */
export const knuthExample: ExactCoverProblem<string> = {
  primaryColumns: 7,
  secondaryColumns: 0,
  rows: [
    { option: 'A', primary: [0, 3, 6] },
    { option: 'B', primary: [0, 3] },
    { option: 'C', primary: [3, 4, 6] },
    { option: 'D', primary: [2, 4, 5] },
    { option: 'E', primary: [1, 2, 5, 6] },
    { option: 'F', primary: [1, 6] },
  ],
};

export const knuthSolution = [1, 3, 5] as const;
