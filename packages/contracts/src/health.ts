import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  checks: z.record(z.string(), z.enum(['up', 'down'])),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
