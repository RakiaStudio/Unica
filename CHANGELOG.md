# @rakiastudio/unica

## 0.7.0

### Minor Changes

- 8321b0a: Inputs that were accepted silently until now and are refused from this
  version:
  
  - `generate` with a `stopAtClues` that is not a non-negative integer (for
    example `-1`, `1.5` or `Infinity`): `ExactCoverError`.
  - A number seed that is not finite (`NaN`, `Infinity`): `RangeError`.
  - `polyominoTiling` with a piece named '', '.' or '#' (the characters `format`
    uses for uncovered cells and holes): `ExactCoverError`.
  - `polyominoTiling` with a piece that lists a cell twice or has a cell that is
    not a pair of integers: `ExactCoverError`.
  - `polyominoTiling` with a hole that is not a pair of integers:
    `ExactCoverError`. Holes outside the board are still ignored.
  
  Malformed input is also refused with a clear `ExactCoverError` instead of being
  passed on:
  
  - A problem with a column out of range, or listed twice in one row, is refused
    the first time a function that takes a problem sees it (`classify`,
    `isUnique`, `isMinimal`, `solveUnique`, `restrictToClues`, `generate`,
    `randomSolution`, `DancingLinksSolver`, and the `solve` and `classify` of
    each puzzle). Before, the engine could run without returning, or answer
    'none'.
  - A clashing `options.solution` reports "not an exact cover"; an error from the
    engine itself is passed through unchanged.
  - Sudoku notation upper-cases only ASCII letters, so 'ı' and 'ſ' are no longer
    read as I and S.
  
  The English summary for `beyond` no longer says stronger techniques would
  finish the puzzle, since the input may have no solution or several. The README
  now says that `queens().solve` throws on attacking queens, as `sudoku().solve`
  does on clashing givens. Valid input gives the same puzzles as before; tests
  now pin plain `generate` output for sudoku, polyomino and N queens to what the
  published packages produced.

## 0.6.2

### Patch Changes

- 3249a53: README (en, ja): link to RakiaStudio (https://rakiastudio.com), who makes
  unica. No code in the package changes.

## 0.6.1

### Patch Changes

- 76063a9: README: how unica's sudoku levels line up with the Sukaku Explainer ratings
  of the Sudoku Exchange Puzzle Bank (8000 puzzles, measured on 0.6.0 from npm),
  in English and Japanese, and `scripts/compare-se-bank.mjs` to repeat it. No
  code in the package changes.

## 0.6.0

### Minor Changes

- c63c488: N queens: `queens({ n })` (also at `@rakiastudio/unica/queens`) reduces the
  board to exact cover, with rows and columns as primary columns and the
  diagonals as secondary ones, and offers `parse`/`format`, `generate` and
  `solve`. A generated puzzle places a few queens so that the rest can be
  placed in exactly one way.
- c63c488: Sudoku: a new difficulty `master` (ja: 達人) above `expert`, with six
  techniques weakest first: jellyfish, finned x-wing, finned swordfish, empty
  rectangle, w-wing and wxyz-wing. `generate({ difficulty: 'master' })` works.
  Over 5000 seeds, every puzzle 0.5.1 rated easy, medium, hard or expert keeps
  the same rating, steps and explanation; 28% of the puzzles 0.5.1 rated `beyond`
  are now `master`. `Difficulty`, `TargetDifficulty`, `TechniqueName` and
  `StepDetail` gain the new members, so exhaustive switches over them need the
  new cases.

## 0.5.1

### Patch Changes

- 9e1140e: README only: the comparison with other generators is limited to what was
  checked, kakuro is no longer listed as a clean exact cover formulation, and
  both READMEs note that Sudoku and Kakuro are registered trademarks of Nikoli
  Co., Ltd. in Japan and that unica is not affiliated with Nikoli. No code
  changes.

## 0.5.0

### Minor Changes

- ca97f9d: Japanese explanations now name techniques by their usual English labels
  (Hidden single, X-wing and so on) instead of the descriptive Japanese names
  shipped in 0.4.0. Only the technique names in the Japanese sentences change;
  `step.reason`, the English locale, `step.technique` and every rating stay the
  same.

## 0.4.0

### Minor Changes

- 62ff1bb: Explain sudoku ratings in other languages. Every step now carries `detail`,
  what it was based on as data (pattern, units, cells, values), and
  `explain(text, { locale })` builds sentences from it: `'en'` (default, the same
  text as before) or `'ja'`, or a caller's own `Locale`. Ratings also count what
  they used (`uses` per technique, `levels` per level), and `compareRatings`
  orders ratings of the same difficulty without weights. See ADR-0004.

## 0.3.0

### Minor Changes

- f6f7868: Add the `expert` sudoku difficulty: naked and hidden quads, swordfish,
  skyscraper, 2-string kite, xy-wing and xyz-wing, tried after x-wing in that
  fixed order. `generate({ difficulty: 'expert' })` is now accepted.
  
  A puzzle that 0.2 rated `beyond` can now be rated `expert`; if you store
  ratings, a stored `beyond` may now mean `expert`. Ratings of `easy`, `medium`
  and `hard` are unchanged, and `generate({ seed, difficulty })` returns the same
  puzzle as in 0.2.0 for those levels: new techniques are only ever added as a
  new level above the existing ones (ADR-0003).

## 0.2.0

### Minor Changes

- 1960f2b: Rate sudoku difficulty by the hardest human technique needed. `sudoku().rate(text)`
  solves with naked and hidden singles, naked and hidden pairs, pointing,
  claiming, naked and hidden triples and x-wing, tried weakest first, and returns
  `{ solved, difficulty, hardest, steps }` with a reason for every step;
  `explain(text)` prints them. `generate({ difficulty })` takes `easy`, `medium`
  or `hard`, retries with derived seeds until the rating matches (reproducible
  from the seed within one version, `maxAttempts` default 2000) and returns
  `attempts` and `rating`. See ADR-0003.

## 0.1.1

### Patch Changes

- 2b08821: Point the repository, homepage and issue links at `github.com/RakiaStudio/Unica`, matching the repository's actual name.

## 0.1.0

### Minor Changes

- 62ef7f2: Initial release.
  
  - Exact cover model (`ExactCoverProblem`, primary and secondary columns) with validation.
  - `classify` / `isUnique` / `isMinimal` / `solveUnique` with a bounded (limit 2) uniqueness check.
  - `generate`: random solution plus one-pass clue reduction, minimal by construction, seeded and reproducible.
  - `sudoku(...)` for any box shape, with text notation, `solve` and `classify`.
  - `polyominoTiling(...)` with holes, rotation/reflection options and the twelve pentominoes.
  - `dancing-links` as the engine behind a swappable `ExactCoverSolver` interface.

Generated by Changesets. Pending entries live in `.changeset/`.
