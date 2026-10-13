# Agent notes

TypeScript **GitHub Action** that sends events and metrics to Datadog (`action.yml` + `src/`).

- **Build:** `npm run build` (TypeScript → `lib/`)
- **Test:** `npm test`
- **Lint / format:** `npm run lint`, `npm run format-check`

Source lives under `src/`; tests under `__tests__/`.

## Release process

Releases run from the manual `release` workflow (`.github/workflows/release.yml`). Do not tag or push by hand.

To release a new version of this action:

- Make sure `main` has the built `dist/` committed. The workflow does not build.
- Ask which version number to bump: bugfix, minor or major
- Ask the user to confirm before you start the run
- Start it: `gh workflow run release.yml --ref main -f bump=BUGFIX` (or `MINOR`, `MAJOR`)

The workflow does the rest:

- It stops if `HEAD` on `main` already has a version tag
- It tags `HEAD` as `vX.Y.Z`, based on the latest `vX.Y.Z` tag
- It moves the `vX` tag to `HEAD`. This tag always points to the latest release of that major version. It is force-pushed.
- It creates the GitHub release with generated notes

### Known problem

The workflow pushes the tags before it creates the GitHub release. If the release step fails, the tags are already on the remote. A re-run then stops at the "HEAD is already tagged" check.

To recover, do one of these by hand:

- Delete the new `vX.Y.Z` tag on the remote, then run the workflow again
- Create the GitHub release for the existing tag yourself

A better fix would let a re-run finish a missing release for the tag already on `HEAD`.
