import {
  isDueForRefresh,
  isStaffSessionIdle,
  SESSION_LIFETIME_DAYS,
} from './session-policy.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-24T09:00:00Z');

function refreshedDaysAgo(days: number): Date {
  return new Date(
    now.getTime() - days * DAY_MS + SESSION_LIFETIME_DAYS * DAY_MS,
  );
}

describe('isStaffSessionIdle', () => {
  it('keeps a session refreshed within the last 7 days', () => {
    expect(isStaffSessionIdle(refreshedDaysAgo(0), now)).toBe(false);
    expect(isStaffSessionIdle(refreshedDaysAgo(6.9), now)).toBe(false);
  });

  it('ends a session untouched for more than 7 days', () => {
    expect(isStaffSessionIdle(refreshedDaysAgo(7.1), now)).toBe(true);
    expect(isStaffSessionIdle(refreshedDaysAgo(20), now)).toBe(true);
  });
});

describe('isDueForRefresh', () => {
  it('waits a full day between refreshes', () => {
    expect(isDueForRefresh(refreshedDaysAgo(0.5), now)).toBe(false);
    expect(isDueForRefresh(refreshedDaysAgo(1), now)).toBe(true);
  });
});
