# CLAUDE.md — @rakiastudio/unica

Unique-solution puzzle generator on top of exact cover. The product is three
guarantees: **unique** (exactly one solution), **minimal** (every clue is
necessary), **reproducible** (seed recreates the puzzle). Read `README.md` for
the arguments behind each one before changing `src/core`.

## Commands

```sh
npm ci
npm run check        # lint + typecheck + test + build; identical to CI
npm test             # vitest
npm run bench        # vitest bench
npm run changeset    # one changeset per user-visible change
```

## Layout

- `src/core/` — puzzle-agnostic: exact cover model, `restrictToClues`, engine
  adapter, `classify`, `generate`, seeded RNG. Nothing in here may know what a
  sudoku is.
- `src/puzzles/<name>/` — one folder per puzzle: reduction to exact cover,
  `parse`/`format`, convenience `generate`/`solve`.
- `test/helpers/brute-force.ts` — independent oracle. Shares no code with `src/`.
- `docs/adr/` — architecture decision records. Read them before proposing to
  change what they decide.

## Non-negotiables

1. **Guarantees come with arguments.** A change that touches uniqueness,
   minimality or reproducibility updates the reasoning in `README.md` (and
   `README.ja.md`), adds or updates an ADR, and adds a property test that would
   fail if the argument were wrong.
2. **The engine does not grade itself.** A test that asserts a generated puzzle
   is unique uses the oracle in `test/helpers/brute-force.ts` or a fixture with a
   known answer. Never assert uniqueness with `classify` alone.
3. **No `any`, no non-null assertions, no `as` to silence the compiler.**
   `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are on. Handle
   `undefined` explicitly or throw `ExactCoverError` with a message naming the
   index.
4. **No new runtime dependencies** without an ADR. `dancing-links` is the only
   one (ADR-0001) and it stays behind `ExactCoverSolver`.
5. **Core stays puzzle-agnostic.** Sudoku techniques, difficulty ratings and
   notations live under `src/puzzles/sudoku/`, never in `src/core/`.
6. **No emoji anywhere** — code, comments, docs, commit messages, changesets.
   Use plain text markers (`-`, `o`, `x`) where a symbol is tempting.
7. **Conventional Commits** (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`,
   `test:`, `chore:`) and **one changeset per user-visible change**. Do not bump
   `package.json` version by hand; Changesets does it in the release PR.
8. **Keep `README.ja.md` in sync** with `README.md` for any user-facing change.
9. **Coverage stays at or above 95% statements.** Uncovered lines must be
   defensive branches, not logic.
10. **Determinism.** Any new randomness goes through `Rng` from
    `src/core/random.ts`. `Math.random` appears only in `freshSeed`.

## Adding a puzzle

Create `src/puzzles/<name>/index.ts` with a factory (`<name>(options)`) that
returns the reduction (`problem()`), `format`, and `generate`. Add: a fixture
with a known solution count (as `test/puzzles/polyomino.test.ts` does with the
3x20 rectangle), a property test through `generate`, an entry in the README
module table, and a subpath export in `package.json`.

## Adding a sudoku technique (v0.2+)

Each technique is a pure function `(state: CandidateGrid) => Step | undefined`
in `src/puzzles/sudoku/techniques/`. It must be **sound**: every placement and
every elimination it returns must be implied by the current candidates alone.
Soundness is tested against the oracle: no step may contradict the unique
solution. Techniques live in one list ordered **weakest first**; the rater
always retries from the weakest after any progress, so a puzzle's difficulty is
the strongest technique it actually needed (ADR-0003 when written).

## Working style

- Read the relevant test file before editing a source file.
- Run `npm run check` before every commit. If it fails, fix it; do not skip.
- When a task is ambiguous, stop and ask rather than guessing a design.
- Report what changed, what was verified and how, and anything left undone.
