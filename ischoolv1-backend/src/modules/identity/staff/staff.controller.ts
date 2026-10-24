import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import {
  createStaffSchema,
  endEmploymentSchema,
  idParamSchema,
  listStaffQuerySchema,
  Permission,
  rehireStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type EndEmploymentInput,
  type ListStaffQuery,
  type RehireStaffInput,
  type Staff,
  type StaffPage,
  type UpdateStaffInput,
} from '@ischool/contracts';
import { memoryStorage } from 'multer';
import type { Actor } from '../access/actor.js';
import { CurrentActor, RequirePermission } from '../access/decorators.js';
import { MAX_PHOTO_BYTES, StaffService } from './staff.service.js';

@ApiTags('staff')
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Post()
  @RequirePermission(Permission.STAFF_MANAGE)
  create(
    @Body({ schema: createStaffSchema }) input: CreateStaffInput,
    @CurrentActor() actor: Actor,
  ): Promise<Staff> {
    return this.staff.create(input, actor.userId);
  }

  @Get()
  @RequirePermission(Permission.STAFF_READ)
  list(
    @Query({ schema: listStaffQuerySchema }) query: ListStaffQuery,
  ): Promise<StaffPage> {
    return this.staff.list(query);
  }

  @Get(':id')
  @RequirePermission(Permission.STAFF_READ)
  get(
    @Param({ schema: idParamSchema }) { id }: { id: string },
  ): Promise<Staff> {
    return this.staff.get(id);
  }

  @Patch(':id')
  @RequirePermission(Permission.STAFF_MANAGE)
  update(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @Body({ schema: updateStaffSchema }) input: UpdateStaffInput,
    @CurrentActor() actor: Actor,
  ): Promise<Staff> {
    return this.staff.update(id, input, actor.userId);
  }

  @Post(':id/end-employment')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STAFF_MANAGE)
  endEmployment(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @Body({ schema: endEmploymentSchema }) input: EndEmploymentInput,
    @CurrentActor() actor: Actor,
  ): Promise<Staff> {
    return this.staff.endEmployment(id, input, actor.userId);
  }

  @Post(':id/rehire')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STAFF_MANAGE)
  rehire(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @Body({ schema: rehireStaffSchema }) input: RehireStaffInput,
    @CurrentActor() actor: Actor,
  ): Promise<Staff> {
    return this.staff.rehire(id, input, actor.userId);
  }

  @Post(':id/invitation')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(Permission.STAFF_MANAGE)
  resendInvitation(
    @Param({ schema: idParamSchema }) { id }: { id: string },
  ): Promise<void> {
    return this.staff.resendInvitation(id);
  }

  @Put(':id/photo')
  @RequirePermission(Permission.STAFF_MANAGE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_BYTES },
    }),
  )
  replacePhoto(
    @Param({ schema: idParamSchema }) { id }: { id: string },
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<Staff> {
    return this.staff.replacePhoto(id, file);
  }
}
