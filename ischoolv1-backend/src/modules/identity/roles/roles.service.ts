import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type AssignRoleInput,
  type CreateRoleInput,
  ErrorCode,
  type Permission,
  type Role,
  type RoleAssignment,
  type UpdateRoleInput,
} from '@ischool/contracts';
import { AppException } from '../../../common/http/app-exception.js';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service.js';
import type {
  Prisma,
  Role as RoleRecord,
} from '../../../infrastructure/database/generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';

export const SCHOOL_OWNER_ROLE_NAME = 'School Owner';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map(toContract);
  }

  async create(input: CreateRoleInput, actorId: string): Promise<Role> {
    await this.assertNameFree(input.name);
    const role = await this.prisma.$transaction(async (tx) => {
      const created = await tx.role.create({ data: input });
      await this.audit.record(
        {
          actorId,
          action: 'role.created',
          entityType: 'role',
          entityId: created.id,
          after: input,
        },
        tx,
      );
      return created;
    });
    return toContract(role);
  }

  async update(
    id: string,
    input: UpdateRoleInput,
    actorId: string,
  ): Promise<Role> {
    const before = await this.findEditable(id);
    if (input.name && input.name !== before.name) {
      await this.assertNameFree(input.name);
    }
    const role = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({ where: { id }, data: input });
      await this.audit.record(
        {
          actorId,
          action: 'role.updated',
          entityType: 'role',
          entityId: id,
          before: {
            name: before.name,
            description: before.description,
            permissions: before.permissions,
          },
          after: input,
        },
        tx,
      );
      return updated;
    });
    return toContract(role);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const role = await this.findEditable(id);
    if (await this.prisma.roleAssignment.count({ where: { roleId: id } })) {
      throw new AppException(
        ErrorCode.ROLE_IN_USE,
        HttpStatus.CONFLICT,
        'Remove every assignment of this role first.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.role.delete({ where: { id } });
      await this.audit.record(
        {
          actorId,
          action: 'role.deleted',
          entityType: 'role',
          entityId: id,
          before: { name: role.name, permissions: role.permissions },
        },
        tx,
      );
    });
  }

  async listAssignments(roleId: string): Promise<RoleAssignment[]> {
    await this.find(roleId);
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { roleId },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    });
    return assignments.map(toAssignmentContract);
  }

  async assign(
    roleId: string,
    input: AssignRoleInput,
    actorId: string | null,
  ): Promise<RoleAssignment> {
    await this.find(roleId);
    if (!(await this.prisma.user.count({ where: { id: input.userId } }))) {
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    const scopeId = input.scopeId ?? null;
    const duplicate = await this.prisma.roleAssignment.count({
      where: {
        roleId,
        userId: input.userId,
        scopeType: input.scopeType,
        scopeId,
      },
    });
    if (duplicate) {
      throw new AppException(ErrorCode.CONFLICT, HttpStatus.CONFLICT);
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roleAssignment.create({
        data: {
          roleId,
          userId: input.userId,
          scopeType: input.scopeType,
          scopeId,
        },
        include: { role: true },
      });
      await this.audit.record(
        {
          actorId,
          action: 'role_assignment.created',
          entityType: 'role_assignment',
          entityId: created.id,
          after: {
            roleId,
            userId: input.userId,
            scopeType: input.scopeType,
            scopeId,
          },
        },
        tx,
      );
      return created;
    });
    return toAssignmentContract(assignment);
  }

  async revoke(assignmentId: string, actorId: string): Promise<void> {
    const assignment = await this.prisma.roleAssignment.findUnique({
      where: { id: assignmentId },
      include: { role: true },
    });
    if (!assignment) {
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (assignment.role.isSystem) {
      await this.assertNotLastSchoolOwner(assignment.userId);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.roleAssignment.delete({ where: { id: assignmentId } });
      await this.audit.record(
        {
          actorId,
          action: 'role_assignment.deleted',
          entityType: 'role_assignment',
          entityId: assignmentId,
          before: {
            roleId: assignment.roleId,
            userId: assignment.userId,
            scopeType: assignment.scopeType,
            scopeId: assignment.scopeId,
          },
        },
        tx,
      );
    });
  }

  /**
   * A school must never lock itself out: refuses when `userId` is the only employed
   * holder of the School Owner role.
   */
  async assertNotLastSchoolOwner(userId: string): Promise<void> {
    const owners = await this.prisma.roleAssignment.findMany({
      where: {
        role: { isSystem: true },
        user: { staff: { employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] } } },
      },
      select: { userId: true },
    });
    const ownerIds = new Set(owners.map((owner) => owner.userId));
    if (ownerIds.has(userId) && ownerIds.size === 1) {
      throw new AppException(
        ErrorCode.LAST_SCHOOL_OWNER,
        HttpStatus.CONFLICT,
        'Assign another School Owner first.',
      );
    }
  }

  /** Used once, by `school:init`. */
  async createSchoolOwnerRole(
    tx: Prisma.TransactionClient,
  ): Promise<RoleRecord> {
    return tx.role.create({
      data: {
        name: SCHOOL_OWNER_ROLE_NAME,
        description:
          'Every permission. Created with the school; cannot be edited.',
        permissions: [],
        isSystem: true,
      },
    });
  }

  private async find(id: string): Promise<RoleRecord> {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role)
      throw new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
    return role;
  }

  private async findEditable(id: string): Promise<RoleRecord> {
    const role = await this.find(id);
    if (role.isSystem) {
      throw new AppException(ErrorCode.SYSTEM_ROLE_LOCKED, HttpStatus.CONFLICT);
    }
    return role;
  }

  private async assertNameFree(name: string): Promise<void> {
    if (await this.prisma.role.count({ where: { name } })) {
      throw new AppException(ErrorCode.ROLE_NAME_TAKEN, HttpStatus.CONFLICT);
    }
  }
}

function toContract(role: RoleRecord): Role {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions as Permission[],
    isSystem: role.isSystem,
  };
}

function toAssignmentContract(
  assignment: Prisma.RoleAssignmentGetPayload<{ include: { role: true } }>,
): RoleAssignment {
  return {
    id: assignment.id,
    userId: assignment.userId,
    roleId: assignment.roleId,
    roleName: assignment.role.name,
    scopeType: assignment.scopeType,
    scopeId: assignment.scopeId,
  };
}
