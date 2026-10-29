# ADR-0001: Use `dancing-links` as the exact cover engine instead of writing one

Status: accepted (2026-10-29)

## Context

unica needs an exact cover engine that can enumerate solutions and stop after a
given number of them. Knuth's Algorithm X with the dancing links technique (DLX)
is the standard answer, and there are several JavaScript implementations on npm:

- `dancing-links` (TimBeyer): TypeScript types, zero dependencies, primary and
  secondary columns, `find(limit)`, struct-of-arrays layout on typed arrays, and
  an automated benchmark against the other libraries published with each release.
- `@algorithm.ts/dlx`: TypeScript, fixed-capacity API, lower-level.
- `dlxlib`: JavaScript, simpler, slower in the published comparisons.

Writing our own DLX is a few hundred lines and would be a pleasant exercise. It
would also be the part of this repository a reviewer is least able to trust,
because a solver bug shows up as a wrong uniqueness verdict, and a wrong
uniqueness verdict is exactly the failure this library exists to prevent.

## Decision

Depend on `dancing-links` and wrap it behind a one-method interface:

```ts
interface ExactCoverSolver {
  solve<T>(problem: ExactCoverProblem<T>, limit: number): Solution[];
}
```

The adapter (`DancingLinksSolver`) is the only file that imports the dependency.
Everything else in unica talks to the interface.

## Consequences

- unica has exactly one runtime dependency, and that dependency has none of its
  own. The maintenance surface is the adapter, about 60 lines.
- The engine is replaceable. A WebAssembly port, a worker-backed engine, or a
  Knuth-style "dancing cells" implementation can be adopted by implementing one
  method, and can be benchmarked against the default with the existing suite.
- unica's correctness claims rest on the engine's correctness. This is mitigated
  in the test-suite by an independent backtracking oracle that never calls the
  engine (`test/helpers/brute-force.ts`), and by fixtures with known answers
  (Knuth's worked example, the 63 fixed pentominoes, the 8 tilings of 3x20).
- A limitation inherited from the engine: constraints are rebuilt per call. For
  the clue-reduction loop this means one solver construction per uniqueness
  check. At the problem sizes puzzles have (hundreds to low thousands of rows),
  construction is a small fraction of search time; if that changes, the
  interface leaves room for an engine that supports incremental row removal.

## Alternatives considered

- **Own implementation.** Rejected for the reason above: it moves the risk to the
  place where risk is most expensive, and the "why not the existing fastest
  engine" question has no good answer.
- **`@algorithm.ts/dlx`.** Capable, but its capacity-based API would push
  bookkeeping into unica that `dancing-links` handles internally.
- **A SAT or CP solver via WebAssembly.** Overkill for exact cover, and would
  add a large binary dependency for no gain at these sizes.
