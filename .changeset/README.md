# Changesets

Every user-facing change ships with a changeset. Run `npm run changeset`, pick the bump
(`patch` / `minor` / `major`), and describe the change for the CHANGELOG. The release
workflow turns accumulated changesets into a "version packages" PR; merging that PR
publishes to npm with provenance.

Commit messages follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`,
`test:`, `chore:`), enforced on pull requests by commitlint in CI.
