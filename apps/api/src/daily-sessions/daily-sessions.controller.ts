import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DailySessionsService } from './daily-sessions.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';

@ApiTags('Daily Sessions')
@ApiBearerAuth()
@Controller('daily-sessions')
export class DailySessionsController {
  constructor(private readonly dailySessionsService: DailySessionsService) {}

  @Roles(Role.MANAGER, Role.CASHIER)
  @Post('open')
  open(@Body() dto: OpenSessionDto, @CurrentUser() user: JwtUserPayload) {
    return this.dailySessionsService.open(dto, user.id);
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Post(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.dailySessionsService.close(id, user.id);
  }

  @Roles(Role.MANAGER)
  @Get()
  findAll(@Query('status') status?: string) {
    return this.dailySessionsService.findAll({ status });
  }

  @Roles(Role.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dailySessionsService.findOne(id);
  }
}
