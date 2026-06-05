import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';

@ApiTags('Transfers')
@ApiBearerAuth()
@Roles(Role.MANAGER)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(@Body() dto: CreateTransferDto, @CurrentUser() user: JwtUserPayload) {
    return this.transfersService.create(dto, user.id);
  }

  @Get()
  findAll() {
    return this.transfersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }
}
