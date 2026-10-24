import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './access/access.guard.js';
import { BetterAuthModule } from './auth/better-auth.module.js';
import { InvitationService } from './invitations/invitation.service.js';
import { MeController } from './me.controller.js';
import { RolesController } from './roles/roles.controller.js';
import { RolesService } from './roles/roles.service.js';
import { SchoolSetupService } from './school-setup.service.js';
import { StaffController } from './staff/staff.controller.js';
import { StaffService } from './staff/staff.service.js';

/** Users, sign-in, Staff, Roles and permissions. */
@Module({
  imports: [BetterAuthModule],
  controllers: [MeController, StaffController, RolesController],
  providers: [
    InvitationService,
    StaffService,
    RolesService,
    SchoolSetupService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [StaffService, RolesService, SchoolSetupService],
})
export class IdentityModule {}
