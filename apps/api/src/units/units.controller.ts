import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Units')
@ApiBearerAuth()
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Roles(Role.MANAGER)
  @Post()
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Get()
  findAll() {
    return this.unitsService.findAll();
  }

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Roles(Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Roles(Role.MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
