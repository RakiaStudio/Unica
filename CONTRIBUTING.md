# Contributing

## Setup

```sh
git clone https://github.com/RakiaStudio/Unica.git
cd Unica
npm ci
npm run check   # lint + typecheck + test + build; this is what CI runs
```

Node 22 is used for development (`.nvmrc`); the package supports Node 20+.

## Commands

| Command                 | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm test`              | Run the test-suite once                         |
| `npm run test:watch`    | Watch mode                                      |
| `npm run test:coverage` | Coverage report (v8)                            |
| `npm run bench`         | Benchmarks (`vitest bench`)                     |
| `npm run lint`          | ESLint with type-aware rules; `any` is an error |
| `npm run typecheck`     | `tsc --noEmit` over src, test and bench         |
| `npm run format`        | Prettier                                        |
| `npm run build`         | Emit `dist/` (ESM + declarations)               |

## Ground rules

- **Guarantees come with arguments.** If a change affects uniqueness,
  minimality or reproducibility, update the reasoning in `README.md` or add an
  ADR in `docs/adr/`, and add a property test that would fail if the argument
  were wrong.
- **The engine does not grade itself.** Tests that assert a generated puzzle is
  unique must use the independent oracle in `test/helpers/brute-force.ts` or a
  fixture with a known answer.
- **No `any`, no non-null assertions.** `noUncheckedIndexedAccess` is on; handle
  the `undefined` case or throw an `ExactCoverError` with a message that names
  the index.
- **Adding a puzzle** means adding a reduction under `src/puzzles/<name>/` with
  its own `format`/`parse`, a fixture with a known solution count, and a
  property test through `generate`.

## Repository settings the release workflow needs

- Settings > Actions > General > Workflow permissions: enable "Allow GitHub
  Actions to create and approve pull requests" (the organization must allow it
  first). Without it, `release.yml` cannot open the version PR.
- Branch protection on `main`: require the CI checks, but do not enable
  "Include administrators". The version PR is opened with `GITHUB_TOKEN`, which
  does not trigger CI, so an administrator merges it; `prepublishOnly` runs the
  full check before anything is published.
- npm trusted publishing, configured on npmjs.com rather than in this
  repository: the `@rakiastudio/unica` package settings list a Trusted Publisher
  for GitHub Actions with organization `RakiaStudio`, repository `Unica` and
  workflow `release.yml`, allowed to run `npm publish`. No npm token or
  `NPM_TOKEN` secret is used.

## Commits and releases

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `chore:`. Pull
  requests are checked by commitlint.
- Every user-visible change needs a changeset: `npm run changeset`. The release
  workflow opens a "version packages" PR; merging it publishes to npm with
  provenance.
