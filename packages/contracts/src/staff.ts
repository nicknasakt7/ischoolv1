import { z } from 'zod';
import { dateOnlySchema, pageOf, pageQuerySchema } from './common.js';

export const employmentStatusSchema = z.enum([
  'ACTIVE',
  'ON_LEAVE',
  'RESIGNED',
  'RETIRED',
]);
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;

export const employmentEndReasonSchema = z.enum(['RESIGNED', 'RETIRED']);

const optionalText = z.string().trim().min(1).max(200).optional();

export const createStaffSchema = z.object({
  email: z.email().trim().toLowerCase(),
  staffCode: z.string().trim().min(1).max(30),
  title: optionalText,
  firstNameTh: z.string().trim().min(1).max(100),
  lastNameTh: z.string().trim().min(1).max(100),
  firstNameEn: optionalText,
  lastNameEn: optionalText,
  nickname: optionalText,
  phone: optionalText,
  position: optionalText,
  startDate: dateOnlySchema,
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = createStaffSchema
  .omit({ email: true, startDate: true })
  .partial();
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const listStaffQuerySchema = pageQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: employmentStatusSchema.optional(),
});
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;

export const endEmploymentSchema = z.object({
  endDate: dateOnlySchema,
  reason: employmentEndReasonSchema,
});
export type EndEmploymentInput = z.infer<typeof endEmploymentSchema>;

export const rehireStaffSchema = z.object({ startDate: dateOnlySchema });
export type RehireStaffInput = z.infer<typeof rehireStaffSchema>;

export const employmentPeriodSchema = z.object({
  startDate: dateOnlySchema,
  endDate: dateOnlySchema.nullable(),
  endReason: employmentEndReasonSchema.nullable(),
});

export const staffSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  email: z.email(),
  staffCode: z.string(),
  title: z.string().nullable(),
  firstNameTh: z.string(),
  lastNameTh: z.string(),
  firstNameEn: z.string().nullable(),
  lastNameEn: z.string().nullable(),
  nickname: z.string().nullable(),
  phone: z.string().nullable(),
  position: z.string().nullable(),
  /** Short-lived signed URL, or null when no photo is set. */
  photoUrl: z.string().nullable(),
  employmentStatus: employmentStatusSchema,
  employmentPeriods: z.array(employmentPeriodSchema),
  /** False until the invitation has been accepted (a password was set). */
  hasSignedIn: z.boolean(),
});
export type Staff = z.infer<typeof staffSchema>;

export const staffPageSchema = pageOf(staffSchema);
export type StaffPage = z.infer<typeof staffPageSchema>;
