import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DefaultLocationService } from './default-location.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DefaultLocationService],
  exports: [DefaultLocationService],
})
export class DefaultLocationModule {}
