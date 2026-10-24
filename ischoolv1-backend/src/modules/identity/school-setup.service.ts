import { HttpStatus, Injectable } from '@nestjs/common';
import { type CreateStaffInput, ErrorCode } from '@ischool/contracts';
import { AppException } from '../../common/http/app-exception.js';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { RolesService } from './roles/roles.service.js';
import { StaffService } from './staff/staff.service.js';

export interface SchoolSetupInput {
  nameTh: string;
  nameEn?: string;
  owner: CreateStaffInput;
}

/** First-run setup of a fresh deployment: the School, its School Owner role and first owner. */
@Injectable()
export class SchoolSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
    private readonly staff: StaffService,
    private readonly audit: AuditLogService,
  ) {}

  async initialize(input: SchoolSetupInput): Promise<{ ownerStaffId: string }> {
    if (await this.prisma.school.count()) {
      throw new AppException(
        ErrorCode.CONFLICT,
        HttpStatus.CONFLICT,
        'This deployment already has a school.',
      );
    }

    const ownerRole = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { nameTh: input.nameTh, nameEn: input.nameEn },
      });
      await this.audit.record(
        {
          actorId: null,
          action: 'school.initialized',
          entityType: 'school',
          entityId: school.id,
          after: { nameTh: input.nameTh, nameEn: input.nameEn ?? null },
        },
        tx,
      );
      return this.roles.createSchoolOwnerRole(tx);
    });

    // Creates the owner's account and emails the invitation.
    const owner = await this.staff.create(input.owner, null);
    await this.roles.assign(
      ownerRole.id,
      { userId: owner.userId, scopeType: 'SCHOOL' },
      null,
    );
    return { ownerStaffId: owner.id };
  }
}
