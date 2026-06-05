import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { DefaultLocationService } from '../common/default-location.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { AdjustmentType, TransactionType } from '../common/constants/roles';

@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly defaultLocation: DefaultLocationService,
  ) {}

  async create(dto: CreateAdjustmentDto, createdById: string) {
    const adjustmentInclude = {
      product: { include: { baseUnit: true } },
      unit: true,
      location: true,
      createdBy: { select: { id: true, fullName: true } },
    } as const;

    if (dto.clientMutationId) {
      const existing = await this.prisma.stockAdjustment.findUnique({
        where: { clientMutationId: dto.clientMutationId },
        include: adjustmentInclude,
      });
      if (existing) return existing;
    }

    const locationId = await this.defaultLocation.getDefaultMainStoreId();
    const isDecrease = dto.adjustmentType === AdjustmentType.DECREASE;

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { baseUnit: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    let quantityInBaseUnits: number;
    let unitId: string | null = null;
    let unitConversionValueSnapshot: number | null = null;
    let unitNameSnapshot: string | null = null;

    if (dto.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: dto.unitId },
      });
      if (!unit) throw new NotFoundException('Unit not found');
      quantityInBaseUnits = dto.quantity * unit.conversionValue;
      unitId = unit.id;
      unitConversionValueSnapshot = unit.conversionValue;
      unitNameSnapshot = unit.name;
    } else {
      const baseUnit = product.baseUnit;
      const conversionValue = baseUnit?.conversionValue ?? 1;
      quantityInBaseUnits = dto.quantity * conversionValue;
      if (baseUnit) {
        unitId = baseUnit.id;
        unitConversionValueSnapshot = baseUnit.conversionValue;
        unitNameSnapshot = baseUnit.name;
      }
    }

    const quantityChange = isDecrease ? -quantityInBaseUnits : quantityInBaseUnits;
    const txType = isDecrease ? TransactionType.ADJUSTMENT_OUT : TransactionType.ADJUSTMENT_IN;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (isDecrease) {
        await this.inventoryService.assertSufficientStock(
          tx, dto.productId, locationId, quantityInBaseUnits,
        );
      }

      const adjustment = await tx.stockAdjustment.create({
        data: {
          locationId,
          productId: dto.productId,
          adjustmentType: dto.adjustmentType,
          reasonType: dto.reasonType,
          quantity: quantityInBaseUnits,
          unitId,
          unitConversionValueSnapshot,
          unitNameSnapshot,
          note: dto.note,
          adjustedAt: dto.adjustedAt ? new Date(dto.adjustedAt) : new Date(),
          createdById,
          clientMutationId: dto.clientMutationId,
        },
        include: adjustmentInclude,
      });

      await this.inventoryService.adjustBalance(
        tx, dto.productId, locationId, quantityChange,
      );
      await this.inventoryService.recordTransaction(tx, {
        productId: dto.productId,
        locationId,
        transactionType: txType,
        referenceType: 'StockAdjustment',
        referenceId: adjustment.id,
        quantityChange,
      });

      return adjustment;
    });
  }

  findAll() {
    return this.prisma.stockAdjustment.findMany({
      include: {
        product: { include: { baseUnit: true } },
        unit: true,
        location: true,
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: { adjustedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const adjustment = await this.prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        product: { include: { baseUnit: true } },
        unit: true,
        location: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    return adjustment;
  }
}
