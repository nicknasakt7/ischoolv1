import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../database/generated/prisma/client.js';

export interface AuditEntry {
  actorId: string | null;
  /** Dotted verb, e.g. "grade.updated". */
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  requestId?: string;
}

/**
 * Records changes to sensitive data. Pass the transaction client so the audit row
 * commits or rolls back together with the change it describes.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    entry: AuditEntry,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.auditLog.create({ data: entry });
  }
}
