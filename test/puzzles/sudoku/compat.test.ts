import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TECHNIQUES, sudoku } from '../../../src/index.js';
import { BEYOND_IN_020, GENERATED_020 } from '../../fixtures/sudoku-0.2.0.js';
import { BEYOND_IN_051, GENERATED_051 } from '../../fixtures/sudoku-0.5.1.js';

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

describe('generate expert, compared with 0.5.1', () => {
  const s = sudoku();

  for (const fixture of GENERATED_051) {
    it(`expert from seed ${fixture.seed}`, () => {
      const puzzle = s.generate({ seed: fixture.seed, difficulty: fixture.difficulty });
      expect(puzzle.text.puzzle.replace(/\s+/g, '')).toBe(fixture.puzzle);
      expect(puzzle.attempts).toBe(fixture.attempts);
      expect(puzzle.seed).toBe(fixture.returnedSeed);
      expect(puzzle.rating.hardest).toBe(fixture.hardest);
      expect(puzzle.rating.steps).toHaveLength(fixture.steps);
      const explain = s.explain(puzzle.text.puzzle).join('\n');
      expect(createHash('sha256').update(explain).digest('hex')).toBe(fixture.explainSha256);
    });
  }
});

describe('rate, compared with 0.5.1', () => {
  it('keeps the first steps of a puzzle 0.5.1 got stuck on, and can now rate it master', () => {
    const s = sudoku();
    expect(s.generate({ seed: BEYOND_IN_051.seed }).text.puzzle.replace(/\s+/g, '')).toBe(
      BEYOND_IN_051.puzzle,
    );
    const rating = s.rate(BEYOND_IN_051.puzzle);
    expect(rating.solved).toBe(true);
    expect(rating.difficulty).toBe('master');
    expect(rating.hardest).toBe('w-wing');
    const levelOf = (name: string): string | undefined =>
      TECHNIQUES.find((technique) => technique.name === name)?.level;
    // The steps 0.5.1 managed are still the first ones, all below master; the
    // next one is the first master step.
    expect(
      rating.steps
        .slice(0, BEYOND_IN_051.steps)
        .every(({ technique }) => levelOf(technique) !== 'master'),
    ).toBe(true);
    expect(levelOf(rating.steps[BEYOND_IN_051.steps]?.technique ?? '')).toBe('master');
  });
});

describe('rate, compared with 0.2.0', () => {
  it('keeps the first steps of a puzzle 0.2.0 got stuck on, and rates it expert since 0.3.0', () => {
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
