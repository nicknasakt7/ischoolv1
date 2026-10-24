# Trunk-based development, released by tags

`main` is the only long-lived branch. Work happens on short-lived `feature/*` (or `fix/*`, `chore/*`, `docs/*`, `refactor/*`) branches that are squash-merged through a PR once CI passes and a reviewer approves. Each PR gets a preview environment. Every merge to `main` deploys to staging, and production moves only when a `v*` tag is pushed (gated by a manual approval on the GitHub `production` environment), rolling out school by school. The old iSchool used `feature → dev → main`. Its two long-lived branches drifted apart and hotfixes landed on `main` directly. Here a tag does the job the `dev → main` PR used to do, without a second branch to keep in sync.

## Consequences

- `main` must stay releasable. A broken merge is reverted first (GitHub "Revert") and fixed on a new branch.
- No tag is pushed while staging is broken.
- A feature too big for one PR is split into several small PRs, hidden behind a feature flag if users would otherwise see it half-built.
- The PR title becomes the commit on `main`, so it follows the commit format (checked in CI).
