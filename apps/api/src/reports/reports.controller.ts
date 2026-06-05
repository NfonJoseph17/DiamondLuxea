import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(Role.MANAGER, Role.CASHIER)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tzOffset') tzOffset?: string,
    @Query('payment') payment?: string,
  ) {
    return this.reportsService.getSummary(
      from,
      to,
      tzOffset ? parseInt(tzOffset, 10) : undefined,
      payment,
    );
  }

  @Get('expenditures')
  getExpenditureReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tzOffset') tzOffset?: string,
  ) {
    return this.reportsService.getExpenditureReport(
      from,
      to,
      tzOffset ? parseInt(tzOffset, 10) : undefined,
    );
  }

  @Get('sales')
  getSalesReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tzOffset') tzOffset?: string,
    @Query('payment') payment?: string,
  ) {
    return this.reportsService.getSalesReport(
      from,
      to,
      tzOffset ? parseInt(tzOffset, 10) : undefined,
      payment,
    );
  }

  @Get('purchases')
  getPurchasesReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tzOffset') tzOffset?: string,
  ) {
    return this.reportsService.getPurchasesReport(from, to, tzOffset ? parseInt(tzOffset, 10) : undefined);
  }

  @Get('stock-movements')
  getStockMovementsReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getStockMovementsReport(from, to);
  }
}
