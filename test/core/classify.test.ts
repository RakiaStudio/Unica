import { describe, expect, it } from 'vitest';
import {
  classify,
  isMinimal,
  isUnique,
  solveUnique,
  type ExactCoverProblem,
  type ExactCoverSolver,
} from '../../src/index.js';
import { knuthExample, knuthSolution } from '../fixtures/knuth.js';

/** 2 x 2 = 4 solutions: pick one of two rows for each of two columns. */
const fourSolutions: ExactCoverProblem<string> = {
  primaryColumns: 2,
  secondaryColumns: 0,
  rows: [
    { option: 'a0', primary: [0] },
    { option: 'a1', primary: [0] },
    { option: 'b0', primary: [1] },
    { option: 'b1', primary: [1] },
  ],
};

describe('classify', () => {
  it("reports Knuth's example as unique with no clues at all", () => {
    expect(classify(knuthExample, [])).toEqual({ count: 'unique', solution: [...knuthSolution] });
  });

  it('reports multiple when several solutions contain the clues', () => {
    const result = classify(fourSolutions, []);
    expect(result.count).toBe('multiple');
    expect(result.solution).toHaveLength(2);
  });

  it('becomes unique once enough clues are fixed', () => {
    expect(classify(fourSolutions, [0]).count).toBe('multiple');
    expect(classify(fourSolutions, [0, 2])).toEqual({ count: 'unique', solution: [0, 2] });
  });

  it('reports none when the clues make the problem unsolvable', () => {
    // Fixing A in Knuth's example removes every other row touching columns 0, 3, 6,
    // and what remains cannot cover column 4.
    expect(classify(knuthExample, [0])).toEqual({ count: 'none', solution: undefined });
  });

  it('passes the chosen engine through', () => {
    let calls = 0;
    const spy: ExactCoverSolver = {
      solve: (problem, limit) => {
        calls++;
        expect(limit).toBe(2);
        return problem.rows.length > 0 ? [[0]] : [];
      },
    };
    classify(knuthExample, [1], spy);
    expect(calls).toBe(1);
  });
});

describe('isUnique / solveUnique / isMinimal', () => {
  it('isUnique mirrors classify', () => {
    expect(isUnique(fourSolutions, [])).toBe(false);
    expect(isUnique(fourSolutions, [0, 2])).toBe(true);
  });

  it('solveUnique returns the solution only when unique', () => {
    expect(solveUnique(fourSolutions, [])).toBeUndefined();
    expect(solveUnique(fourSolutions, [1, 3])).toEqual([1, 3]);
    expect(solveUnique(knuthExample, [0])).toBeUndefined();
  });

  it('isMinimal requires every clue to be load-bearing', () => {
    expect(isMinimal(fourSolutions, [0, 2])).toBe(true);
    // Knuth's example is unique with zero clues, so any clue is redundant.
    expect(isMinimal(knuthExample, [])).toBe(true);
    expect(isMinimal(knuthExample, [1])).toBe(false);
    // Not unique at all: not minimal either.
    expect(isMinimal(fourSolutions, [0])).toBe(false);
  });
});
