import { Module } from '@nestjs/common';
import { ExpendituresService } from './expenditures.service';
import { ExpendituresController } from './expenditures.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExpendituresController],
  providers: [ExpendituresService],
})
export class ExpendituresModule {}
