# ADR-0002: Encode clues by restricting the row set, not by extending the solver

Status: accepted (2026-10-29)

## Context

A puzzle is an exact cover problem plus clues: rows that must appear in the
solution. The engine knows nothing about clues; it only knows columns and rows.
There are three ways to make a solution contain a given row:

1. Add a primary column per clue that only the clue row covers.
2. Pre-cover the clue's columns inside the engine before searching (what Knuth's
   own sudoku code does by hand).
3. Remove every row that conflicts with a clue, and keep the clue row.

Option 1 changes the problem shape and the column count, and makes the clue set
visible to anyone inspecting the problem. Option 2 requires engine support for
"cover these columns first", which `dancing-links` does not expose and which
would tie unica to one engine.

## Decision

Option 3, implemented as `restrictToClues(problem, clues)`.

For each clue row, mark its primary and secondary columns as taken. Then keep a
row if and only if it is a clue row or it touches none of the taken columns. The
result is an ordinary `ExactCoverProblem` with the same column counts and a
subset of the rows, plus a `rowMap` to translate solutions back.

## Why it is correct

Every solution must cover each primary column of each clue exactly once. After
restriction, the clue row is the only remaining row that covers any of those
columns. So every solution contains every clue row, and conversely any solution
of the original problem that contains the clues is still a solution of the
restricted problem (none of its rows were removed, because none of them
conflict with the clues). The restriction is therefore exactly the set of
original solutions that contain the clues: no more, no fewer.

Secondary columns are handled the same way. A secondary column may be covered
at most once, so a clue that covers it excludes every other row covering it.

Two clues that share a column are rejected with an error rather than silently
producing `'none'`: conflicting clues are malformed input, not an unsolvable
puzzle, and the caller should learn which it was.

## Consequences

- The engine stays a black box. Any `ExactCoverSolver` works with clues.
- Restriction is O(rows x columns-per-row) per uniqueness check, with a typed
  array for the taken-column marks. For puzzle-sized problems this is well under
  the cost of the search itself.
- Solutions of the restricted problem have different row indices; `liftSolution`
  and the `rowMap` are the only places where that translation happens, and they
  are tested against Knuth's example.
