import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationType } from './constants/roles';

/**
 * Resolves the single default location for single-bar mode.
 * Locations are never exposed to the UI; all operations use these defaults internally.
 */
@Injectable()
export class DefaultLocationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Default location for sales and daily sessions (the bar counter). */
  async getDefaultBarId(): Promise<string> {
    const loc = await this.prisma.inventoryLocation.findFirst({
      where: { type: LocationType.BAR, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!loc) {
      throw new InternalServerErrorException(
        'No bar location configured. Run: pnpm --filter api exec prisma db seed (or pnpm db:seed)',
      );
    }
    return loc.id;
  }

  /** Default location for purchases and adjustments (storage). */
  async getDefaultMainStoreId(): Promise<string> {
    const loc = await this.prisma.inventoryLocation.findFirst({
      where: { type: LocationType.MAIN_STORE, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!loc) {
      throw new InternalServerErrorException(
        'No main store location configured. Run: pnpm --filter api exec prisma db seed (or pnpm db:seed)',
      );
    }
    return loc.id;
  }

  /** Single default for operations that need one location (sales, sessions). */
  async getDefaultLocationId(): Promise<string> {
    return this.getDefaultBarId();
  }

  /** For transfers: from storage to bar. Used when client does not send locationIds. */
  async getDefaultTransferLocationIds(): Promise<{ fromLocationId: string; toLocationId: string }> {
    const [from, to] = await Promise.all([
      this.getDefaultMainStoreId(),
      this.getDefaultBarId(),
    ]);
    if (from === to) {
      throw new InternalServerErrorException('Transfer requires two different locations. Run db:seed.');
    }
    return { fromLocationId: from, toLocationId: to };
  }
}
