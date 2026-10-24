import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { HealthResponse } from '@ischool/contracts';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { Public } from '../identity/access/decorators.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up. Used by the container runtime to restart a hung app. */
  @Get('live')
  live(): HealthResponse {
    return { status: 'ok', checks: {} };
  }

  /** Readiness: dependencies are reachable. Used by deploys and load balancers. */
  @Get('ready')
  async ready(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthResponse> {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(
      () => 'up' as const,
      () => 'down' as const,
    );
    const healthy = database === 'up';
    response.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: healthy ? 'ok' : 'error', checks: { database } };
  }
}
