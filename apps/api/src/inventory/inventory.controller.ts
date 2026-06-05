import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Roles(Role.MANAGER, Role.CASHIER)
  @Get('balances')
  findAllBalances() {
    return this.inventoryService.findAllBalances({});
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Get('balances/:productId')
  findBalancesByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findBalancesByProduct(productId);
  }

  @Roles(Role.MANAGER)
  @Get('transactions')
  findAllTransactions(
    @Query('productId') productId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.findAllTransactions({ productId, limit });
  }

  @Roles(Role.MANAGER)
  @Get('transactions/:productId')
  findTransactionsByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findTransactionsByProduct(productId);
  }
}
