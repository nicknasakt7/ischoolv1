# iSchool v1

School management system: pnpm + Turborepo monorepo with `ischoolv1-backend` (NestJS 12, Prisma 7, PostgreSQL), `ischoolv1-frontend` (not started) and `packages/contracts` (Zod schemas shared by both). Scripts live in each `package.json`.

## Before you change anything

- **Domain words**: use the terms in [GLOSSARY.md](GLOSSARY.md) for code names, routes and tables (`Section`, not `Classroom`; `Guardian`, not `Parent`). If a concept has no term there, ask before naming it.
- **Architecture**: read the ADRs in [docs/adr/](docs/adr/) before touching tenancy, auth, jobs, storage or the stack. Changing one of those decisions means writing a new ADR.
- **Commits, branches, PRs**: use the `commit` skill. `main` is the only long-lived branch, and releases are `v*` tags (ADR 0006).
- **What to build next**: [docs/backend-roadmap.md](docs/backend-roadmap.md). Environments and hosting: [docs/deployment.md](docs/deployment.md).

## Backend conventions

- ESM with `nodenext`: relative imports end in `.js`.
- Request and response shapes are Zod schemas in `packages/contracts`. Controllers validate with `@Body({ schema })` / `@Query({ schema })`, and Swagger documents them automatically. Rebuild contracts (`pnpm build`) after editing them.
- Errors: throw `AppException` with an `ErrorCode` from contracts. Every error reaches the client as RFC 9457 Problem Details. `code` is the contract the frontend translates, so add new codes to contracts.
- Config comes from `AppConfigService`, backed by `src/config/env.schema.ts`. A new variable goes into the schema and into `.env.example`.
- Prisma schema: snake_case in the database (`@@map` / `@map`), UUIDv7 ids, `timestamptz`. The generated client is in `src/infrastructure/database/generated` (gitignored, made by `prisma generate`).
- Changes to sensitive data (grades, conduct, money, statuses, permissions) call `AuditLogService.record(entry, tx)` inside the same transaction as the change.
- Files go through the `FILE_STORAGE` token (`FileStorage` interface), never an S3 client directly. Background work goes through `JobQueue`.
- `DATABASE_URL` is app traffic (may be pooled). `DATABASE_DIRECT_URL` is for migrations and pg-boss, which must not go through a transaction pooler.

## Tests

- Unit tests: `src/**/*.spec.ts`. Domain rules (grade calculation, GPA, placement) are pure functions tested here.
- Integration tests: `test/**/*.int-spec.ts`, against a real PostgreSQL that Testcontainers starts per run. Test env vars are set in `test/setup/env.setup.ts`, before `AppModule` is imported, so tests never touch the developer's database. Boot the app with `createTestApp()`.

## Local services

`pnpm db:up` starts PostgreSQL on host port **5433** (5432 is left free for a locally installed PostgreSQL), RustFS (S3) on 9000/9001 and Mailpit on 8025.
