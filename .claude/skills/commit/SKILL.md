---
name: commit
description: Commit changes in this repo with Conventional Commits in English. Use when asked to commit, or to write or fix a commit message, branch name or PR title.
---

# Commit

Every commit follows [Conventional Commits](https://www.conventionalcommits.org/), written in English. This continues the convention the old iSchool repos aimed for (`feat(auth): Add bcrypt service, ...`), applied consistently.

## Format

```
<type>(<scope>): <Summary>

<body: why the change was made, and what the diff alone does not show>

<footer>
```

### type

| type       | Use when                                            |
| ---------- | --------------------------------------------------- |
| `feat`     | Users get a new capability                          |
| `fix`      | Wrong behaviour is corrected                        |
| `refactor` | Code structure changes, behaviour stays the same    |
| `perf`     | Faster or lighter, same behaviour                   |
| `test`     | Tests only                                          |
| `docs`     | Documentation only (README, ADR, GLOSSARY, roadmap) |
| `build`    | Dependencies, Dockerfile, build config              |
| `ci`       | GitHub Actions                                      |
| `chore`    | Other maintenance that fits none of the above       |
| `revert`   | Reverts an earlier commit                           |

### scope

The part of the repo that changed, optionally narrowed to a module named with a `GLOSSARY.md` term:

- `backend`, `frontend`, `contracts`: a package
- `backend/attendance`, `frontend/billing`: a module inside a package
- `repo`: root config (turbo, pnpm workspace, prettier, docker-compose)
- Omit the scope when a change spans several parts evenly, or for repo-wide `docs`.

### Summary

- Imperative mood, capitalised first word: `Add`, `Fix`, `Remove`, `Rename`, `Extract`, `Upgrade`.
- Says what the commit does, specific enough to find it in `git log --oneline` a year from now.
- At most 72 characters, no trailing period.
- One type and one colon only: `feat(lead): Add InterestedLead module`, never `feat:(lead ...)` or `feat(x): feat: ...`.

### body

Add one when the summary alone leaves a reviewer asking why. Lead with the reason, then what a reviewer needs: alternatives rejected, side effects, follow-ups. Bullets are fine. Wrap at 72 characters.

### footer

- Breaking change: put `!` after the scope and add `BREAKING CHANGE: <what callers must change>`.
- Issue link: `Refs: #12`.
- The `Co-Authored-By` line required by the session always comes last.

## Branches and pull requests

Trunk-based development (ADR 0006): `main` is the only long-lived branch.

- Branch from an up-to-date `main` as `<kind>/<short-kebab-description>`, where kind is `feature`, `fix`, `chore`, `docs` or `refactor`. Example: `feature/period-attendance`.
- Keep branches short-lived: a few days, merged through a PR, then deleted. Split big features into several PRs.
- PRs are squash-merged, so the PR title becomes the commit on `main` and follows the same format as a commit summary: `feat(backend/attendance): Add period attendance`. CI checks it.
- Releases are tags on `main` (`v1.3.0`), never branches.

## Steps

1. Read `git status` and the full `git diff` (staged and unstaged) until every changed file is understood.
2. Check that nothing secret is included (`.env`, keys, credentials). If something is, stop and tell the user.
3. Group changes into commits by topic: one commit is one change that could be reverted on its own. When the work spans several topics, show the user the planned list of commits first.
4. If code changed, `pnpm lint && pnpm typecheck && pnpm test` must pass before committing. Documentation-only commits skip this.
5. Stage only that commit's files by path, then commit with a heredoc so line breaks survive:

   ```bash
   git commit -F - <<'EOF'
   feat(backend): Add ...

   Body ...

   Co-Authored-By: ...
   EOF
   ```

6. Report the result with `git log --oneline` for the new commits.

## Examples

```
feat(backend/attendance): Add period attendance taken by subject teachers

Homeroom teachers only record daily attendance, so a student who comes
to school but skips a class goes unnoticed.
- Teachers with a Teaching Assignment record Period Attendance for
  their own Course Offerings
- Present in daily attendance but absent from a period notifies the
  homeroom teacher
```

```
fix(backend): Point integration tests at the throwaway database

ConfigModule.forRoot() reads the environment as soon as AppModule is
imported, which happened before useTestEnv() ran, so tests read .env
and wrote to the developer database. Test variables now live in a
Vitest setup file that runs before any import.
```

```
feat(contracts)!: Return errors as RFC 9457 Problem Details

BREAKING CHANGE: clients read the error identifier from `code` instead
of `message`, and the content type is application/problem+json.
```

```
docs: Record ADR for pg-boss over BullMQ
```
