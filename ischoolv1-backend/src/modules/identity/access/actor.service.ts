import { Injectable } from '@nestjs/common';
import { ALL_PERMISSIONS, type Permission } from '@ischool/contracts';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { Actor, type Grant } from './actor.js';

const EMPLOYED = ['ACTIVE', 'ON_LEAVE'] as const;

@Injectable()
export class ActorService {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string): Promise<Actor | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        staff: true,
        roleAssignments: { include: { role: true } },
      },
    });
    if (!user) return null;

    const grants: Grant[] = user.roleAssignments.flatMap((assignment) => {
      // System roles (School Owner) always hold every permission, including ones added later.
      const permissions = assignment.role.isSystem
        ? ALL_PERMISSIONS
        : (assignment.role.permissions as Permission[]);
      return permissions.map((permission) => ({
        permission,
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
      }));
    });

    return new Actor(
      user.id,
      user.email,
      user.name,
      user.staff && {
        id: user.staff.id,
        staffCode: user.staff.staffCode,
        isEmployed: (EMPLOYED as readonly string[]).includes(
          user.staff.employmentStatus,
        ),
      },
      grants,
    );
  }

  async hasActiveProfile(userId: string): Promise<boolean> {
    const staff = await this.prisma.staff.count({
      where: { userId, employmentStatus: { in: [...EMPLOYED] } },
    });
    return staff > 0;
  }

  async endAllSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }
}
