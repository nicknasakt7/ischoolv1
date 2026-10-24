# One deployment and one database per school

We deploy a separate server and database for each school instead of running one multi-tenant system with a `schoolId` on every table. Isolating each school completely makes per-school backup, restore, data residency and PDPA requests simple, and one school's load or bug can't touch another's data. The trade-off is operational: every release has to roll out and migrate N databases. So there is exactly one codebase and one Docker image, every deployment runs the same version, and deploy plus migration are automated per school rather than done by hand.

## Consequences

- The code carries no tenant concept. The School settings exist once per database.
- A school group with several campuses that wants a combined view is not supported by this model. Each campus is its own deployment.
- Each school's database is its own managed PostgreSQL instance (DigitalOcean during the pilot), used only as plain Postgres with no provider-specific features. A nightly `pg_dump` to R2 keeps backups independent of the provider, and switching providers means `pg_dump` plus a new `DATABASE_URL`.
