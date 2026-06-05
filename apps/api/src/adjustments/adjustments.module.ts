import { Module } from '@nestjs/common';
import { AdjustmentsController } from './adjustments.controller';
import { AdjustmentsService } from './adjustments.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [AdjustmentsController],
  providers: [AdjustmentsService],
  exports: [AdjustmentsService],
})
export class AdjustmentsModule {}
