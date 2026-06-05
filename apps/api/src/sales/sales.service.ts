import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { DefaultLocationService } from '../common/default-location.service';
import { CreateSaleDto, SaleItemDto } from './dto/create-sale.dto';
import { UpdateSalePaymentDto } from './dto/update-sale-payment.dto';
import { Role, TransactionType } from '../common/constants/roles';
import { deriveSaleUnitPrice, derivePurchaseUnitPrice } from '../common/pricing.service';
import { adaptPaymentToNewTotal, resolveSalePayment } from './sale-payment.util';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly defaultLocation: DefaultLocationService,
  ) {}

  private assertSaleAccess(
    sale: { createdById: string },
    userId: string,
    role: Role,
  ): void {
    if (role === Role.SALES && sale.createdById !== userId) {
      throw new ForbiddenException('You can only access your own sales');
    }
  }

  async create(dto: CreateSaleDto, createdById: string) {
    const saleInclude = {
      items: { include: { product: true, unit: true } },
      location: true,
      createdBy: { select: { id: true, fullName: true } },
    } as const;

    if (dto.clientMutationId) {
      const existing = await this.prisma.sale.findUnique({
        where: { clientMutationId: dto.clientMutationId },
        include: saleInclude,
      });
      if (existing) return existing;
    }

    const locationId = await this.defaultLocation.getDefaultMainStoreId();
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const productIds = [...new Set(dto.items.map((i: SaleItemDto) => i.productId))];
      const unitIds = [...new Set(dto.items.map((i: SaleItemDto) => i.unitId))];

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
        unitSellingPrice: number;
        unitPurchasePriceSnapshot: number;
        quantityInBaseUnits: number;
      }> = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        const unit = unitMap.get(item.unitId);
        if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
        if (!unit) throw new BadRequestException(`Unit ${item.unitId} not found`);
        const price = product.priceHistory?.[0];
        if (!price || !product.baseUnit)
          throw new BadRequestException(`Product ${product.name} has no price or base unit`);

        const productPrice = {
          purchasePrice: Number(price.purchasePrice),
          retailPrice: Number(price.retailPrice),
          wholesalePrice: Number(price.wholesalePrice),
          baseUnitConversionValue: product.baseUnit.conversionValue,
        };
        const unitInfo = {
          id: unit.id,
          name: unit.name,
          conversionValue: unit.conversionValue,
        };
        const unitSellingPrice = deriveSaleUnitPrice(productPrice, unitInfo);
        const unitPurchasePriceSnapshot = derivePurchaseUnitPrice(productPrice, unitInfo);
        const quantityInBaseUnits = item.quantity * unit.conversionValue;

        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitId: unit.id,
          unitConversionValue: unit.conversionValue,
          unitName: unit.name,
          unitSellingPrice,
          unitPurchasePriceSnapshot,
          quantityInBaseUnits,
        });
      }

      for (const item of resolvedItems) {
        const product = productMap.get(item.productId)!;
        await this.inventoryService.assertSufficientStock(
          tx,
          item.productId,
          locationId,
          item.quantityInBaseUnits,
          product.name,
        );
      }

      const totalAmount = resolvedItems.reduce(
        (sum, item) => sum + item.quantity * item.unitSellingPrice,
        0,
      );

      const payment = resolveSalePayment(totalAmount, dto.paymentStatus, dto.amountPaid);

      const sale = await tx.sale.create({
        data: {
          locationId,
          soldAt: dto.soldAt ? new Date(dto.soldAt) : new Date(),
          createdById,
          totalAmount,
          paymentStatus: payment.paymentStatus,
          amountPaid: payment.amountPaid,
          notes: dto.notes,
          clientMutationId: dto.clientMutationId,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitId: item.unitId,
              unitConversionValueSnapshot: item.unitConversionValue,
              unitNameSnapshot: item.unitName,
              unitSellingPrice: item.unitSellingPrice,
              unitPurchasePriceSnapshot: item.unitPurchasePriceSnapshot,
              subtotal: item.quantity * item.unitSellingPrice,
            })),
          },
        },
        include: saleInclude,
      });

      for (const item of sale.items) {
        const qty = item.quantity * (item.unitConversionValueSnapshot ?? 1);
        await this.inventoryService.adjustBalance(tx, item.productId, locationId, -qty);
        await this.inventoryService.recordTransaction(tx, {
          productId: item.productId,
          locationId,
          transactionType: TransactionType.SALE,
          referenceType: 'Sale',
          referenceId: sale.id,
          quantityChange: -qty,
          unitCostSnapshot: Number(item.unitPurchasePriceSnapshot),
          unitSellingPriceSnapshot: Number(item.unitSellingPrice),
        });
      }

      return sale;
    });
  }

  findAll(userId: string, role: Role) {
    return this.prisma.sale.findMany({
      where: role === Role.SALES ? { createdById: userId } : undefined,
      include: {
        location: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true, unit: true } },
      },
      orderBy: { soldAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        location: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true, unit: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    this.assertSaleAccess(sale, userId, role);
    return sale;
  }

  async update(id: string, dto: CreateSaleDto, updatedById: string, role: Role) {
    const existing = await this.findOne(id, updatedById, role);
    const locationId = existing.locationId;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of existing.items) {
        const qty = item.quantity * (item.unitConversionValueSnapshot ?? 1);
        await this.inventoryService.adjustBalance(tx, item.productId, locationId, qty);
      }

      await tx.saleItem.deleteMany({ where: { saleId: id } });

      const productIds = [...new Set(dto.items.map((i: SaleItemDto) => i.productId))];
      const unitIds = [...new Set(dto.items.map((i: SaleItemDto) => i.unitId))];

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
        unitSellingPrice: number;
        unitPurchasePriceSnapshot: number;
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
          unitSellingPrice: deriveSaleUnitPrice(productPrice, unitInfo),
          unitPurchasePriceSnapshot: derivePurchaseUnitPrice(productPrice, unitInfo),
        });
      }

      for (const item of resolvedItems) {
        const product = productMap.get(item.productId)!;
        const qty = item.quantity * item.unitConversionValue;
        await this.inventoryService.assertSufficientStock(
          tx, item.productId, locationId, qty, product.name,
        );
      }

      const totalAmount = resolvedItems.reduce(
        (sum, item) => sum + item.quantity * item.unitSellingPrice,
        0,
      );

      const payment =
        dto.paymentStatus != null || dto.amountPaid != null
          ? resolveSalePayment(totalAmount, dto.paymentStatus, dto.amountPaid)
          : adaptPaymentToNewTotal(
              totalAmount,
              existing.paymentStatus,
              Number(existing.amountPaid),
            );

      const sale = await tx.sale.update({
        where: { id },
        data: {
          totalAmount,
          paymentStatus: payment.paymentStatus,
          amountPaid: payment.amountPaid,
          notes: dto.notes,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitId: item.unitId,
              unitConversionValueSnapshot: item.unitConversionValue,
              unitNameSnapshot: item.unitName,
              unitSellingPrice: item.unitSellingPrice,
              unitPurchasePriceSnapshot: item.unitPurchasePriceSnapshot,
              subtotal: item.quantity * item.unitSellingPrice,
            })),
          },
        },
        include: {
          items: { include: { product: true, unit: true } },
          location: true,
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      for (const item of sale.items) {
        const qty = item.quantity * (item.unitConversionValueSnapshot ?? 1);
        await this.inventoryService.adjustBalance(tx, item.productId, locationId, -qty);
        await this.inventoryService.recordTransaction(tx, {
          productId: item.productId,
          locationId,
          transactionType: TransactionType.SALE,
          referenceType: 'Sale',
          referenceId: sale.id,
          quantityChange: -qty,
          unitCostSnapshot: Number(item.unitPurchasePriceSnapshot),
          unitSellingPriceSnapshot: Number(item.unitSellingPrice),
        });
      }

      return sale;
    });
  }

  async updatePayment(id: string, dto: UpdateSalePaymentDto, userId: string, role: Role) {
    const sale = await this.findOne(id, userId, role);
    const totalAmount = Number(sale.totalAmount);
    const payment = resolveSalePayment(totalAmount, dto.paymentStatus, dto.amountPaid);
    const saleInclude = {
      items: { include: { product: true, unit: true } },
      location: true,
      createdBy: { select: { id: true, fullName: true } },
    } as const;
    return this.prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: payment.paymentStatus,
        amountPaid: payment.amountPaid,
      },
      include: saleInclude,
    });
  }
}
