import { describe, expect, it } from 'vitest';
import { DancingLinksSolver, getDefaultSolver, type ExactCoverProblem } from '../../src/index.js';
import { knuthExample, knuthSolution } from '../fixtures/knuth.js';

const solver = new DancingLinksSolver();

describe('DancingLinksSolver', () => {
  it("finds the unique cover of Knuth's example", () => {
    expect(solver.solve(knuthExample, 10)).toEqual([[...knuthSolution]]);
  });

  it('returns solutions sorted by row index', () => {
    const problem: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 0,
      rows: [
        { option: 'second', primary: [1] },
        { option: 'first', primary: [0] },
      ],
    };
    expect(solver.solve(problem, 5)).toEqual([[0, 1]]);
  });

  it('honours the limit', () => {
    // Four rows that each cover one of two columns: 2 x 2 = 4 solutions.
    const problem: ExactCoverProblem<number> = {
      primaryColumns: 2,
      secondaryColumns: 0,
      rows: [
        { option: 0, primary: [0] },
        { option: 1, primary: [0] },
        { option: 2, primary: [1] },
        { option: 3, primary: [1] },
      ],
    };
    expect(solver.solve(problem, 1)).toHaveLength(1);
    expect(solver.solve(problem, 2)).toHaveLength(2);
    expect(solver.solve(problem, 100)).toHaveLength(4);
  });

  it('treats secondary columns as at-most-once', () => {
    const problem: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 1,
      rows: [
        { option: 'a', primary: [0], secondary: [0] },
        { option: 'b', primary: [1], secondary: [0] },
        { option: 'c', primary: [1] },
      ],
    };
    // {a, b} collides on the secondary column; {a, c} is the only cover.
    expect(solver.solve(problem, 10)).toEqual([[0, 2]]);
  });

  it('a secondary column may stay uncovered', () => {
    const problem: ExactCoverProblem<string> = {
      primaryColumns: 1,
      secondaryColumns: 1,
      rows: [{ option: 'a', primary: [0] }],
    };
    expect(solver.solve(problem, 10)).toEqual([[0]]);
  });

  it('returns no solution when a primary column cannot be covered', () => {
    const problem: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 0,
      rows: [{ option: 'a', primary: [0] }],
    };
    expect(solver.solve(problem, 10)).toEqual([]);
    expect(solver.solve({ primaryColumns: 1, secondaryColumns: 0, rows: [] }, 10)).toEqual([]);
  });

  it('the empty problem has exactly the empty solution', () => {
    expect(solver.solve({ primaryColumns: 0, secondaryColumns: 0, rows: [] }, 10)).toEqual([[]]);
  });

  it('rejects a non-positive limit', () => {
    expect(() => solver.solve(knuthExample, 0)).toThrow(RangeError);
    expect(() => solver.solve(knuthExample, 1.5)).toThrow(RangeError);
  });

  it('getDefaultSolver returns one shared instance', () => {
    expect(getDefaultSolver()).toBe(getDefaultSolver());
    expect(getDefaultSolver()).toBeInstanceOf(DancingLinksSolver);
  });
});
