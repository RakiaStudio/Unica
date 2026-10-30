---
'@rakiastudio/unica': minor
---

Sudoku: a new difficulty `master` (ja: 達人) above `expert`, with six
techniques weakest first: jellyfish, finned x-wing, finned swordfish, empty
rectangle, w-wing and wxyz-wing. `generate({ difficulty: 'master' })` works.
Over 5000 seeds, every puzzle 0.5.1 rated easy, medium, hard or expert keeps
the same rating, steps and explanation; 28% of the puzzles 0.5.1 rated `beyond`
are now `master`. `Difficulty`, `TargetDifficulty`, `TechniqueName` and
`StepDetail` gain the new members, so exhaustive switches over them need the
new cases.
