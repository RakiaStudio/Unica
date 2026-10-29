---
'@rakiastudio/unica': minor
---

Initial release.

- Exact cover model (`ExactCoverProblem`, primary and secondary columns) with validation.
- `classify` / `isUnique` / `isMinimal` / `solveUnique` with a bounded (limit 2) uniqueness check.
- `generate`: random solution plus one-pass clue reduction, minimal by construction, seeded and reproducible.
- `sudoku(...)` for any box shape, with text notation, `solve` and `classify`.
- `polyominoTiling(...)` with holes, rotation/reflection options and the twelve pentominoes.
- `dancing-links` as the engine behind a swappable `ExactCoverSolver` interface.
