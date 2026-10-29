import { describe, expect, it } from 'vitest';
import {
  ExactCoverError,
  liftSolution,
  restrictToClues,
  solutionOptions,
  validateProblem,
  type ExactCoverProblem,
} from '../../src/index.js';
import { knuthExample } from '../fixtures/knuth.js';

describe('validateProblem', () => {
  it('accepts a well-formed problem', () => {
    expect(() => {
      validateProblem(knuthExample);
    }).not.toThrow();
  });

  it('rejects out-of-range and duplicate columns', () => {
    const outOfRange: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 0,
      rows: [{ option: 'a', primary: [0, 2] }],
    };
    expect(() => {
      validateProblem(outOfRange);
    }).toThrow(ExactCoverError);

    const duplicate: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 0,
      rows: [{ option: 'a', primary: [1, 1] }],
    };
    expect(() => {
      validateProblem(duplicate);
    }).toThrow(/listed twice/);
  });

  it('rejects negative column counts', () => {
    expect(() => {
      validateProblem({ primaryColumns: -1, secondaryColumns: 0, rows: [] });
    }).toThrow(ExactCoverError);
  });
});

describe('restrictToClues', () => {
  it('keeps the clue row and every row that shares no column with it', () => {
    // Row B (index 1) covers columns {0, 3}. Rows A (0) and C (2) also touch
    // those columns and must go; D, E, F survive alongside B.
    const restricted = restrictToClues(knuthExample, [1]);
    expect(restricted.rowMap).toEqual([1, 3, 4, 5]);
    expect(restricted.problem.rows.map((row) => row.option)).toEqual(['B', 'D', 'E', 'F']);
    expect(restricted.problem.primaryColumns).toBe(knuthExample.primaryColumns);
  });

  it('ignores a clue listed twice', () => {
    const once = restrictToClues(knuthExample, [1]);
    const twice = restrictToClues(knuthExample, [1, 1]);
    expect(twice.rowMap).toEqual(once.rowMap);
  });

  it('rejects clues that conflict with each other', () => {
    // A and B both cover column 0.
    expect(() => restrictToClues(knuthExample, [0, 1])).toThrow(/conflict/);
  });

  it('rejects a clue that covers no primary column', () => {
    const problem: ExactCoverProblem<string> = {
      primaryColumns: 1,
      secondaryColumns: 1,
      rows: [
        { option: 'p', primary: [0] },
        { option: 's', primary: [], secondary: [0] },
      ],
    };
    expect(() => restrictToClues(problem, [1])).toThrow(/cannot be a clue/);
  });

  it('removes rows that collide on a secondary column', () => {
    const problem: ExactCoverProblem<string> = {
      primaryColumns: 2,
      secondaryColumns: 1,
      rows: [
        { option: 'a', primary: [0], secondary: [0] },
        { option: 'b', primary: [1], secondary: [0] },
        { option: 'c', primary: [1] },
      ],
    };
    const restricted = restrictToClues(problem, [0]);
    expect(restricted.problem.rows.map((row) => row.option)).toEqual(['a', 'c']);
  });

  it('rejects an unknown row index', () => {
    expect(() => restrictToClues(knuthExample, [99])).toThrow(/out of range/);
  });
});

describe('liftSolution / solutionOptions', () => {
  it('translates restricted indices back and sorts them', () => {
    const restricted = restrictToClues(knuthExample, [1]);
    // Restricted rows are [B, D, E, F]; a solution over {F, D, B} is [3, 1, 0].
    expect(liftSolution(restricted, [3, 1, 0])).toEqual([1, 3, 5]);
    expect(solutionOptions(knuthExample, [1, 3, 5])).toEqual(['B', 'D', 'F']);
  });

  it('rejects an index with no original', () => {
    const restricted = restrictToClues(knuthExample, [1]);
    expect(() => liftSolution(restricted, [42])).toThrow(ExactCoverError);
  });
});
