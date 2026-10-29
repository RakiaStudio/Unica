---
'@rakiastudio/unica': minor
---

Rate sudoku difficulty by the hardest human technique needed. `sudoku().rate(text)`
solves with naked and hidden singles, naked and hidden pairs, pointing,
claiming, naked and hidden triples and x-wing, tried weakest first, and returns
`{ solved, difficulty, hardest, steps }` with a reason for every step;
`explain(text)` prints them. `generate({ difficulty })` retries with derived
seeds until the rating matches (reproducible from the seed, `maxAttempts`
default 2000) and returns `attempts` and `rating`. See ADR-0003.
