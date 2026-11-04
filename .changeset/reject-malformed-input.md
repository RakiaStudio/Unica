---
'@rakiastudio/unica': patch
---

Malformed input is now refused with a clear `ExactCoverError` instead of being
passed on:

- A problem with a column out of range, or listed twice in one row, is refused
  the first time `classify`, `generate`, `randomSolution` or
  `DancingLinksSolver` sees it. Before, the engine could run without returning,
  or answer 'none'.
- `polyominoTiling` refuses pieces with a repeated or non-integer cell, holes
  outside the board, and the piece names '', '.' and '#'.
- `generate` refuses a `stopAtClues` that is not a non-negative integer, and a
  number seed that is not finite (`RangeError`). A clashing `options.solution`
  now reports "not an exact cover".
- Sudoku notation upper-cases only ASCII letters, so 'ı' and 'ſ' are no longer
  read as I and S.

The English summary for `beyond` no longer says stronger techniques would
finish the puzzle, since the input may have no solution or several. The README
now says that `queens().solve` throws on attacking queens, as `sudoku().solve`
does on clashing givens. Valid input gives the same puzzles as before; tests
now pin plain `generate` output for sudoku, polyomino and N queens to what the
published packages produced.
