import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  type CreateStaffInput,
  type EndEmploymentInput,
  ErrorCode,
  type ListStaffQuery,
  type RehireStaffInput,
  type Staff,
  type StaffPage,
  type UpdateStaffInput,
} from '@ischool/contracts';
import { AppException } from '../../../common/http/app-exception.js';
import { fromDateOnly, toDateOnly } from '../../../common/date-only.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import type { Prisma } from '../../../infrastructure/database/generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import {
  FILE_STORAGE,
  type FileStorage,
} from '../../../infrastructure/storage/file-storage.js';
import { ActorService } from '../access/actor.service.js';
import { InvitationService } from '../invitations/invitation.service.js';
import { RolesService } from '../roles/roles.service.js';

const staffInclude = {
  user: { include: { _count: { select: { accounts: true } } } },
  employmentPeriods: { orderBy: { startDate: 'asc' } },
} satisfies Prisma.StaffInclude;

type StaffRecord = Prisma.StaffGetPayload<{ include: typeof staffInclude }>;

const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly invitations: InvitationService,
    private readonly actors: ActorService,
    private readonly roles: RolesService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  /** Creates the User and Staff profile, then emails an invitation to set a password. */
  async create(
    input: CreateStaffInput,
    actorId: string | null,
  ): Promise<Staff> {
    const { email, startDate, ...profile } = input;
    await this.assertUnique(email, profile.staffCode);

    const staff = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: `${profile.firstNameTh} ${profile.lastNameTh}` },
      });
      const created = await tx.staff.create({
        data: {
          ...profile,
          userId: user.id,
          employmentPeriods: { create: { startDate: fromDateOnly(startDate) } },
        },
        include: staffInclude,
      });
      await this.audit.record(
        {
          actorId,
          action: 'staff.created',
          entityType: 'staff',
          entityId: created.id,
          after: { email, ...profile, startDate },
        },
        tx,
      );
      return created;
    });

    await this.invitations.invite(staff.userId);
    return this.toContract(staff);
  }

  async list(query: ListStaffQuery): Promise<StaffPage> {
    const where: Prisma.StaffWhereInput = {
      employmentStatus: query.status,
      ...(query.search && {
        OR: [
          { staffCode: { contains: query.search, mode: 'insensitive' } },
          { firstNameTh: { contains: query.search, mode: 'insensitive' } },
          { lastNameTh: { contains: query.search, mode: 'insensitive' } },
          { firstNameEn: { contains: query.search, mode: 'insensitive' } },
          { lastNameEn: { contains: query.search, mode: 'insensitive' } },
          { nickname: { contains: query.search, mode: 'insensitive' } },
          { user: { email: { contains: query.search, mode: 'insensitive' } } },
        ],
      }),
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.staff.findMany({
        where,
        include: staffInclude,
        orderBy: { staffCode: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.staff.count({ where }),
    ]);
    return {
      items: await Promise.all(
        records.map((record) => this.toContract(record)),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(id: string): Promise<Staff> {
    return this.toContract(await this.find(id));
  }

  async update(
    id: string,
    input: UpdateStaffInput,
    actorId: string,
  ): Promise<Staff> {
    const before = await this.find(id);
    if (input.staffCode && input.staffCode !== before.staffCode) {
      await this.assertUnique(null, input.staffCode);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.update({
        where: { id },
        data: input,
        include: staffInclude,
      });
      if (input.firstNameTh || input.lastNameTh) {
        await tx.user.update({
          where: { id: staff.userId },
          data: { name: `${staff.firstNameTh} ${staff.lastNameTh}` },
        });
      }
      await this.audit.record(
        {
          actorId,
          action: 'staff.updated',
          entityType: 'staff',
          entityId: id,
          before: pick(before, Object.keys(input)),
          after: input,
        },
        tx,
      );
      return staff;
    });
    return this.toContract(updated);
  }

  /** Ends the open Employment Period; the person is signed out everywhere at once. */
  async endEmployment(
    id: string,
    input: EndEmploymentInput,
    actorId: string,
  ): Promise<Staff> {
    const staff = await this.find(id);
    const open = staff.employmentPeriods.find((period) => !period.endDate);
    if (!open || !['ACTIVE', 'ON_LEAVE'].includes(staff.employmentStatus)) {
      throw new AppException(ErrorCode.NOT_EMPLOYED, HttpStatus.CONFLICT);
    }
    if (input.endDate < toDateOnly(open.startDate)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'The end date is before the start of employment.',
        { endDate: ['Must not be before the start date'] },
      );
    }
    await this.roles.assertNotLastSchoolOwner(staff.userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.employmentPeriod.update({
        where: { id: open.id },
        data: { endDate: fromDateOnly(input.endDate), endReason: input.reason },
      });
      const result = await tx.staff.update({
        where: { id },
        data: { employmentStatus: input.reason },
        include: staffInclude,
      });
      await this.audit.record(
        {
          actorId,
          action: 'staff.employment_ended',
          entityType: 'staff',
          entityId: id,
          before: { employmentStatus: staff.employmentStatus },
          after: { employmentStatus: input.reason, endDate: input.endDate },
        },
        tx,
      );
      return result;
    });
    await this.actors.endAllSessions(staff.userId);
    return this.toContract(updated);
  }

  async rehire(
    id: string,
    input: RehireStaffInput,
    actorId: string,
  ): Promise<Staff> {
    const staff = await this.find(id);
    if (!['RESIGNED', 'RETIRED'].includes(staff.employmentStatus)) {
      throw new AppException(ErrorCode.ALREADY_EMPLOYED, HttpStatus.CONFLICT);
    }
    const lastEnd = staff.employmentPeriods.at(-1)?.endDate;
    if (lastEnd && input.startDate <= toDateOnly(lastEnd)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'A new period must start after the previous one ended.',
        { startDate: ['Must be after the previous end date'] },
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.staff.update({
        where: { id },
        data: {
          employmentStatus: 'ACTIVE',
          employmentPeriods: {
            create: { startDate: fromDateOnly(input.startDate) },
          },
        },
        include: staffInclude,
      });
      await this.audit.record(
        {
          actorId,
          action: 'staff.rehired',
          entityType: 'staff',
          entityId: id,
          before: { employmentStatus: staff.employmentStatus },
          after: { employmentStatus: 'ACTIVE', startDate: input.startDate },
        },
        tx,
      );
      return result;
    });
    return this.toContract(updated);
  }

  async resendInvitation(id: string): Promise<void> {
    const staff = await this.find(id);
    await this.invitations.invite(staff.userId);
  }

  /** Stores the new photo, then deletes the previous one. */
  async replacePhoto(
    id: string,
    file: { buffer: Uint8Array; mimetype: string; size: number } | undefined,
  ): Promise<Staff> {
    const extension = file && PHOTO_TYPES[file.mimetype];
    if (!file || !extension || file.size > MAX_PHOTO_BYTES) {
      throw new AppException(
        ErrorCode.UNSUPPORTED_FILE,
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Photos must be JPEG, PNG or WebP and at most 5 MB.',
      );
    }
    const staff = await this.find(id);
    const key = `staff/${id}/photo-${randomUUID()}.${extension}`;
    await this.storage.put(key, file.buffer, file.mimetype);

    const updated = await this.prisma.staff.update({
      where: { id },
      data: { photoKey: key },
      include: staffInclude,
    });
    if (staff.photoKey) {
      await this.storage.delete(staff.photoKey).catch((error: unknown) => {
        // The new photo is already live; an orphaned old file is only a storage cost.
        this.logger.warn(
          { error, key: staff.photoKey },
          'Old photo not deleted',
        );
      });
    }
    return this.toContract(updated);
  }

  private async find(id: string): Promise<StaffRecord> {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: staffInclude,
    });
    if (!staff)
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    return staff;
  }

  private async assertUnique(
    email: string | null,
    staffCode: string,
  ): Promise<void> {
    if (email && (await this.prisma.user.count({ where: { email } }))) {
      throw new AppException(ErrorCode.EMAIL_TAKEN, HttpStatus.CONFLICT);
    }
    if (await this.prisma.staff.count({ where: { staffCode } })) {
      throw new AppException(ErrorCode.STAFF_CODE_TAKEN, HttpStatus.CONFLICT);
    }
  }

  private async toContract(staff: StaffRecord): Promise<Staff> {
    return {
      id: staff.id,
      userId: staff.userId,
      email: staff.user.email,
      staffCode: staff.staffCode,
      title: staff.title,
      firstNameTh: staff.firstNameTh,
      lastNameTh: staff.lastNameTh,
      firstNameEn: staff.firstNameEn,
      lastNameEn: staff.lastNameEn,
      nickname: staff.nickname,
      phone: staff.phone,
      position: staff.position,
      photoUrl: staff.photoKey
        ? await this.storage.signedDownloadUrl(staff.photoKey)
        : null,
      employmentStatus: staff.employmentStatus,
      employmentPeriods: staff.employmentPeriods.map((period) => ({
        startDate: toDateOnly(period.startDate),
        endDate: period.endDate && toDateOnly(period.endDate),
        endReason: period.endReason,
      })),
      hasSignedIn: staff.user._count.accounts > 0,
    };
  }
}

function pick<T extends object>(
  source: T,
  keys: string[],
): Prisma.InputJsonObject {
  return Object.fromEntries(
    keys.map((key) => [key, (source as Record<string, unknown>)[key] ?? null]),
  ) as Prisma.InputJsonObject;
}
