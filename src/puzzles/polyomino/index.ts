/**
 * Polyomino tiling as exact cover.
 *
 * The board is a `width x height` rectangle, optionally with holes. Each piece
 * is a set of cells. A *placement* is one piece in one orientation at one
 * offset, and it covers:
 *
 *   cell(x, y)   every board cell is covered exactly once     (primary)
 *   piece(name)  every piece is used exactly once             (primary, unless
 *                `eachPieceOnce` is false, in which case pieces may repeat and
 *                these columns do not exist)
 *
 * A puzzle fixes some placements as clues; the player completes the tiling.
 * With `generate`, the clues are chosen so that the completion is unique.
 */

import {
  ExactCoverError,
  type ExactCoverProblem,
  type ExactCoverRow,
  type Solution,
} from '../../core/exact-cover.js';
import { generate, type GeneratedPuzzle, type GenerateOptions } from '../../core/generate.js';

/** A cell as `[x, y]`, x to the right and y downwards. */
export type Cell = readonly [x: number, y: number];

export interface PolyominoShape {
  /** Single character preferred: it is what `format` prints. */
  readonly name: string;
  readonly cells: readonly Cell[];
}

export interface Placement {
  readonly piece: string;
  /** Index into the piece's distinct orientations. */
  readonly orientation: number;
  /** Offset of the orientation's normalised bounding box. */
  readonly x: number;
  readonly y: number;
  /** Absolute cells covered on the board. */
  readonly cells: readonly Cell[];
}

export interface PolyominoOptions {
  readonly width: number;
  readonly height: number;
  readonly pieces: readonly PolyominoShape[];
  readonly holes?: readonly Cell[];
  /** Allow the four rotations. Default `true`. */
  readonly rotations?: boolean;
  /** Allow mirror images. Default `true`. */
  readonly reflections?: boolean;
  /** Each piece exactly once (`true`, default) or any number of times (`false`). */
  readonly eachPieceOnce?: boolean;
}

export interface PolyominoGenerated extends GeneratedPuzzle {
  readonly text: {
    readonly puzzle: string;
    readonly solution: string;
  };
}

export interface PolyominoTiling {
  readonly width: number;
  readonly height: number;
  readonly pieces: readonly PolyominoShape[];
  /** Distinct orientations per piece, normalised to the origin. */
  orientations(piece: string): readonly (readonly Cell[])[];
  problem(): ExactCoverProblem<Placement>;
  /** Grid text: piece names for covered cells, `.` uncovered, `#` holes. */
  format(rows: Solution): string;
  generate(options?: GenerateOptions): PolyominoGenerated;
}

export function polyominoTiling(options: PolyominoOptions): PolyominoTiling {
  const { width, height, pieces } = options;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new ExactCoverError('width and height must be positive integers');
  }
  if (pieces.length === 0) {
    throw new ExactCoverError('at least one piece is required');
  }
  const names = new Set<string>();
  for (const piece of pieces) {
    if (names.has(piece.name)) throw new ExactCoverError(`duplicate piece name '${piece.name}'`);
    if (piece.cells.length === 0) throw new ExactCoverError(`piece '${piece.name}' has no cells`);
    names.add(piece.name);
  }
  const rotations = options.rotations ?? true;
  const reflections = options.reflections ?? true;
  const eachPieceOnce = options.eachPieceOnce ?? true;

  // Board cells to primary column indices; holes get -1.
  const cellColumn = new Int32Array(width * height).fill(-1);
  let cellCount = 0;
  const holeSet = new Set((options.holes ?? []).map(([x, y]) => cellKey(x, y)));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (holeSet.has(cellKey(x, y))) continue;
      cellColumn[y * width + x] = cellCount++;
    }
  }
  const pieceColumn = new Map<string, number>();
  if (eachPieceOnce) {
    pieces.forEach((piece, index) => pieceColumn.set(piece.name, cellCount + index));
  }
  const primaryColumns = cellCount + (eachPieceOnce ? pieces.length : 0);

  const orientationCache = new Map<string, readonly (readonly Cell[])[]>();
  const orientations = (name: string): readonly (readonly Cell[])[] => {
    const cached = orientationCache.get(name);
    if (cached !== undefined) return cached;
    const piece = pieces.find((candidate) => candidate.name === name);
    if (piece === undefined) throw new ExactCoverError(`unknown piece '${name}'`);
    const computed = distinctOrientations(piece.cells, rotations, reflections);
    orientationCache.set(name, computed);
    return computed;
  };

  let cachedProblem: ExactCoverProblem<Placement> | undefined;
  const problem = (): ExactCoverProblem<Placement> => {
    if (cachedProblem !== undefined) return cachedProblem;
    const rows: ExactCoverRow<Placement>[] = [];
    for (const piece of pieces) {
      orientations(piece.name).forEach((shape, orientation) => {
        const maxX = Math.max(...shape.map(([x]) => x));
        const maxY = Math.max(...shape.map(([, y]) => y));
        for (let y = 0; y + maxY < height; y++) {
          for (let x = 0; x + maxX < width; x++) {
            const primary: number[] = [];
            const cells: Cell[] = [];
            let fits = true;
            for (const [dx, dy] of shape) {
              const column = cellColumn[(y + dy) * width + (x + dx)];
              if (column === undefined || column < 0) {
                fits = false;
                break;
              }
              primary.push(column);
              cells.push([x + dx, y + dy]);
            }
            if (!fits) continue;
            const pieceCol = pieceColumn.get(piece.name);
            if (pieceCol !== undefined) primary.push(pieceCol);
            rows.push({ option: { piece: piece.name, orientation, x, y, cells }, primary });
          }
        }
      });
    }
    cachedProblem = { primaryColumns, secondaryColumns: 0, rows };
    return cachedProblem;
  };

  const format = (rowIndices: Solution): string => {
    const grid: string[][] = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => (holeSet.has(cellKey(x, y)) ? '#' : '.')),
    );
    const rows = problem().rows;
    for (const index of rowIndices) {
      const row = rows[index];
      if (row === undefined) throw new ExactCoverError(`row index out of range: ${String(index)}`);
      for (const [x, y] of row.option.cells) {
        const line = grid[y];
        if (line !== undefined) line[x] = row.option.piece;
      }
    }
    return grid.map((line) => line.join('')).join('\n');
  };

  return {
    width,
    height,
    pieces,
    orientations,
    problem,
    format,
    generate(generateOptions) {
      const generated = generate(problem(), generateOptions);
      return {
        ...generated,
        text: { puzzle: format(generated.clues), solution: format(generated.solution) },
      };
    },
  };
}

function cellKey(x: number, y: number): string {
  return `${String(x)},${String(y)}`;
}

/**
 * All distinct orientations of a shape under the allowed symmetry group,
 * each translated so its bounding box starts at the origin.
 */
export function distinctOrientations(
  cells: readonly Cell[],
  rotations: boolean,
  reflections: boolean,
): readonly (readonly Cell[])[] {
  const transforms: ((cell: Cell) => Cell)[] = [([x, y]) => [x, y]];
  if (rotations) {
    transforms.push(
      ([x, y]) => [-y, x],
      ([x, y]) => [-x, -y],
      ([x, y]) => [y, -x],
    );
  }
  if (reflections) {
    for (const transform of [...transforms]) {
      transforms.push((cell) => {
        const [x, y] = transform(cell);
        return [-x, y];
      });
    }
  }

  const seen = new Map<string, readonly Cell[]>();
  for (const transform of transforms) {
    const shape = normalise(cells.map(transform));
    const key = shape.map(([x, y]) => cellKey(x, y)).join(';');
    if (!seen.has(key)) seen.set(key, shape);
  }
  return [...seen.values()];
}

function normalise(cells: readonly Cell[]): readonly Cell[] {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  return cells
    .map(([x, y]): Cell => [x - minX, y - minY])
    .sort(([ax, ay], [bx, by]) => ay - by || ax - bx);
}

/** The twelve free pentominoes, named by convention (Golomb). */
export const PENTOMINOES: readonly PolyominoShape[] = [
  {
    name: 'F',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    name: 'I',
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  },
  {
    name: 'L',
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 3],
    ],
  },
  {
    name: 'N',
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    name: 'P',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  },
  {
    name: 'T',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
      [1, 2],
    ],
  },
  {
    name: 'U',
    cells: [
      [0, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    name: 'V',
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'W',
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
  },
  {
    name: 'X',
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
  },
  {
    name: 'Y',
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    name: 'Z',
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
  },
];
