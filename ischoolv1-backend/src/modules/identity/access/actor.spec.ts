import { Permission } from '@ischool/contracts';
import { Actor, type Grant } from './actor.js';

const MATH = '0190a000-0000-7000-8000-000000000001';
const SCIENCE = '0190a000-0000-7000-8000-000000000002';

function actorWith(grants: Grant[]) {
  return new Actor('user-1', 'a@school.th', 'A', null, grants);
}

describe('Actor.can', () => {
  it('lets a school-wide grant cover any scope', () => {
    const actor = actorWith([
      { permission: Permission.STAFF_READ, scopeType: 'SCHOOL', scopeId: null },
    ]);

    expect(actor.can(Permission.STAFF_READ)).toBe(true);
    expect(actor.can(Permission.STAFF_READ, { learningAreaId: MATH })).toBe(
      true,
    );
  });

  it('limits a Learning Area grant to that Learning Area', () => {
    const actor = actorWith([
      {
        permission: Permission.STAFF_READ,
        scopeType: 'LEARNING_AREA',
        scopeId: MATH,
      },
    ]);

    expect(actor.can(Permission.STAFF_READ, { learningAreaId: MATH })).toBe(
      true,
    );
    expect(actor.can(Permission.STAFF_READ, { learningAreaId: SCIENCE })).toBe(
      false,
    );
    expect(actor.can(Permission.STAFF_READ)).toBe(false);
  });

  it('never matches a different permission', () => {
    const actor = actorWith([
      { permission: Permission.STAFF_READ, scopeType: 'SCHOOL', scopeId: null },
    ]);

    expect(actor.can(Permission.STAFF_MANAGE)).toBe(false);
  });
});

describe('Actor.hasActiveProfile', () => {
  it('is true only for employed staff', () => {
    const employed = new Actor(
      'u',
      'e',
      'n',
      {
        id: 's',
        staffCode: 'T1',
        isEmployed: true,
      },
      [],
    );
    const resigned = new Actor(
      'u',
      'e',
      'n',
      {
        id: 's',
        staffCode: 'T1',
        isEmployed: false,
      },
      [],
    );

    expect(employed.hasActiveProfile).toBe(true);
    expect(resigned.hasActiveProfile).toBe(false);
    expect(new Actor('u', 'e', 'n', null, []).hasActiveProfile).toBe(false);
  });
});
