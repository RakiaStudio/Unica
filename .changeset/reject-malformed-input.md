---
'@rakiastudio/unica': minor
---

Inputs that were accepted silently until now and are refused from this
version:

- `generate` with a `stopAtClues` that is not a non-negative integer (for
  example `-1`, `1.5` or `Infinity`): `ExactCoverError`.
- A number seed that is not finite (`NaN`, `Infinity`): `RangeError`.

Malformed input is also refused with a clear `ExactCoverError` instead of being
passed on:

- A problem with a column out of range, or listed twice in one row, is refused
  the first time a function that takes a problem sees it (`classify`,
  `isUnique`, `isMinimal`, `solveUnique`, `restrictToClues`, `generate`,
  `randomSolution`, `DancingLinksSolver`, and the `solve` and `classify` of
  each puzzle). Before, the engine could run without returning, or answer
  'none'.
- `polyominoTiling` refuses pieces with a repeated or non-integer cell, holes
  that are not pairs of integers, and the piece names '', '.' and '#'. Holes
  outside the board are still ignored.
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
