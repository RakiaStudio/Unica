# ADR-0003: Rate sudoku difficulty by the hardest technique needed

Status: accepted (2026-10-29); amended for 0.3.0 (2026-10-30): the expert level
and the rule for adding techniques.

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

| Level  | Techniques                                                                               |
| ------ | ---------------------------------------------------------------------------------------- |
| easy   | naked single, hidden single (row, column, box)                                           |
| medium | naked pair, hidden pair, pointing, claiming                                              |
| hard   | naked triple, hidden triple, x-wing                                                      |
| expert | naked quad, hidden quad, swordfish, skyscraper, 2-string kite, xy-wing, xyz-wing (0.3.0) |
| beyond | none of the above finishes the puzzle                                                    |

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
It means only that these techniques are not enough. Uniqueness is still
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

The rating decides which attempt is kept, so reproducibility across versions
depends on ratings not changing. The rule below makes that hold for every level
except `beyond`. The returned `seed` with a plain `generate` does not depend on
the rating at all.

`generate` accepts every level except `beyond`. A `beyond` rating says only that
these techniques got stuck; measured over 5000 seeds, most such puzzles stop
early, and a few are far harder. That is not a level a caller can meaningfully
ask for. A value outside the accepted ones throws `ExactCoverError`.

Measured over 5000 seeds (0.3.0), a minimal 9x9 puzzle rates easy about 43% of
the time, medium 19%, hard 0.34%, expert 12.6% and beyond 25.6%. The default `maxAttempts` is therefore
2000 rather than a smaller round number: at 0.34% per attempt, 2000 attempts
find a hard puzzle with probability above 99.9%, while 200 would fail about half
the time. When the attempts run out, `generate` throws `ExactCoverError` naming
the difficulty, the count and the seed.

## Adding techniques (0.3.0)

The list only grows at the end, and new techniques always form a new level
above every existing one. Nothing is inserted, nothing is reordered, and no
technique is added to an existing level, not even the top one.

Why this keeps ratings stable: the rater uses a technique only when every
earlier one is stuck. A puzzle that an older list finished never got stuck on
it, so techniques added after the end are never consulted; its steps, its
hardest technique and its difficulty are exactly as before. Only a `beyond`
puzzle can change, and it can only move into the new level (or stay `beyond`).

Why this keeps generation stable: `generate({ seed, difficulty })` keeps the
first attempt whose rating matches. For any level that already existed, an
attempt rated at that level keeps its rating, and an attempt rated anything
else cannot move into it: the only rating that moves is `beyond`, and it moves
into the new level. So the same attempt is kept and the same puzzle comes back.
Adding a technique to an existing level would break this for that level: an
attempt that used to be `beyond` could become that level and be kept earlier.

0.3.0 added `expert` this way. Over the same 5000 seeds, every puzzle that 0.2.0
rated easy, medium or hard has the same steps in 0.3.0; 631 puzzles moved from
`beyond` to `expert`, and none moved anywhere else. So a stored `beyond` from an
older version can now be `expert`; a stored easy, medium or hard cannot change.

`test/puzzles/sudoku/compat.test.ts` pins this. It holds the results that the
published 0.2.0 package returned for `generate({ seed, difficulty })` at each
level (puzzle, attempts, returned seed, hardest technique, step count, and a
hash of `explain`), and checks that this version returns the same.

Within `expert` the order is subsets (naked quad, hidden quad), then fish
(swordfish), then single-digit patterns (skyscraper, 2-string kite), then wings
(xy-wing, xyz-wing), following the pair, pointing, triple, x-wing order of the
earlier levels. It is fixed from now on, because reordering would change the
steps and hardest technique of expert puzzles.

## Techniques left out on purpose

- **Unique rectangle and other uniqueness techniques.** They eliminate
  candidates on the assumption that the puzzle has exactly one solution. That
  breaks the definition of sound used here (implied by the current candidates
  and the rules alone), and the soundness test could no longer check a step
  against the candidates. It looks wasteful, since unica guarantees uniqueness
  for the puzzles it generates, but `rate` also accepts puzzles from elsewhere,
  and a rating that silently relies on an unchecked assumption can be wrong for
  them. Do not add them without revisiting this decision.
- **Chains (forcing chains, alternating inference chains and similar).** A
  chain step can run for many cells, and its reason cannot be said in one
  sentence. Every step here must be explainable in one sentence by `explain`.

## Consequences

- Levels are a fixed, ordered list, and it grows only as described above.
- Candidates are bitmasks, so rating supports grids of at most 32 symbols. Larger
  grids throw `ExactCoverError`.
- Everything lives in `src/puzzles/sudoku/`. `src/core/` does not know that
  ratings exist.
