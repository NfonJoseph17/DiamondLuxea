import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            productsAsBase: true,
            purchaseItems: true,
            saleItems: true,
          },
        },
      },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async create(dto: CreateUnitDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Name is required');
    }
    if (!dto.conversionValue || dto.conversionValue <= 0) {
      throw new BadRequestException('conversionValue must be greater than 0');
    }

    const existing = await this.prisma.unit.findUnique({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Unit with name "${dto.name}" already exists`);
    }

    return this.prisma.unit.create({
      data: {
        name: dto.name.trim(),
        conversionValue: dto.conversionValue,
      },
    });
  }

  async update(id: string, dto: UpdateUnitDto) {
    await this.findOne(id);

    if (dto.name !== undefined) {
      if (!dto.name?.trim()) {
        throw new BadRequestException('Name is required');
      }
      const existing = await this.prisma.unit.findFirst({
        where: { name: dto.name.trim(), NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Unit with name "${dto.name}" already exists`);
      }
    }
    if (dto.conversionValue !== undefined && dto.conversionValue <= 0) {
      throw new BadRequestException('conversionValue must be greater than 0');
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.conversionValue !== undefined && { conversionValue: dto.conversionValue }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [productCount, purchaseCount, saleCount] = await Promise.all([
      this.prisma.product.count({ where: { baseUnitId: id } }),
      this.prisma.purchaseItem.count({ where: { unitId: id } }),
      this.prisma.saleItem.count({ where: { unitId: id } }),
    ]);

    if (productCount > 0 || purchaseCount > 0 || saleCount > 0) {
      const usedBy: string[] = [];
      if (productCount > 0) usedBy.push(`${productCount} product(s) as base unit`);
      if (purchaseCount > 0) usedBy.push(`${purchaseCount} purchase item(s)`);
      if (saleCount > 0) usedBy.push(`${saleCount} sale item(s)`);
      throw new BadRequestException(
        `Cannot delete unit: it is used by ${usedBy.join(', ')}`,
      );
    }

    return this.prisma.unit.delete({ where: { id } });
  }
}
