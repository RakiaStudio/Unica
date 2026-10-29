import { bench, describe } from 'vitest';
import {
  DancingLinksSolver,
  PENTOMINOES,
  classify,
  polyominoTiling,
  sudoku,
} from '../src/index.js';

const s9 = sudoku();
const s16 = sudoku({ boxRows: 4, boxCols: 4 });
const p6x10 = polyominoTiling({ width: 10, height: 6, pieces: PENTOMINOES });
const solver = new DancingLinksSolver();
let counter = 0;

describe('sudoku', () => {
  bench('generate 9x9 (minimal)', () => {
    s9.generate({ seed: counter++ });
  });

  bench('classify 9x9 empty grid (limit 2)', () => {
    classify(s9.problem(), []);
  });

  bench(
    'generate 16x16 (minimal)',
    () => {
      s16.generate({ seed: counter++ });
    },
    { iterations: 3, time: 0 },
  );
});

describe('pentominoes', () => {
  bench('one 6x10 tiling', () => {
    solver.solve(p6x10.problem(), 1);
  });

  bench(
    'generate 6x10 puzzle (minimal)',
    () => {
      p6x10.generate({ seed: counter++ });
    },
    { iterations: 5, time: 0 },
  );
});
