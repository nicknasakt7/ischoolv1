import { z } from 'zod';
import { permissionSchema, roleScopeTypeSchema } from './permissions.js';

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(permissionSchema).min(1),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema.partial();
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const roleSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(permissionSchema),
  isSystem: z.boolean(),
});
export type Role = z.infer<typeof roleSchema>;

export const assignRoleSchema = z
  .object({
    userId: z.uuid(),
    scopeType: roleScopeTypeSchema.default('SCHOOL'),
    scopeId: z.uuid().optional(),
  })
  .refine((value) => (value.scopeType === 'SCHOOL') === !value.scopeId, {
    message: 'scopeId is required for a scoped role and forbidden for SCHOOL',
    path: ['scopeId'],
  });
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const roleAssignmentSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  roleId: z.uuid(),
  roleName: z.string(),
  scopeType: roleScopeTypeSchema,
  scopeId: z.uuid().nullable(),
});
export type RoleAssignment = z.infer<typeof roleAssignmentSchema>;
