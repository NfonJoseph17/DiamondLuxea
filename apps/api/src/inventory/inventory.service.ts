import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '../common/constants/roles';
import { CreateLocationDto, UpdateLocationDto } from './dto/create-location.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Locations ──────────────────────────────────────────────────────

  createLocation(dto: CreateLocationDto) {
    return this.prisma.inventoryLocation.create({ data: dto });
  }

  findAllLocations() {
    return this.prisma.inventoryLocation.findMany({ orderBy: { name: 'asc' } });
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    const loc = await this.prisma.inventoryLocation.findUnique({ where: { id } });
    if (!loc) throw new NotFoundException('Location not found');
    return this.prisma.inventoryLocation.update({ where: { id }, data: dto });
  }

  // ─── Balances ───────────────────────────────────────────────────────

  findAllBalances(params: { locationId?: string } = {}) {
    const where: Record<string, unknown> = {};
    if (params.locationId) where.locationId = params.locationId;

    return this.prisma.inventoryBalance.findMany({
      where,
      include: {
        product: { include: { baseUnit: true } },
        location: true,
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  findBalancesByProduct(productId: string) {
    return this.prisma.inventoryBalance.findMany({
      where: { productId },
      include: { location: true },
    });
  }

  // ─── Transactions ──────────────────────────────────────────────────

  findAllTransactions(params: { locationId?: string; productId?: string; limit?: number } = {}) {
    const where: Record<string, unknown> = {};
    if (params.locationId) where.locationId = params.locationId;
    if (params.productId) where.productId = params.productId;

    return this.prisma.inventoryTransaction.findMany({
      where,
      include: { product: true, location: true },
      orderBy: { transactionDate: 'desc' },
      take: params.limit || 100,
    });
  }

  findTransactionsByProduct(productId: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: { productId },
      include: { location: true },
      orderBy: { transactionDate: 'desc' },
    });
  }

  // ─── Stock availability helpers ────────────────────────────────────

  async getAvailableStock(
    tx: Prisma.TransactionClient,
    productId: string,
    locationId: string,
  ): Promise<number> {
    const balance = await tx.inventoryBalance.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });
    return balance?.quantity ?? 0;
  }

  async assertSufficientStock(
    tx: Prisma.TransactionClient,
    productId: string,
    locationId: string,
    requiredQty: number,
    productName?: string,
  ): Promise<void> {
    const available = await this.getAvailableStock(tx, productId, locationId);
    if (available < requiredQty) {
      const label = productName || productId;
      throw new BadRequestException(
        `Not enough stock for "${label}". In stock: ${available}. You need: ${requiredQty}. Please buy more stock or reduce the quantity.`,
      );
    }
  }

  // ─── Core stock mutation helpers ───────────────────────────────────

  async adjustBalance(
    tx: Prisma.TransactionClient,
    productId: string,
    locationId: string,
    quantityChange: number,
  ) {
    const existing = await tx.inventoryBalance.findUnique({
      where: { productId_locationId: { productId, locationId } },
    });

    const newQty = (existing?.quantity ?? 0) + quantityChange;
    if (newQty < 0) {
      throw new BadRequestException(
        `Stock cannot go below zero (product: ${productId}, location: ${locationId})`,
      );
    }

    if (existing) {
      return tx.inventoryBalance.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    }

    return tx.inventoryBalance.create({
      data: { productId, locationId, quantity: newQty },
    });
  }

  async recordTransaction(
    tx: Prisma.TransactionClient,
    data: {
      productId: string;
      locationId: string;
      transactionType: TransactionType;
      referenceType: string;
      referenceId: string;
      quantityChange: number;
      unitCostSnapshot?: number;
      unitSellingPriceSnapshot?: number;
      transactionDate?: Date;
    },
  ) {
    return tx.inventoryTransaction.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        transactionType: data.transactionType,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        quantityChange: data.quantityChange,
        unitCostSnapshot: data.unitCostSnapshot,
        unitSellingPriceSnapshot: data.unitSellingPriceSnapshot,
        transactionDate: data.transactionDate || new Date(),
      },
    });
  }
}
