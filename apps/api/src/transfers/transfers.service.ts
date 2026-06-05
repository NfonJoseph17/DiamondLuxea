import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { DefaultLocationService } from '../common/default-location.service';
import { CreateTransferDto, TransferItemDto } from './dto/create-transfer.dto';
import { TransactionType } from '../common/constants/roles';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly defaultLocation: DefaultLocationService,
  ) {}

  async create(dto: CreateTransferDto, createdById: string) {
    const { fromLocationId, toLocationId } = dto.fromLocationId && dto.toLocationId
      ? { fromLocationId: dto.fromLocationId, toLocationId: dto.toLocationId }
      : await this.defaultLocation.getDefaultTransferLocationIds();

    if (fromLocationId === toLocationId) {
      throw new BadRequestException('Source and destination locations must differ');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Verify stock at source for every item
      for (const item of dto.items) {
        await this.inventoryService.assertSufficientStock(
          tx, item.productId, fromLocationId, item.quantity,
        );
      }

      const transfer = await tx.stockTransfer.create({
        data: {
          fromLocationId,
          toLocationId,
          transferredAt: dto.transferredAt ? new Date(dto.transferredAt) : new Date(),
          createdById,
          notes: dto.notes,
          items: {
            create: dto.items.map((item: TransferItemDto) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          fromLocation: true,
          toLocation: true,
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      for (const item of transfer.items) {
        await this.inventoryService.adjustBalance(
          tx, item.productId, fromLocationId, -item.quantity,
        );
        await this.inventoryService.recordTransaction(tx, {
          productId: item.productId,
          locationId: fromLocationId,
          transactionType: TransactionType.TRANSFER_OUT,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
          quantityChange: -item.quantity,
        });

        await this.inventoryService.adjustBalance(
          tx, item.productId, toLocationId, item.quantity,
        );
        await this.inventoryService.recordTransaction(tx, {
          productId: item.productId,
          locationId: toLocationId,
          transactionType: TransactionType.TRANSFER_IN,
          referenceType: 'StockTransfer',
          referenceId: transfer.id,
          quantityChange: item.quantity,
        });
      }

      return transfer;
    });
  }

  findAll() {
    return this.prisma.stockTransfer.findMany({
      include: {
        fromLocation: true,
        toLocation: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
      orderBy: { transferredAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        fromLocation: true,
        toLocation: true,
        createdBy: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }
}
