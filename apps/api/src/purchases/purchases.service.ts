import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { DefaultLocationService } from '../common/default-location.service';
import { CreatePurchaseDto, PurchaseItemDto } from './dto/create-purchase.dto';
import { TransactionType } from '../common/constants/roles';
import { derivePurchaseUnitPrice } from '../common/pricing.service';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly defaultLocation: DefaultLocationService,
  ) {}

  async create(dto: CreatePurchaseDto, createdById: string) {
    const purchaseInclude = {
      items: { include: { product: true, unit: true } },
      supplier: true,
      location: true,
      createdBy: { select: { id: true, fullName: true } },
    } as const;

    if (dto.clientMutationId) {
      const existing = await this.prisma.purchase.findUnique({
        where: { clientMutationId: dto.clientMutationId },
        include: purchaseInclude,
      });
      if (existing) return existing;
    }

    const locationId = await this.defaultLocation.getDefaultMainStoreId();
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productIds = [...new Set(dto.items.map((i: PurchaseItemDto) => i.productId))];
      const unitIds = [...new Set(dto.items.map((i: PurchaseItemDto) => i.unitId))];

      const [products, units] = await Promise.all([
        tx.product.findMany({
          where: { id: { in: productIds } },
          include: {
            baseUnit: true,
            priceHistory: {
              where: { effectiveTo: null },
              take: 1,
              orderBy: { effectiveFrom: 'desc' },
            },
          },
        }),
        tx.unit.findMany({ where: { id: { in: unitIds } } }),
      ]);

      const productMap = new Map(products.map((p) => [p.id, p]));
      const unitMap = new Map(units.map((u) => [u.id, u]));
      const resolvedItems: Array<{
        productId: string;
        quantity: number;
        unitId: string;
        unitConversionValue: number;
        unitName: string;
        unitPurchasePrice: number;
        unitSellingPriceSnapshot: number;
        quantityInBaseUnits: number;
      }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        const unit = unitMap.get(item.unitId);
        if (!product || !unit || !product.baseUnit || !product.priceHistory?.[0])
          throw new BadRequestException('Invalid product or unit');
        const price = product.priceHistory[0];
        const productPrice = {
          purchasePrice: Number(price.purchasePrice),
          retailPrice: Number(price.retailPrice),
          wholesalePrice: Number(price.wholesalePrice),
          baseUnitConversionValue: product.baseUnit.conversionValue,
        };
        const unitInfo = { id: unit.id, name: unit.name, conversionValue: unit.conversionValue };
        const unitPurchasePrice = derivePurchaseUnitPrice(productPrice, unitInfo);
        const unitSellingPriceSnapshot = Number(price.retailPrice);
        const quantityInBaseUnits = item.quantity * unit.conversionValue;

        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitId: unit.id,
          unitConversionValue: unit.conversionValue,
          unitName: unit.name,
          unitPurchasePrice,
          unitSellingPriceSnapshot,
          quantityInBaseUnits,
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          locationId,
          referenceNumber: dto.referenceNumber,
          purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : new Date(),
          createdById,
          notes: dto.notes,
          clientMutationId: dto.clientMutationId,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitId: item.unitId,
              unitConversionValueSnapshot: item.unitConversionValue,
              unitNameSnapshot: item.unitName,
              unitPurchasePrice: item.unitPurchasePrice,
              unitSellingPriceSnapshot: item.unitSellingPriceSnapshot,
              subtotal: item.quantity * item.unitPurchasePrice,
            })),
          },
        },
        include: purchaseInclude,
      });

      for (const item of purchase.items) {
        const qty = item.quantity * (item.unitConversionValueSnapshot ?? 1);
        await this.inventoryService.adjustBalance(tx, item.productId, locationId, qty);
        await this.inventoryService.recordTransaction(tx, {
          productId: item.productId,
          locationId,
          transactionType: TransactionType.PURCHASE,
          referenceType: 'Purchase',
          referenceId: purchase.id,
          quantityChange: qty,
          unitCostSnapshot: Number(item.unitPurchasePrice),
          unitSellingPriceSnapshot: Number(item.unitSellingPriceSnapshot),
        });
      }

      return purchase;
    });
  }

  findAll() {
    return this.prisma.purchase.findMany({
      include: {
        supplier: true,
        location: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true, unit: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        location: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true, unit: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  async update(id: string, dto: CreatePurchaseDto, updatedById: string) {
    const existing = await this.findOne(id);
    const locationId = existing.locationId;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of existing.items) {
        const qty = item.quantity * (item.unitConversionValueSnapshot ?? 1);
        await this.inventoryService.adjustBalance(tx, item.productId, locationId, -qty);
      }

      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

      const productIds = [...new Set(dto.items.map((i: PurchaseItemDto) => i.productId))];
      const unitIds = [...new Set(dto.items.map((i: PurchaseItemDto) => i.unitId))];

      const [products, units] = await Promise.all([
        tx.product.findMany({
          where: { id: { in: productIds } },
          include: {
            baseUnit: true,
            priceHistory: {
              where: { effectiveTo: null },
              take: 1,
              orderBy: { effectiveFrom: 'desc' },
            },
          },
        }),
        tx.unit.findMany({ where: { id: { in: unitIds } } }),
      ]);

      const productMap = new Map(products.map((p) => [p.id, p]));
      const unitMap = new Map(units.map((u) => [u.id, u]));
      const resolvedItems: Array<{
        productId: string;
        quantity: number;
        unitId: string;
        unitConversionValue: number;
        unitName: string;
        unitPurchasePrice: number;
        unitSellingPriceSnapshot: number;
      }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        const unit = unitMap.get(item.unitId);
        if (!product || !unit || !product.baseUnit || !product.priceHistory?.[0])
          throw new BadRequestException('Invalid product or unit');
        const price = product.priceHistory[0];
        const productPrice = {
          purchasePrice: Number(price.purchasePrice),
          retailPrice: Number(price.retailPrice),
          wholesalePrice: Number(price.wholesalePrice),
          baseUnitConversionValue: product.baseUnit.conversionValue,
        };
        const unitInfo = { id: unit.id, name: unit.name, conversionValue: unit.conversionValue };
        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitId: unit.id,
          unitConversionValue: unit.conversionValue,
          unitName: unit.name,
          unitPurchasePrice: derivePurchaseUnitPrice(productPrice, unitInfo),
          unitSellingPriceSnapshot: Number(price.retailPrice),
        });
      }

      const purchase = await tx.purchase.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          notes: dto.notes,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitId: item.unitId,
              unitConversionValueSnapshot: item.unitConversionValue,
              unitNameSnapshot: item.unitName,
              unitPurchasePrice: item.unitPurchasePrice,
              unitSellingPriceSnapshot: item.unitSellingPriceSnapshot,
              subtotal: item.quantity * item.unitPurchasePrice,
            })),
          },
        },
        include: {
          items: { include: { product: true, unit: true } },
          supplier: true,
          location: true,
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      for (const item of purchase.items) {
        const qty = item.quantity * (item.unitConversionValueSnapshot ?? 1);
        await this.inventoryService.adjustBalance(tx, item.productId, locationId, qty);
        await this.inventoryService.recordTransaction(tx, {
          productId: item.productId,
          locationId,
          transactionType: TransactionType.PURCHASE,
          referenceType: 'Purchase',
          referenceId: purchase.id,
          quantityChange: qty,
          unitCostSnapshot: Number(item.unitPurchasePrice),
          unitSellingPriceSnapshot: Number(item.unitSellingPriceSnapshot),
        });
      }

      return purchase;
    });
  }

  /** Last purchase price for a product from a supplier (for price suggestions). */
  async getLastPriceForSupplier(supplierId: string, productId: string) {
    const item = await this.prisma.purchaseItem.findFirst({
      where: {
        productId,
        purchase: { supplierId },
      },
      orderBy: { purchase: { purchasedAt: 'desc' } },
      select: {
        unitPurchasePrice: true,
        unitSellingPriceSnapshot: true,
      },
    });
    return item
      ? {
          unitPurchasePrice: Number(item.unitPurchasePrice),
          unitSellingPriceSnapshot: Number(item.unitSellingPriceSnapshot),
        }
      : null;
  }
}
