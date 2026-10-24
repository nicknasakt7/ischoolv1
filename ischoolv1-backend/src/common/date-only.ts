/** "2026-05-16" ↔ the Date Prisma uses for a `@db.Date` column (midnight UTC). */
export function fromDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
