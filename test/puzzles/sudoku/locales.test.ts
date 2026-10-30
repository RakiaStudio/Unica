import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  TECHNIQUES,
  english,
  japanese,
  sudoku,
  type Locale,
  type Step,
} from '../../../src/index.js';
import { geometry, type CandidateGrid } from '../../../src/puzzles/sudoku/candidates.js';
import {
  hiddenQuad,
  nakedQuad,
  nakedTriple,
  pointing,
  claiming,
  skyscraper,
  swordfish,
  twoStringKite,
  xWing,
  xyWing,
  xyzWing,
  hiddenSingle,
  hiddenTriple,
} from '../../../src/puzzles/sudoku/techniques/index.js';

/**
 * Every step carries its reason twice: as data (`detail`) and as an English
 * sentence (`reason`). The English locale must rebuild `reason` exactly from
 * the data, which is what keeps `explain` output stable across releases.
 */

const nine = geometry(3, 3);
const bitsOf = (values: readonly number[]): number =>
  values.reduce((mask, value) => mask | (1 << (value - 1)), 0);
const empty = (): number[] => Array.from({ length: 81 }, () => nine.full);
const state = (candidates: number[]): CandidateGrid => ({
  geometry: nine,
  values: Array.from({ length: 81 }, () => 0),
  candidates,
});
function remove(candidates: number[], cells: readonly number[], value: number): void {
  for (const cell of cells) candidates[cell] = (candidates[cell] ?? 0) & ~bitsOf([value]);
}
const row0 = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function found(step: Step | undefined): Step {
  if (step === undefined) throw new Error('the handcrafted state should give a step');
  return step;
}

/** One handcrafted step per pattern (and per variant of a pattern). */
function samples(): Step[] {
  const steps: Step[] = [];
  let c = empty();
  remove(
    c,
    row0.filter((cell) => cell !== 4),
    7,
  );
  steps.push(found(hiddenSingle(state(c))));
  c = empty();
  c[0] = bitsOf([1, 2]);
  c[1] = bitsOf([2, 3]);
  c[2] = bitsOf([1, 3]);
  steps.push(found(nakedTriple(state(c))));
  c = empty();
  for (const v of [1, 2, 3])
    remove(
      c,
      row0.filter((cell) => cell > 2),
      v,
    );
  steps.push(found(hiddenTriple(state(c))));
  c = empty();
  c[0] = bitsOf([1, 2]);
  c[1] = bitsOf([2, 3]);
  c[2] = bitsOf([3, 4]);
  c[3] = bitsOf([1, 4]);
  steps.push(found(nakedQuad(state(c))));
  c = empty();
  for (const v of [1, 2, 3, 4])
    remove(
      c,
      row0.filter((cell) => cell > 3),
      v,
    );
  steps.push(found(hiddenQuad(state(c))));
  c = empty();
  remove(c, [9, 10, 11, 18, 19, 20], 5);
  steps.push(found(pointing(state(c))));
  c = empty();
  remove(c, [3, 4, 5, 6, 7, 8], 6);
  steps.push(found(claiming(state(c))));
  c = empty();
  for (const r of [1, 6])
    remove(
      c,
      row0.filter((x) => x !== 2 && x !== 7).map((x) => r * 9 + x),
      4,
    );
  steps.push(found(xWing(state(c))));
  c = empty();
  const keep: [number, number[]][] = [
    [0, [1, 4]],
    [4, [4, 7]],
    [8, [1, 7]],
  ];
  for (const [r, cols] of keep) {
    remove(
      c,
      row0.filter((x) => !cols.includes(x)).map((x) => r * 9 + x),
      4,
    );
  }
  steps.push(found(swordfish(state(c))));
  c = empty();
  remove(
    c,
    row0.filter((x) => x !== 0 && x !== 4),
    6,
  );
  remove(
    c,
    row0.filter((x) => x !== 0 && x !== 3).map((x) => 54 + x),
    6,
  );
  steps.push(found(skyscraper(state(c))));
  c = empty();
  remove(c, [0, 2, 3, 4, 5, 6, 8], 5);
  remove(c, [0, 9, 27, 36, 45, 63, 72], 5);
  steps.push(found(twoStringKite(state(c))));
  c = empty();
  c[0] = bitsOf([1, 2]);
  c[4] = bitsOf([1, 3]);
  c[27] = bitsOf([2, 3]);
  steps.push(found(xyWing(state(c))));
  c = empty();
  c[0] = bitsOf([1, 2, 3]);
  c[1] = bitsOf([1, 3]);
  c[27] = bitsOf([2, 3]);
  steps.push(found(xyzWing(state(c))));
  return steps;
}

describe('english', () => {
  it('rebuilds every handcrafted reason from its detail', () => {
    for (const step of samples()) expect(english.reason(step)).toBe(step.reason);
  });

  it('rebuilds every reason of generated puzzles from its detail', () => {
    const s = sudoku();
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 12 }), (seed) => {
        const { rating } = s.generate({ seed, difficulty: 'expert' });
        for (const step of rating.steps) expect(english.reason(step)).toBe(step.reason);
      }),
      { numRuns: 20 },
    );
  });

  it('names techniques and difficulties as the API does', () => {
    for (const { name } of TECHNIQUES) expect(english.technique(name)).toBe(name);
    expect(english.difficulty('expert')).toBe('expert');
  });
});

describe('japanese', () => {
  it('writes one sentence per pattern', () => {
    expect(samples().map((step) => japanese.reason(step))).toEqual([
      'Hidden single：1行目で 7 が入るのは 1行5列 だけ',
      'Naked triple：1行目の 1行1列、1行2列、1行3列 には 1、2、3 しか入らないので、1、2、3 は1行目のほかのマスから消える',
      'Hidden triple：1行目で 1、2、3 が入るのは 1行1列、1行2列、1行3列 だけなので、そのマスからほかの候補が消える',
      'Naked quad：1行目の 1行1列、1行2列、1行3列、1行4列 には 1、2、3、4 しか入らないので、1、2、3、4 は1行目のほかのマスから消える',
      'Hidden quad：1行目で 1、2、3、4 が入るのは 1行1列、1行2列、1行3列、1行4列 だけなので、そのマスからほかの候補が消える',
      'Pointing：ブロック1の 5 は1行目に並んでいるので、5 は1行目のほかのマスから消える',
      'Claiming：1行目の 6 はブロック1に収まっているので、6 はブロック1のほかのマスから消える',
      'X-wing：4 は 2行目、7行目で 3列目、8列目にしか入らないので、4 はそれらの列のほかのマスから消える',
      'Swordfish：4 は 1行目、5行目、9行目で 2列目、5列目、8列目にしか入らないので、4 はそれらの列のほかのマスから消える',
      'Skyscraper：6 は1行目と7行目でそれぞれ2か所にしか入らず、1列目でつながっているので、1行5列 か 7行4列 のどちらかが 6 になり、その両方から見えるマスから 6 が消える',
      '2-string kite：5 は1行目と1列目でそれぞれ2か所にしか入らず、ブロック1でつながっているので、1行8列 か 7行1列 のどちらかが 5 になり、その両方から見えるマスから 5 が消える',
      'XY-wing：中心の 1行1列（1 か 2）と 1行5列（1 か 3）、4行1列（2 か 3）から、1行5列 か 4行1列 のどちらかが 3 になり、その両方から見えるマスから 3 が消える',
      'XYZ-wing：中心の 1行1列（1、2 か 3）と 1行2列（1 か 3）、4行1列（2 か 3）から、この3マスのどれかが 3 になり、3マスすべてから見えるマスから 3 が消える',
    ]);
  });

  it('explains a whole puzzle, with singles and a summary', () => {
    const s = sudoku();
    const seventeen =
      '000000010400000000020000000000050407008000300001090000300400200050100000000806000';
    const lines = s.explain(seventeen, { locale: 'ja' });
    expect(lines).toHaveLength(65);
    expect(lines[0]).toMatch(/^1\. (Naked single|Hidden single)：/);
    expect(lines.at(-1)).toBe(
      '解けました：難易度は「やさしい」、最も強い手筋は「Hidden single」です。',
    );
    expect(s.explain(seventeen, { locale: 'en' })).toEqual(s.explain(seventeen));
  });

  it('names every technique and difficulty, and says when it is stuck or done', () => {
    expect(TECHNIQUES.map(({ name }) => japanese.technique(name))).toEqual([
      'Naked single',
      'Hidden single',
      'Naked pair',
      'Hidden pair',
      'Pointing',
      'Claiming',
      'Naked triple',
      'Hidden triple',
      'X-wing',
      'Naked quad',
      'Hidden quad',
      'Swordfish',
      'Skyscraper',
      '2-string kite',
      'XY-wing',
      'XYZ-wing',
    ]);
    expect(japanese.difficulty('beyond')).toBe('判定外');
    expect(japanese.summary({ solved: false, difficulty: 'beyond', hardest: undefined })).toMatch(
      /^ここで手が止まりました（判定外）/,
    );
    expect(japanese.summary({ solved: true, difficulty: 'easy', hardest: undefined })).toBe(
      '解けました：手順は要りません（やさしい）。',
    );
  });
});

describe('a caller-supplied locale', () => {
  it('is used for every line', () => {
    const shout: Locale = {
      ...english,
      reason: (step) => english.reason(step).toUpperCase(),
      summary: () => 'DONE',
      line: (number, reason) => `#${String(number)} ${reason}`,
    };
    const lines = sudoku().explain(
      '000000010400000000020000000000050407008000300001090000300400200050100000000806000',
      { locale: shout },
    );
    expect(lines[0]).toMatch(/^#1 (NAKED|HIDDEN) SINGLE: /);
    expect(lines.at(-1)).toBe('DONE');
  });
});
