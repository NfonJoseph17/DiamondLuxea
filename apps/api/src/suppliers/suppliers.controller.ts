import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Suppliers')
@ApiBearerAuth()
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Roles(Role.MANAGER)
  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Roles(Role.MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }
}
