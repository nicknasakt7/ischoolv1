import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Me } from '@ischool/contracts';
import type { Actor } from './access/actor.js';
import { CurrentActor } from './access/decorators.js';

@ApiTags('me')
@Controller('me')
export class MeController {
  @Get()
  me(@CurrentActor() actor: Actor): Me {
    return {
      userId: actor.userId,
      email: actor.email,
      name: actor.name,
      profiles: {
        staff: actor.staff && {
          id: actor.staff.id,
          staffCode: actor.staff.staffCode,
        },
      },
      grants: [...actor.grants],
    };
  }
}
