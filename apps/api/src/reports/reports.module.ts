import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DefaultLocationModule } from '../common/default-location.module';

@Module({
  imports: [PrismaModule, DefaultLocationModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
