import { z } from 'zod';

/**
 * Every error response from the API is an RFC 9457 Problem Details object.
 * `code` is stable and machine-readable; the frontend maps it to a translated
 * message, so `title` / `detail` are for developers and logs only.
 */
export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});
export type Problem = z.infer<typeof problemSchema>;
