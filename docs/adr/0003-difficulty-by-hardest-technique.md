# ADR-0003: Rate sudoku difficulty by the hardest technique needed

Status: accepted (2026-10-29)

## Context

A "difficulty" for a sudoku should tell a solver what to expect, and it should
be possible to check. Two common approaches:

1. Score every step (for example, 1 point for a single, 5 for a pair, 20 for an
   x-wing) and sum the scores.
2. Solve with human techniques ordered from weakest to strongest, and report the
   strongest technique the solve could not do without.

A summed score depends on weights that nobody can justify: is an x-wing worth
four pairs or ten? Change the weights and the ranking of two puzzles can flip.
The number also cannot be explained to a solver. "This puzzle scored 137" says
nothing about what to do, and a long easy puzzle can outscore a short hard one.

## Decision

Option 2. `sudoku().rate(text)` keeps a candidate grid and a single list of
techniques, weakest first:

| Level  | Techniques                                     |
| ------ | ---------------------------------------------- |
| easy   | naked single, hidden single (row, column, box) |
| medium | naked pair, hidden pair, pointing, claiming    |
| hard   | naked triple, hidden triple, x-wing            |
| beyond | none of the above finishes the puzzle          |

The rater tries the list from the top, applies the first step it finds, and
starts again from the top after any progress. It stops when the grid is full or
nothing applies. The difficulty is the level of the strongest technique used;
`beyond` when the grid is not full. Every step carries a one-sentence reason,
and `explain` prints them.

Because the rater always returns to the weakest technique, a stronger technique
is used only at a state where every weaker one is stuck. So "hard" means: at
some point, nothing in easy or medium could make progress. That statement is
the whole definition, and anyone can check it by replaying the steps.

`beyond` does not mean "no unique solution" or "very hard by some other scale".
It means only that these nine techniques are not enough. Uniqueness is still
decided by `classify`, independently of rating.

Difficulty and clue count are separate. The 17-clue puzzle in the test suite
has the fewest clues possible and rates `easy`: hidden singles alone solve it.

## Why a full grid is the solution

Each technique is sound: every placement and every elimination it returns is
implied by the current candidates and the rules alone. A sound step never
removes the true symbol from a cell and never places a wrong one. Starting from
the givens, the candidates therefore always contain the unique solution, and a
grid filled only by sound placements is that solution.

The property test `test/property/rate.property.test.ts` checks this against the
independent oracle in `test/helpers/brute-force.ts`. At every state the rater
passes through, it asks every technique (not only the one the rater chose) for a
step, and checks every placement and every elimination against the oracle's
solution. When a rating is solved, the final grid must equal that solution. A
technique that were unsound on any of those states would fail the test.

## Generating to a target difficulty

`generate({ difficulty })` generates and rates until the rating matches. Attempt
1 uses the given seed; attempt `k` uses `` `${seed}:${k}` ``. Generation and
rating are both deterministic, so the same seed walks the same attempts to the
same puzzle, and the returned `seed` regenerates that puzzle directly with a
plain `generate`.

That reproducibility holds within one version of the package. The rating
decides which attempt is kept, so a version that adds techniques can keep a
different attempt for the same seed. The returned `seed` with a plain
`generate` does not depend on the rating and stays stable.

`generate` accepts `easy`, `medium` and `hard`, not `beyond`. A `beyond` rating
says only that these techniques got stuck; measured over 5000 seeds, most such
puzzles stop right after pointing or claiming, and a few are far harder. That
is not a level a caller can meaningfully ask for. Leaving it out now also keeps
a later choice open: accepting a new value is backward compatible, removing one
is not. A value outside the three throws `ExactCoverError`.

Measured over 5000 seeds, a minimal 9x9 puzzle rates easy about 43% of the time,
medium 19%, hard 0.34% and beyond 38%. The default `maxAttempts` is therefore
2000 rather than a smaller round number: at 0.34% per attempt, 2000 attempts
find a hard puzzle with probability above 99.9%, while 200 would fail about half
the time. When the attempts run out, `generate` throws `ExactCoverError` naming
the difficulty, the count and the seed.

## Consequences

- Levels are a fixed, ordered list. Adding a technique means placing it in the
  list and stating its level; it can only move puzzles that were stuck before it
  in the list.
- Candidates are bitmasks, so rating supports grids of at most 32 symbols. Larger
  grids throw `ExactCoverError`.
- Everything lives in `src/puzzles/sudoku/`. `src/core/` does not know that
  ratings exist.
