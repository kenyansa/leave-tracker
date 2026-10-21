import { Controller, Get } from '@nestjs/common';
import { CurrentUser, JwtPayload, Roles } from '../auth/decorators';
import { Role } from './user.entity';

@Controller('users')
export class UsersController {
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  @Roles(Role.Manager)
  managerPing() {
    return { ok: true };
  }
}