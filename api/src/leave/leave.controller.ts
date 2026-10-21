import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CurrentUser, JwtPayload } from '../auth/decorators';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveService } from './leave.service';
import { Roles } from '../auth/decorators';
import { Role } from '../users/user.entity';
import { LeaveStatus } from './leave-request.entity';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLeaveDto) {
    return this.leave.create(user.sub, dto);
  }

  @Get('me')
  mine(@CurrentUser() user: JwtPayload) {
    return this.leave.findMine(user.sub);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leave.cancel(id, user.sub);
  }

  @Get('balance')
  balance(
    @CurrentUser() user: JwtPayload,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.leave.balance(user.sub, year);
  }

  @Get('pending')
  @Roles(Role.Manager)
  pending(@CurrentUser() user: JwtPayload) {
    return this.leave.findPendingForManager(user.sub);
  }

  @Patch(':id/approve')
  @Roles(Role.Manager)
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leave.decide(id, user.sub, LeaveStatus.Approved);
  }

  @Patch(':id/reject')
  @Roles(Role.Manager)
  reject(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leave.decide(id, user.sub, LeaveStatus.Rejected);
  }
}
