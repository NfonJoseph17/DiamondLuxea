import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';

@ApiTags('Purchases')
@ApiBearerAuth()
@Roles(Role.MANAGER, Role.CASHIER)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: JwtUserPayload) {
    return this.purchasesService.create(dto, user.id);
  }

  @Get()
  findAll() {
    return this.purchasesService.findAll();
  }

  @Get('last-price')
  getLastPrice(
    @Query('supplierId') supplierId: string,
    @Query('productId') productId: string,
  ) {
    return this.purchasesService.getLastPriceForSupplier(supplierId, productId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreatePurchaseDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.purchasesService.update(id, dto, user.id);
  }
}
