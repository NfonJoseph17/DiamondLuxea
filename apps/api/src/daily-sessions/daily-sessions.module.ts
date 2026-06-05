import { Module } from '@nestjs/common';
import { DailySessionsController } from './daily-sessions.controller';
import { DailySessionsService } from './daily-sessions.service';

@Module({
  controllers: [DailySessionsController],
  providers: [DailySessionsService],
  exports: [DailySessionsService],
})
export class DailySessionsModule {}
