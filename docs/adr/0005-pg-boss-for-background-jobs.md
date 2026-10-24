# pg-boss on PostgreSQL for background jobs, not BullMQ + Redis

Background and scheduled work (AI insights, email, PDF generation, bulk invoicing, remediation deadlines, attendance alerts) runs on pg-boss, which keeps its queue in the school's existing PostgreSQL database. BullMQ is the more common choice, but it needs a Redis instance. Under one-deployment-per-school (ADR 0001), that would mean an extra stateful service to run and back up for every school. A single school's job volume is far below what a Postgres-backed queue handles comfortably.
