/**
 * What `sudoku().generate({ seed, difficulty })` returned in the published
 * 0.2.0 package, captured by installing @rakiastudio/unica@0.2.0 from npm into
 * an empty directory. Later versions only append techniques at the end of the
 * list (ADR-0003), so these must keep coming back unchanged.
 */
export interface Fixture020 {
  readonly seed: string;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly attempts: number;
  readonly returnedSeed: string;
  readonly puzzle: string;
  readonly hardest: string;
  readonly steps: number;
  /** SHA-256 of `explain(puzzle).join('\n')`. */
  readonly explainSha256: string;
}

export const GENERATED_020: readonly Fixture020[] = [
  {
    seed: 'v0.2.0-easy-0',
    difficulty: 'easy',
    attempts: 2,
    returnedSeed: 'v0.2.0-easy-0:2',
    puzzle: '4....9.7...5..89.2..3.....6....52........6.2.8.13.....138.9.6..6.....7....4......',
    hardest: 'hidden single',
    steps: 57,
    explainSha256: '20a0ab05e1acfd6692237051e1a0309afe607544f615e22264bc2c6c6847ee7b',
  },
  {
    seed: 'v0.2.0-easy-1',
    difficulty: 'easy',
    attempts: 2,
    returnedSeed: 'v0.2.0-easy-1:2',
    puzzle: '.....4...9.......3..8..71..75.8....9.........8.2.7..61.831..5............2.5.84..',
    hardest: 'hidden single',
    steps: 58,
    explainSha256: '7bc194b7d9277fbcf35e13fbaa88bae45ef32a63ad67fbc9cef3023e9fc46a15',
  },
  {
    seed: 'v0.2.0-easy-2',
    difficulty: 'easy',
    attempts: 3,
    returnedSeed: 'v0.2.0-easy-2:3',
    puzzle: '9.64........3......8..6.2..84..2.961....1.4....9.....72..641...6.....57......8...',
    hardest: 'hidden single',
    steps: 56,
    explainSha256: '648d751008718e6ff7eee0b75809bd520018af9e0b35ad21fc7ba2b06571ee74',
  },
  {
    seed: 'v0.2.0-medium-0',
    difficulty: 'medium',
    attempts: 5,
    returnedSeed: 'v0.2.0-medium-0:5',
    puzzle: '...6.9...1...4...5....27.8..2......7...9..623..95...1.8.....5.124....8.6.....3...',
    hardest: 'naked pair',
    steps: 57,
    explainSha256: 'a9d28c637d279fa1dfbc59080084a3f2d5c774e79e0500505fc1fad8fb43008a',
  },
  {
    seed: 'v0.2.0-medium-1',
    difficulty: 'medium',
    attempts: 2,
    returnedSeed: 'v0.2.0-medium-1:2',
    puzzle: '1....6..5.2..8...95.....7....6.4....21........4....17.36..9.8.....1..92.....7.4..',
    hardest: 'naked pair',
    steps: 58,
    explainSha256: 'd9b1e1b82f2c03fe140d33a7b81d3fca6be757edbfc1929734296e66ab66892d',
  },
  {
    seed: 'v0.2.0-medium-2',
    difficulty: 'medium',
    attempts: 6,
    returnedSeed: 'v0.2.0-medium-2:6',
    puzzle: '1..9.....75...3.....4.7.....41...9.2...2...45..9..6......34..9.......81.9.8..7.3.',
    hardest: 'pointing',
    steps: 57,
    explainSha256: '19612630075722fc55be5e684254866fd3e879327df6d93334ff7939b7165663',
  },
  {
    seed: 'v0.2.0-hard-8',
    difficulty: 'hard',
    attempts: 44,
    returnedSeed: 'v0.2.0-hard-8:44',
    puzzle: '.9...5....25..9.1..17...2....682.9........1.3....4..8.........1.79......8...7.4.2',
    hardest: 'naked triple',
    steps: 63,
    explainSha256: '029a0b6201da53c6fc5b9d9513e50ca3c90d1c75e461b4746bbf90ab649b7a24',
  },
  {
    seed: 'v0.2.0-hard-13',
    difficulty: 'hard',
    attempts: 8,
    returnedSeed: 'v0.2.0-hard-13:8',
    puzzle: '.......6.3...8.7..849.7.......3.12..9.45....6.5...7..........3..289.....5..84....',
    hardest: 'naked triple',
    steps: 65,
    explainSha256: '10a991806056c5840350b0cb067a0046cb10d890db3899eb4e0a53f5127321c9',
  },
  {
    seed: 'v0.2.0-hard-18',
    difficulty: 'hard',
    attempts: 21,
    returnedSeed: 'v0.2.0-hard-18:21',
    puzzle: '.7......5..21..9..1..4.3..6..........3..58.1....39....3..6....7.2........5...248.',
    hardest: 'naked triple',
    steps: 66,
    explainSha256: '458563273986133627a422a795b704c46845cb0639d03ab8dcc05c6cacad98b6',
  },
];

/**
 * A puzzle that 0.2.0 rated `beyond` (stuck after 40 steps, the last a hidden
 * single), from `sudoku().generate({ seed: 'h-8' })`. 0.3.0 finishes it with an
 * xy-wing and rates it `expert`: a stored `beyond` can become `expert`.
 */
export const BEYOND_IN_020 = {
  seed: 'h-8',
  puzzle: '8..4..........3762....7......4..2......3962....2....91.4..81...2.1..4..86..2..9..',
  steps: 40,
};
