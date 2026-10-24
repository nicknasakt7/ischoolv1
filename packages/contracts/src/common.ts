import { z } from 'zod';

export const idSchema = z.uuid();
export const idParamSchema = z.object({ id: idSchema });

/** A calendar date without time, e.g. "2026-05-16". */
export const dateOnlySchema = z.iso.date();

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function pageOf<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}
