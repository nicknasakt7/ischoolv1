const DAY_MS = 24 * 60 * 60 * 1000;

/** Better Auth keeps every session for this long, sliding forward once a day while it is used. */
export const SESSION_LIFETIME_DAYS = 30;
export const SESSION_REFRESH_DAYS = 1;
/** Staff see far more data than guardians or students, so an unused staff session dies sooner. */
export const STAFF_IDLE_LIMIT_DAYS = 7;

/**
 * Better Auth slides `expiresAt` to now + lifetime whenever it refreshes a session, so the
 * last refresh happened at `expiresAt - lifetime`. The session has been idle since then,
 * give or take the one-day refresh window.
 */
export function isStaffSessionIdle(expiresAt: Date, now: Date): boolean {
  return (
    now.getTime() - lastRefreshedAt(expiresAt) > STAFF_IDLE_LIMIT_DAYS * DAY_MS
  );
}

/** Whether Better Auth would slide this session's expiry forward if asked to now. */
export function isDueForRefresh(expiresAt: Date, now: Date): boolean {
  return (
    now.getTime() - lastRefreshedAt(expiresAt) >= SESSION_REFRESH_DAYS * DAY_MS
  );
}

function lastRefreshedAt(expiresAt: Date): number {
  return expiresAt.getTime() - SESSION_LIFETIME_DAYS * DAY_MS;
}
