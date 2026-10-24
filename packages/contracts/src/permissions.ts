import { z } from 'zod';

/**
 * Every permission the system knows. Roles are school-defined bundles of these keys.
 * Keys are `<resource>.<action>`; new ones arrive with the phase that needs them.
 */
export const Permission = {
  SCHOOL_SETTINGS_MANAGE: 'school.settings.manage',
  STAFF_READ: 'staff.read',
  STAFF_MANAGE: 'staff.manage',
  ROLE_MANAGE: 'role.manage',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS = Object.values(Permission) as Permission[];
export const permissionSchema = z.enum(ALL_PERMISSIONS);

export const roleScopeTypeSchema = z.enum([
  'SCHOOL',
  'LEARNING_AREA',
  'GRADE_LEVEL',
]);
export type RoleScopeType = z.infer<typeof roleScopeTypeSchema>;
