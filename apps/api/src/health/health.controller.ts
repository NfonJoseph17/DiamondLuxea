import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let db = 'unknown';
    let seeded = false;
    /** Helps debug "Invalid credentials" for admin@beverlys.com — no PII beyond booleans. */
    let authUsers: {
      adminBeverlysCom: boolean;
      legacyManagerExampleCom: boolean;
    } | undefined;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'connected';
      const locCount = await this.prisma.inventoryLocation.count();
      const productCount = await this.prisma.product.count();
      seeded = locCount > 0 && productCount >= 0;

      const [adminRow, legacyRow] = await Promise.all([
        this.prisma.user.findUnique({
          where: { email: 'admin@beverlys.com' },
          select: { id: true },
        }),
        this.prisma.user.findUnique({
          where: { email: 'manager@example.com' },
          select: { id: true },
        }),
      ]);
      authUsers = {
        adminBeverlysCom: !!adminRow,
        legacyManagerExampleCom: !!legacyRow,
      };
    } catch (e) {
      db = 'error';
    }
    return {
      status: db === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'bar-depot-api',
      database: db,
      seeded: db === 'connected' ? seeded : undefined,
      authUsers: db === 'connected' ? authUsers : undefined,
    };
  }
}
