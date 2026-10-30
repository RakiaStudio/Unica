/* global fetch */
/**
 * Compare the sudoku levels of an installed @rakiastudio/unica with the
 * Sukaku Explainer (SE) ratings of the Sudoku Exchange Puzzle Bank.
 *
 * Source: https://github.com/grantm/sudoku-exchange-puzzle-bank, commit
 * d8c8ebaee0c0, public domain under the Unlicense. unica is not affiliated
 * with Sudoku Exchange. The files are not part of this repository; this script
 * downloads them from that commit (never from a branch) into a directory you
 * name, and stops unless each file has the SHA-256 recorded below.
 *
 * Usage, in a directory where @rakiastudio/unica is installed:
 *   node compare-se-bank.mjs <data dir> [per file, default 2000]
 *
 * Each record is "<12 hex> <81 digits> <SE rating>". From each file, every
 * k-th line from the first is taken (k = floor(lines / per file), no random
 * seed). The correspondence between bank files and unica levels below is
 * unica's own choice.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { DIFFICULTIES, sudoku } from '@rakiastudio/unica';

const COMMIT = 'd8c8ebaee0c0';
const BASE = `https://raw.githubusercontent.com/grantm/sudoku-exchange-puzzle-bank/${COMMIT}`;
const FILES = {
  easy: '789aab6f52cc4588e0c3aa4269ad3282cfda7e1cc79ea693d16507decde3fc50',
  medium: 'c2a5f8fac99dcf215b25d46ece47f346375e51730b182de70a6f8f2107b2b38d',
  hard: 'abcff1512411e601abd5e861c60add5be5d877739b6faa249ee86960f5ad85e9',
  diabolical: '08553d0c1145ea4d7c13008040f47ea8205d21fe1eaf8f4ab17a1a6981928b35',
};
const MAPPING = {
  easy: ['easy'],
  medium: ['medium'],
  hard: ['hard', 'expert'],
  diabolical: ['master', 'beyond'],
};

const dir = process.argv[2];
if (dir === undefined) throw new Error('give a directory for the bank files');
const perFile = Number(process.argv[3] ?? 2000);
mkdirSync(dir, { recursive: true });

const version = createRequire(import.meta.url)('@rakiastudio/unica/package.json').version;
const s = sudoku();
const rows = [];

for (const [bucket, sha256] of Object.entries(FILES)) {
  const path = join(dir, `${bucket}.txt`);
  if (!existsSync(path)) {
    const response = await fetch(`${BASE}/${bucket}.txt`);
    if (!response.ok) throw new Error(`${bucket}.txt: HTTP ${response.status}`);
    writeFileSync(path, new Uint8Array(await response.arrayBuffer()));
  }
  const bytes = readFileSync(path);
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== sha256) throw new Error(`${bucket}.txt: SHA-256 ${actual}, expected ${sha256}`);

  const lines = bytes.toString('utf8').split('\n').filter(Boolean);
  const step = Math.max(1, Math.floor(lines.length / perFile));
  for (let i = 0, taken = 0; i < lines.length && taken < perFile; i += step, taken++) {
    const [, digits, rating] = lines[i].trim().split(/\s+/);
    if (digits === undefined || rating === undefined || digits.length !== 81) {
      throw new Error(`${bucket}.txt line ${i + 1}: unexpected record`);
    }
    const start = performance.now();
    const level = s.rate(digits.replace(/0/g, '.')).difficulty;
    rows.push({ bucket, se: Number(rating), level, ms: performance.now() - start });
  }
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

console.log(`@rakiastudio/unica ${version}, bank commit ${COMMIT}, ${rows.length} puzzles`);
console.log(`bank file (SE ratings in the sample) | ${DIFFICULTIES.join(' | ')} | line up`);
let linedUp = 0;
for (const bucket of Object.keys(FILES)) {
  const inBucket = rows.filter((r) => r.bucket === bucket);
  const se = inBucket.map((r) => r.se);
  const counts = DIFFICULTIES.map((level) => inBucket.filter((r) => r.level === level).length);
  const match = inBucket.filter((r) => MAPPING[bucket].includes(r.level)).length;
  linedUp += match;
  const range = `${Math.min(...se).toFixed(1)} - ${Math.max(...se).toFixed(1)}`;
  console.log(`${bucket} (${range}) | ${counts.join(' | ')} | ${match}`);
}
console.log(`line up: ${linedUp} of ${rows.length}; do not: ${rows.length - linedUp}`);

console.log('median SE rating per unica level');
for (const level of DIFFICULTIES) {
  const values = rows.filter((r) => r.level === level).map((r) => r.se);
  if (values.length > 0)
    console.log(`  ${level}: ${median(values).toFixed(1)} (n=${values.length})`);
}

// Spearman's rank correlation, with average ranks for ties.
const ranks = (values) => {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const result = new Array(values.length).fill(0);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) result[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return result;
};
const a = ranks(rows.map((r) => r.se));
const b = ranks(rows.map((r) => DIFFICULTIES.indexOf(r.level)));
const mean = (xs) => xs.reduce((x, y) => x + y, 0) / xs.length;
const ma = mean(a);
const mb = mean(b);
let num = 0;
let da = 0;
let db = 0;
a.forEach((x, i) => {
  num += (x - ma) * (b[i] - mb);
  da += (x - ma) ** 2;
  db += (b[i] - mb) ** 2;
});
console.log(`Spearman rho (SE rating vs unica level): ${(num / Math.sqrt(da * db)).toFixed(3)}`);
const times = rows.map((r) => r.ms);
console.log(
  `rate time: median ${median(times).toFixed(1)} ms, max ${Math.max(...times).toFixed(1)} ms`,
);
