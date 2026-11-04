/**
 * What plain `generate` returned for a seed in the published packages,
 * captured by installing @rakiastudio/unica from npm into an empty directory.
 * The sudoku and polyomino entries came out the same from 0.1.0 and 0.6.2; the
 * N-queens entries are from 0.6.2 (N queens arrived in 0.6.0). The puzzle a seed
 * produces depends on the engine's search order, so these also catch a change
 * in `dancing-links` (ADR-0001).
 */

export interface SudokuFixture {
  readonly boxRows: number;
  readonly boxCols: number;
  readonly seed: string | number;
  readonly puzzle: string;
  readonly clueCount: number;
}

export interface BoardFixture {
  readonly seed: string | number;
  readonly puzzle: string;
  readonly solution: string;
}

export const SUDOKU: readonly SudokuFixture[] = [
  {
    boxRows: 3,
    boxCols: 3,
    seed: 'fixture-1',
    clueCount: 23,
    puzzle: '.34..752......6....8..4..6...5.....49.3...7.1....72....7..8....2.....3...4.2.....',
  },
  {
    boxRows: 3,
    boxCols: 3,
    seed: 42,
    clueCount: 25,
    puzzle: '.3.59...6......1..1..76...4........5...82......2..63.9..8.......1...385..63....47',
  },
  {
    boxRows: 2,
    boxCols: 3,
    seed: 'fixture-6x6',
    clueCount: 10,
    puzzle: '.1.3..3..54......4.....2.51....2....',
  },
];

export const PENTOMINO: readonly (BoardFixture & {
  readonly width: number;
  readonly height: number;
})[] = [
  {
    width: 10,
    height: 6,
    seed: 'fixture-1',
    puzzle: '...ZZTTT.....Z..T.....ZZ..T............................IIIII',
    solution: 'UUUZZTTTFFUYUZPPTFFLYYZZPPTXFLVYWNNPXXXLVYWWNNNXLLVVVWWIIIII',
  },
  {
    width: 20,
    height: 3,
    seed: 7,
    puzzle: '......W..................WW.................WW..............',
    solution: 'VZYYYYWTFNNNIIIIIXUUVZZZYWWTFFFNNLPPXXXUVVVZWWTTTFLLLLPPPXUU',
  },
];

export const QUEENS: readonly (BoardFixture & { readonly n: number })[] = [
  {
    n: 8,
    seed: 'fixture-1',
    puzzle: '...............Q............................Q...................',
    solution: '.Q.............Q.....Q..Q.........Q.........Q.........Q....Q....',
  },
  {
    n: 10,
    seed: 3,
    puzzle:
      '......Q...Q.................................Q........................Q..............................',
    solution:
      '......Q...Q............Q..............Q.....Q............Q...........Q..Q............Q.....Q........',
  },
];
