import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sudoku } from '../../../src/index.js';
import { BEYOND_IN_020, GENERATED_020 } from '../../fixtures/sudoku-0.2.0.js';

/**
 * Reproducible across versions: what 0.2.0 generated for a seed and a
 * difficulty, this version generates too, with the same attempts and the same
 * rating step for step. Techniques are only appended to the list (ADR-0003);
 * reordering or inserting one would break these.
 */
describe('generate with a difficulty, compared with 0.2.0', () => {
  const s = sudoku();

  for (const fixture of GENERATED_020) {
    it(`${fixture.difficulty} from seed ${fixture.seed}`, () => {
      const puzzle = s.generate({ seed: fixture.seed, difficulty: fixture.difficulty });
      expect(puzzle.text.puzzle.replace(/\s+/g, '')).toBe(fixture.puzzle);
      expect(puzzle.attempts).toBe(fixture.attempts);
      expect(puzzle.seed).toBe(fixture.returnedSeed);
      expect(puzzle.rating.difficulty).toBe(fixture.difficulty);
      expect(puzzle.rating.hardest).toBe(fixture.hardest);
      expect(puzzle.rating.steps).toHaveLength(fixture.steps);
      const explain = s.explain(puzzle.text.puzzle).join('\n');
      expect(createHash('sha256').update(explain).digest('hex')).toBe(fixture.explainSha256);
    });
  }
});

describe('rate, compared with 0.2.0', () => {
  it('keeps the first steps of a puzzle 0.2.0 got stuck on, and can now rate it expert', () => {
    const s = sudoku();
    expect(s.generate({ seed: BEYOND_IN_020.seed }).text.puzzle.replace(/\s+/g, '')).toBe(
      BEYOND_IN_020.puzzle,
    );
    const rating = s.rate(BEYOND_IN_020.puzzle);
    expect(rating.solved).toBe(true);
    expect(rating.difficulty).toBe('expert');
    expect(rating.hardest).toBe('xy-wing');
    // The 40 steps 0.2.0 managed are still the first 40, all weaker than expert.
    expect(rating.steps[BEYOND_IN_020.steps]?.technique).toBe('xy-wing');
    expect(
      rating.steps
        .slice(0, BEYOND_IN_020.steps)
        .every(({ technique }) => technique.endsWith('single')),
    ).toBe(true);
  });
});
