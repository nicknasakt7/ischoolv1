import { z } from 'zod';
import { permissionSchema, roleScopeTypeSchema } from './permissions.js';

/** Who is signed in: the frontend builds navigation and profile switching from this. */
export const meSchema = z.object({
  userId: z.uuid(),
  email: z.email(),
  name: z.string(),
  profiles: z.object({
    staff: z.object({ id: z.uuid(), staffCode: z.string() }).nullable(),
  }),
  grants: z.array(
    z.object({
      permission: permissionSchema,
      scopeType: roleScopeTypeSchema,
      scopeId: z.uuid().nullable(),
    }),
  ),
});
export type Me = z.infer<typeof meSchema>;
