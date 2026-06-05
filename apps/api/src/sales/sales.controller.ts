import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSalePaymentDto } from './dto/update-sale-payment.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: JwtUserPayload) {
    return this.salesService.create(dto, user.id);
  }

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Get()
  findAll(@CurrentUser() user: JwtUserPayload) {
    return this.salesService.findAll(user.id, user.role as Role);
  }

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.salesService.findOne(id, user.id, user.role as Role);
  }

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Patch(':id/payment')
  updatePayment(
    @Param('id') id: string,
    @Body() dto: UpdateSalePaymentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.salesService.updatePayment(id, dto, user.id, user.role as Role);
  }

  @Roles(Role.MANAGER, Role.CASHIER, Role.SALES)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.salesService.update(id, dto, user.id, user.role as Role);
  }
}
