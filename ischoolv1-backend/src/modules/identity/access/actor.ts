import type { Permission, RoleScopeType } from '@ischool/contracts';

export interface Grant {
  permission: Permission;
  scopeType: RoleScopeType;
  scopeId: string | null;
}

/** What a permission is being checked against. Omit for school-wide actions. */
export interface PermissionScope {
  learningAreaId?: string;
  gradeLevelId?: string;
}

export interface StaffProfile {
  id: string;
  staffCode: string;
  isEmployed: boolean;
}

/** The signed-in person behind a request: their profiles and what they may do. */
export class Actor {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly name: string,
    readonly staff: StaffProfile | null,
    readonly grants: readonly Grant[],
  ) {}

  /** Profiles that still let this user sign in. Guardian and Student join in later phases. */
  get hasActiveProfile(): boolean {
    return this.staff?.isEmployed === true;
  }

  /**
   * A school-wide grant covers every scope. A scoped grant covers only a check against
   * that same Learning Area or Grade Level, never a school-wide action.
   */
  can(permission: Permission, scope: PermissionScope = {}): boolean {
    return this.grants.some((grant) => {
      if (grant.permission !== permission) return false;
      switch (grant.scopeType) {
        case 'SCHOOL':
          return true;
        case 'LEARNING_AREA':
          return grant.scopeId === scope.learningAreaId;
        case 'GRADE_LEVEL':
          return grant.scopeId === scope.gradeLevelId;
      }
    });
  }
}
