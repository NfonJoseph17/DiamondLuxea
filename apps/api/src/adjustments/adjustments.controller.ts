import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdjustmentsService } from './adjustments.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';

@ApiTags('Adjustments')
@ApiBearerAuth()
@Roles(Role.MANAGER, Role.CASHIER)
@Controller('adjustments')
export class AdjustmentsController {
  constructor(private readonly adjustmentsService: AdjustmentsService) {}

  @Post()
  create(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: JwtUserPayload) {
    return this.adjustmentsService.create(dto, user.id);
  }

  @Get()
  findAll() {
    return this.adjustmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adjustmentsService.findOne(id);
  }
}
