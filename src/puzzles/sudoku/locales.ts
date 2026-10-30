/**
 * Sentences for rating steps, one implementation per language.
 *
 * A step carries its reason as data (`Step.detail`); a locale turns that data
 * into a sentence. English and Japanese ship with the package. Any other
 * language is a `Locale` object the caller writes and passes to `explain`.
 * Each technique has its own sentence, built by a function rather than a
 * template, because word order and list punctuation differ between languages.
 */

import {
  at,
  symbol,
  type CellCandidates,
  type CellRef,
  type Step,
  type StepDetail,
  type TechniqueName,
  type UnitKind,
  type UnitRef,
} from './candidates.js';
import type { Rating } from './rate.js';
import type { Difficulty } from './techniques/index.js';

export interface Locale {
  /** Display name of a technique. */
  technique(name: TechniqueName): string;
  /** Display name of a difficulty. */
  difficulty(level: Difficulty): string;
  /** One sentence explaining a step. */
  reason(step: Pick<Step, 'technique' | 'detail'>): string;
  /** The last line of `explain`: solved or stuck, and how hard. */
  summary(rating: Pick<Rating, 'solved' | 'difficulty' | 'hardest'>): string;
  /** A numbered line of `explain`; `number` starts at 1. */
  line(number: number, reason: string): string;
}

export type LocaleName = 'en' | 'ja';

const values = (items: readonly number[]): string[] => items.map(symbol);

type RectangleDetail = Extract<StepDetail, { pattern: 'empty rectangle' }>;

/** The cell an empty rectangle clears: the far end's line meets the box's other line. */
function rectangleTarget({ link, ends, row, column }: RectangleDetail): CellRef {
  const far = ends[1];
  return link.kind === 'column'
    ? { row: far.row, col: column.index }
    : { row: row.index, col: far.col };
}

// ---------------------------------------------------------------------------
// English. These sentences are the `reason` of every step, so they must not
// change: explain output is pinned against earlier releases.

/** Display names of the techniques, shared by both bundled locales. */
const LABELS: Readonly<Record<TechniqueName, string>> = {
  'naked single': 'Naked single',
  'hidden single': 'Hidden single',
  'naked pair': 'Naked pair',
  'hidden pair': 'Hidden pair',
  pointing: 'Pointing',
  claiming: 'Claiming',
  'naked triple': 'Naked triple',
  'hidden triple': 'Hidden triple',
  'x-wing': 'X-wing',
  'naked quad': 'Naked quad',
  'hidden quad': 'Hidden quad',
  swordfish: 'Swordfish',
  skyscraper: 'Skyscraper',
  '2-string kite': '2-string kite',
  'xy-wing': 'XY-wing',
  'xyz-wing': 'XYZ-wing',
  jellyfish: 'Jellyfish',
  'finned x-wing': 'Finned X-wing',
  'finned swordfish': 'Finned Swordfish',
  'empty rectangle': 'Empty rectangle',
  'w-wing': 'W-wing',
  'wxyz-wing': 'WXYZ-wing',
};

const PLURAL_EN: Readonly<Record<UnitKind, string>> = {
  row: 'rows',
  column: 'columns',
  box: 'boxes',
};

function listEn(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${at(parts, parts.length - 1)}`;
}

function orEn(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} or ${at(parts, parts.length - 1)}`;
}

const cellEn = (cell: CellRef): string => `r${String(cell.row + 1)}c${String(cell.col + 1)}`;
const unitEn = (unit: UnitRef): string => `${unit.kind} ${String(unit.index + 1)}`;
const candidatesEn = ({ cell, values: held }: CellCandidates): string =>
  `${cellEn(cell)} (${orEn(values(held))})`;

export const english: Locale = {
  technique: (name) => name,
  difficulty: (level) => level,
  reason({ technique, detail }) {
    const label = LABELS[technique];
    switch (detail.pattern) {
      case 'naked single':
        return `${label}: ${cellEn(detail.cell)} can only be ${symbol(detail.value)}`;
      case 'hidden single':
        return `${label}: ${symbol(detail.value)} can only go in ${cellEn(detail.cell)} within ${unitEn(detail.unit)}`;
      case 'naked subset': {
        const names = listEn(values(detail.values));
        return `${label}: ${listEn(detail.cells.map(cellEn))} hold only ${names} between them, so ${names} leave the other cells of ${unitEn(detail.unit)}`;
      }
      case 'hidden subset':
        return `${label}: in ${unitEn(detail.unit)}, ${listEn(values(detail.values))} can only go in ${listEn(detail.cells.map(cellEn))}, so those cells hold nothing else`;
      case 'pointing':
      case 'claiming': {
        const [from, to] =
          detail.pattern === 'pointing' ? [detail.box, detail.line] : [detail.line, detail.box];
        const v = symbol(detail.value);
        return `${label}: in ${unitEn(from)}, ${v} is confined to ${unitEn(to)}, so ${v} leaves the rest of ${unitEn(to)}`;
      }
      case 'fish': {
        const v = symbol(detail.value);
        const bases = PLURAL_EN[at(detail.bases, 0).kind];
        const covers = PLURAL_EN[at(detail.covers, 0).kind];
        const numbers = (units: readonly UnitRef[]): string =>
          listEn(units.map((unit) => String(unit.index + 1)));
        return `${label}: ${v} in ${bases} ${numbers(detail.bases)} can only go in ${covers} ${numbers(detail.covers)}, so ${v} leaves the rest of those ${covers}`;
      }
      case 'linked pairs': {
        const v = symbol(detail.value);
        const [first, second] = detail.links;
        const [a, b] = detail.ends;
        return `${label}: ${v} can only go in two cells in ${unitEn(first)} and in ${unitEn(second)}, linked in ${unitEn(detail.via)}, so one of ${cellEn(a)} and ${cellEn(b)} is ${v} and ${v} leaves the cells that see both`;
      }
      case 'wing': {
        const v = symbol(detail.value);
        const [a, b] = detail.pincers;
        const xy = technique === 'xy-wing';
        return `${label}: pivot ${candidatesEn(detail.pivot)} with pincers ${candidatesEn(a)} and ${candidatesEn(b)}, so one of ${xy ? 'the pincers' : 'the three'} is ${v} and ${v} leaves the cells that see ${xy ? 'both pincers' : 'all three'}`;
      }
      case 'finned fish': {
        const v = symbol(detail.value);
        const bases = PLURAL_EN[at(detail.bases, 0).kind];
        const covers = PLURAL_EN[at(detail.covers, 0).kind];
        const numbers = (units: readonly UnitRef[]): string =>
          listEn(units.map((unit) => String(unit.index + 1)));
        const fins = detail.fins.length === 1 ? 'the fin' : 'the fins';
        return `${label}: ${v} in ${bases} ${numbers(detail.bases)} can only go in ${covers} ${numbers(detail.covers)} or in ${fins} ${listEn(detail.fins.map(cellEn))}, so ${v} leaves the cells of those ${covers} that see ${detail.fins.length === 1 ? 'the fin' : 'every fin'}`;
      }
      case 'empty rectangle': {
        const v = symbol(detail.value);
        const [near, far] = detail.ends;
        const target = cellEn(rectangleTarget(detail));
        return `${label}: in ${unitEn(detail.box)}, ${v} can only go in ${unitEn(detail.row)} or ${unitEn(detail.column)}, and in ${unitEn(detail.link)} only in ${cellEn(near)} and ${cellEn(far)}, so if ${target} were ${v}, ${unitEn(detail.box)} would have no place for ${v}: ${v} leaves ${target}`;
      }
      case 'w-wing': {
        const v = symbol(detail.value);
        const x = symbol(detail.linked);
        const [a, b] = detail.cells;
        const [p, q] = detail.ends;
        return `${label}: ${candidatesEn(a)} and ${candidatesEn(b)}, and in ${unitEn(detail.link)} ${x} can only go in ${cellEn(p)} and ${cellEn(q)}, which see them, so one of ${cellEn(a.cell)} and ${cellEn(b.cell)} is ${v} and ${v} leaves the cells that see both`;
      }
      case 'restricted cells': {
        const v = symbol(detail.value);
        const held = detail.cells.flatMap((cell) => cell.values);
        const all = [...new Set(held)].sort((x, y) => x - y);
        return `${label}: ${listEn(detail.cells.map(candidatesEn))} hold only ${listEn(values(all))} between them, and every value but ${v} sits in cells that all see each other, so one of them is ${v} and ${v} leaves the cells that see every cell holding ${v}`;
      }
    }
  },
  summary({ solved, difficulty, hardest }) {
    if (!solved) {
      return 'Stuck: none of the rated techniques applies here (beyond). The puzzle may still have one solution; it needs techniques stronger than wxyz-wing.';
    }
    return hardest === undefined
      ? 'Solved: nothing to do (easy).'
      : `Solved: ${difficulty}, hardest technique ${hardest}.`;
  },
  line: (number, reason) => `${String(number)}. ${reason}`,
};

// ---------------------------------------------------------------------------
// Japanese. Technique names stay the English labels (X-wing and so on), the
// names solvers search for; cells are written as 3行5列, boxes as ブロック.

const DIFFICULTIES_JA: Readonly<Record<Difficulty, string>> = {
  easy: 'やさしい',
  medium: 'ふつう',
  hard: 'むずかしい',
  expert: '上級',
  master: '達人',
  beyond: '判定外',
};

const KIND_JA: Readonly<Record<UnitKind, string>> = { row: '行', column: '列', box: 'ブロック' };

const listJa = (parts: readonly string[]): string => parts.join('、');

function orJa(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join('、')} か ${at(parts, parts.length - 1)}`;
}

const cellJa = (cell: CellRef): string => `${String(cell.row + 1)}行${String(cell.col + 1)}列`;
const unitJa = (unit: UnitRef): string =>
  unit.kind === 'box'
    ? `ブロック${String(unit.index + 1)}`
    : `${String(unit.index + 1)}${KIND_JA[unit.kind]}目`;
const candidatesJa = ({ cell, values: held }: CellCandidates): string =>
  `${cellJa(cell)}（${orJa(values(held))}）`;

export const japanese: Locale = {
  technique: (name) => LABELS[name],
  difficulty: (level) => DIFFICULTIES_JA[level],
  reason({ technique, detail }) {
    const name = LABELS[technique];
    switch (detail.pattern) {
      case 'naked single':
        return `${name}：${cellJa(detail.cell)} に入るのは ${symbol(detail.value)} だけ`;
      case 'hidden single':
        return `${name}：${unitJa(detail.unit)}で ${symbol(detail.value)} が入るのは ${cellJa(detail.cell)} だけ`;
      case 'naked subset': {
        const names = listJa(values(detail.values));
        const unit = unitJa(detail.unit);
        return `${name}：${unit}の ${listJa(detail.cells.map(cellJa))} には ${names} しか入らないので、${names} は${unit}のほかのマスから消える`;
      }
      case 'hidden subset':
        return `${name}：${unitJa(detail.unit)}で ${listJa(values(detail.values))} が入るのは ${listJa(detail.cells.map(cellJa))} だけなので、そのマスからほかの候補が消える`;
      case 'pointing': {
        const v = symbol(detail.value);
        const line = unitJa(detail.line);
        return `${name}：${unitJa(detail.box)}の ${v} は${line}に並んでいるので、${v} は${line}のほかのマスから消える`;
      }
      case 'claiming': {
        const v = symbol(detail.value);
        const box = unitJa(detail.box);
        return `${name}：${unitJa(detail.line)}の ${v} は${box}に収まっているので、${v} は${box}のほかのマスから消える`;
      }
      case 'fish': {
        const v = symbol(detail.value);
        const covers = KIND_JA[at(detail.covers, 0).kind];
        return `${name}：${v} は ${listJa(detail.bases.map(unitJa))}で ${listJa(detail.covers.map(unitJa))}にしか入らないので、${v} はそれらの${covers}のほかのマスから消える`;
      }
      case 'linked pairs': {
        const v = symbol(detail.value);
        const [first, second] = detail.links;
        const [a, b] = detail.ends;
        return `${name}：${v} は${unitJa(first)}と${unitJa(second)}でそれぞれ2か所にしか入らず、${unitJa(detail.via)}でつながっているので、${cellJa(a)} か ${cellJa(b)} のどちらかが ${v} になり、その両方から見えるマスから ${v} が消える`;
      }
      case 'wing': {
        const v = symbol(detail.value);
        const [a, b] = detail.pincers;
        const opening = `${name}：中心の ${candidatesJa(detail.pivot)}と ${candidatesJa(a)}、${candidatesJa(b)}から、`;
        return technique === 'xy-wing'
          ? `${opening}${cellJa(a.cell)} か ${cellJa(b.cell)} のどちらかが ${v} になり、その両方から見えるマスから ${v} が消える`
          : `${opening}この3マスのどれかが ${v} になり、3マスすべてから見えるマスから ${v} が消える`;
      }
      case 'finned fish': {
        const v = symbol(detail.value);
        const covers = KIND_JA[at(detail.covers, 0).kind];
        return `${name}：${v} は ${listJa(detail.bases.map(unitJa))}で ${listJa(detail.covers.map(unitJa))}か、ひれの ${listJa(detail.fins.map(cellJa))} にしか入らないので、それらの${covers}のうちひれから見えるマスから ${v} が消える`;
      }
      case 'empty rectangle': {
        const v = symbol(detail.value);
        const [near, far] = detail.ends;
        const target = cellJa(rectangleTarget(detail));
        return `${name}：${unitJa(detail.box)}の ${v} は${unitJa(detail.row)}か${unitJa(detail.column)}にしか入らず、${unitJa(detail.link)}では ${cellJa(near)} か ${cellJa(far)} にしか入らないので、${target} が ${v} だと${unitJa(detail.box)}に ${v} の入る場所が無くなる。${target} から ${v} が消える`;
      }
      case 'w-wing': {
        const v = symbol(detail.value);
        const x = symbol(detail.linked);
        const [a, b] = detail.cells;
        const [p, q] = detail.ends;
        return `${name}：${candidatesJa(a)}と ${candidatesJa(b)}があり、${unitJa(detail.link)}で ${x} が入るのは ${cellJa(p)} か ${cellJa(q)} だけで、それぞれが2つのマスから見えるので、${cellJa(a.cell)} か ${cellJa(b.cell)} のどちらかが ${v} になり、その両方から見えるマスから ${v} が消える`;
      }
      case 'restricted cells': {
        const v = symbol(detail.value);
        const all = [...new Set(detail.cells.flatMap((cell) => cell.values))].sort((x, y) => x - y);
        return `${name}：${listJa(detail.cells.map(candidatesJa))}には合わせて ${listJa(values(all))} しか入らず、${v} 以外の数字はどれも互いに見えるマスにしか無いので、このどれかが ${v} になり、${v} の入りうるマスすべてから見えるマスから ${v} が消える`;
      }
    }
  },
  summary({ solved, difficulty, hardest }) {
    if (!solved) {
      return `ここで手が止まりました（${DIFFICULTIES_JA.beyond}）。唯一解の問題でも、ここにある手筋だけでは解き切れません。`;
    }
    return hardest === undefined
      ? `解けました：手順は要りません（${DIFFICULTIES_JA.easy}）。`
      : `解けました：難易度は「${DIFFICULTIES_JA[difficulty]}」、最も強い手筋は「${LABELS[hardest]}」です。`;
  },
  line: (number, reason) => `${String(number)}. ${reason}`,
};

export const LOCALES: Readonly<Record<LocaleName, Locale>> = { en: english, ja: japanese };
