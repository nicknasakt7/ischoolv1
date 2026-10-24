# Better Auth in the backend with database sessions over httpOnly cookies

Authentication lives in one place: Better Auth inside the NestJS backend, with sessions stored in PostgreSQL and sent as an httpOnly cookie. The old project ran two session systems side by side (a NextAuth session wrapping a self-signed 3-hour JWT from Nest). Their expiries drifted apart, the token had to be threaded by hand through about 80 call sites, and a disabled account kept working until its JWT expired. With a database session, disabling a Staff account or ending a session takes effect on the next request. We rejected Auth.js because it is built around the Next.js side and has been in security-patch-only mode since its maintainers joined Better Auth in 2025.

## Consequences

- Self sign-up is disabled. Every account comes from an invitation or is created by the school (password always; Google optional per school, domain-restricted for Staff and students).
- Frontend and backend of a school must share a parent domain (e.g. `school-a.example.app` and `api.school-a.example.app`) so the cookie is sent without third-party-cookie problems.
