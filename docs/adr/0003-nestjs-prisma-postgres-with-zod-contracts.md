# NestJS 12 + Prisma 8 + PostgreSQL, validated by shared Zod schemas

The backend runs on NestJS 12 with Prisma 8 on PostgreSQL. We stay on the same framework family as the old iSchool on purpose: the old project's problems were fat services, no tests and a weak schema, and switching tools would not have fixed any of them. Request validation uses Zod schemas from `packages/contracts` through NestJS 12's native Standard Schema support instead of `class-validator` DTOs, so one schema validates the backend request, drives the frontend form and yields the TypeScript type.

## Consequences

- No `class-validator` / `class-transformer` DTO classes. A contract is a Zod schema plus its inferred type.
- If Prisma 8 is still a release candidate when coding starts, start on Prisma 7.10 and upgrade. Prisma 8 reads a Prisma 7 PostgreSQL schema unchanged.
