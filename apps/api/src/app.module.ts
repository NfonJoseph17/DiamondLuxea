import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { DefaultLocationModule } from './common/default-location.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { TransfersModule } from './transfers/transfers.module';
import { AdjustmentsModule } from './adjustments/adjustments.module';
import { DailySessionsModule } from './daily-sessions/daily-sessions.module';
import { ReportsModule } from './reports/reports.module';
import { UnitsModule } from './units/units.module';
import { ExpendituresModule } from './expenditures/expenditures.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    DefaultLocationModule,
    AuthModule,
    UsersModule,
    HealthModule,
    ProductsModule,
    SuppliersModule,
    InventoryModule,
    PurchasesModule,
    SalesModule,
    TransfersModule,
    AdjustmentsModule,
    DailySessionsModule,
    ReportsModule,
    UnitsModule,
    ExpendituresModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
