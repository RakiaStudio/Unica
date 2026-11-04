import { describe, expect, it } from 'vitest';
import {
  DancingLinksSolver,
  ExactCoverError,
  classify,
  createRng,
  generate,
  randomSolution,
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

describe('malformed problems are rejected at the entry points', () => {
  /** Row 0 names column 5 of a 2-column problem. Before 0.6.3 the engine never returned. */
  const outOfRange: ExactCoverProblem<number> = {
    primaryColumns: 2,
    secondaryColumns: 0,
    rows: [
      { option: 0, primary: [0, 5] },
      { option: 1, primary: [1] },
    ],
  };
  /** Row 0 lists column 0 twice. Before 0.6.3 classify answered 'none'. */
  const repeated: ExactCoverProblem<number> = {
    primaryColumns: 2,
    secondaryColumns: 0,
    rows: [
      { option: 0, primary: [0, 0] },
      { option: 1, primary: [1] },
    ],
  };

  it('classify, solveUnique and isMinimal throw instead of looping or answering wrongly', () => {
    for (const problem of [outOfRange, repeated]) {
      expect(() => classify(problem, [])).toThrow(ExactCoverError);
      expect(() => solveUnique(problem, [])).toThrow(ExactCoverError);
      expect(() => isMinimal(problem, [])).toThrow(ExactCoverError);
    }
    expect(() => classify(outOfRange, [])).toThrow(/row 0: primary column 5 is out of range/);
    expect(() => classify(repeated, [])).toThrow(/row 0: primary column 0 listed twice/);
  });

  it('generate, randomSolution and the engine throw too', () => {
    expect(() => generate(outOfRange, { seed: 1 })).toThrow(ExactCoverError);
    expect(() => randomSolution(outOfRange, createRng(1))).toThrow(ExactCoverError);
    expect(() => new DancingLinksSolver().solve(outOfRange, 2)).toThrow(ExactCoverError);
  });

  it('keeps answering for a valid problem used many times', () => {
    for (let i = 0; i < 3; i++) {
      expect(classify(fourSolutions, [0, 2]).count).toBe('unique');
    }
  });
});
