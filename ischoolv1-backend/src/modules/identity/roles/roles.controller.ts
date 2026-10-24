import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ALL_PERMISSIONS,
  assignRoleSchema,
  createRoleSchema,
  idParamSchema,
  Permission,
  updateRoleSchema,
  type AssignRoleInput,
  type CreateRoleInput,
  type Role,
  type RoleAssignment,
  type UpdateRoleInput,
} from '@ischool/contracts';
import type { Actor } from '../access/actor.js';
import { CurrentActor, RequirePermission } from '../access/decorators.js';
import { RolesService } from './roles.service.js';

@ApiTags('roles')
@Controller()
@RequirePermission(Permission.ROLE_MANAGE)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** The permission catalog, for building the role editor. */
  @Get('permissions')
  permissions(): Permission[] {
    return ALL_PERMISSIONS;
  }

  @Get('roles')
  list(): Promise<Role[]> {
    return this.roles.list();
  }

  @Post('roles')
  create(
    @Body({ schema: createRoleSchema }) input: CreateRoleInput,
    @CurrentActor() actor: Actor,
  ): Promise<Role> {
    return this.roles.create(input, actor.userId);
  }

  @Patch('roles/:id')
  update(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @Body({ schema: updateRoleSchema }) input: UpdateRoleInput,
    @CurrentActor() actor: Actor,
  ): Promise<Role> {
    return this.roles.update(id, input, actor.userId);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.roles.remove(id, actor.userId);
  }

  @Get('roles/:id/assignments')
  listAssignments(
    @Param({ schema: idParamSchema }) { id }: { id: string },
  ): Promise<RoleAssignment[]> {
    return this.roles.listAssignments(id);
  }

  @Post('roles/:id/assignments')
  assign(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @Body({ schema: assignRoleSchema }) input: AssignRoleInput,
    @CurrentActor() actor: Actor,
  ): Promise<RoleAssignment> {
    return this.roles.assign(id, input, actor.userId);
  }

  @Delete('role-assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.roles.revoke(id, actor.userId);
  }
}
