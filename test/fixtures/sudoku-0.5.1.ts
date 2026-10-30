/**
 * What `sudoku().generate({ seed, difficulty: 'expert' })` returned in the
 * published 0.5.1 package, captured by installing @rakiastudio/unica@0.5.1
 * from npm into an empty directory. The master level is appended after
 * expert (ADR-0003), so these must keep coming back unchanged.
 */
export interface Fixture051 {
  readonly seed: string;
  readonly difficulty: 'expert';
  readonly attempts: number;
  readonly returnedSeed: string;
  readonly puzzle: string;
  readonly hardest: string;
  readonly steps: number;
  /** SHA-256 of `explain(puzzle).join('\n')`. */
  readonly explainSha256: string;
}

export const GENERATED_051: readonly Fixture051[] = [
  {
    seed: 'v0.5.1-expert-0',
    difficulty: 'expert',
    attempts: 13,
    returnedSeed: 'v0.5.1-expert-0:13',
    puzzle: '..........1...2.45...5..31...6.9...835...69...4..23.7..6....1..9.......4..5..7..3',
    hardest: '2-string kite',
    steps: 60,
    explainSha256: 'ba6f0ceed14eee2a03030956406ee44193dcd4a30624ee29d924dd958294670c',
  },
  {
    seed: 'v0.5.1-expert-1',
    difficulty: 'expert',
    attempts: 39,
    returnedSeed: 'v0.5.1-expert-1:39',
    puzzle: '3...85...9.26.......5.....61.4.28......1..4....6....8....2..6......39..1.3..7.5..',
    hardest: 'skyscraper',
    steps: 63,
    explainSha256: '7da0053503389ac4679a37c70ad4ed843e3b44aae3b2c64f78e81b08512a6f80',
  },
  {
    seed: 'v0.5.1-expert-2',
    difficulty: 'expert',
    attempts: 2,
    returnedSeed: 'v0.5.1-expert-2:2',
    puzzle: '.4....9..15.8...4...9.5..8...19.64...7......2.....5..7......568.3..9....8..4...3.',
    hardest: 'xy-wing',
    steps: 66,
    explainSha256: '5c5ce28641a3db8c3221e94272c582f10a0745634ec63a4002c011919d6ec48d',
  },
];

/** A puzzle 0.5.1 rated `beyond` after 21 steps (`generate({ seed: 'm-1' })`). */
export const BEYOND_IN_051 = {
  seed: 'm-1',
  puzzle: '54....36.61..5.........3..9.9.86.....7.......8...1..24.2.....5....5..2..9.4.7.6..',
  steps: 21,
};
