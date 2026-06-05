import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenditureDto } from './dto/create-expenditure.dto';
import { UpdateExpenditureDto } from './dto/update-expenditure.dto';
import { parseDateRange } from '../common/report-date-range';

@Injectable()
export class ExpendituresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenditureDto, createdById: string) {
    return this.prisma.expenditure.create({
      data: {
        amount: dto.amount,
        spentAt: dto.spentAt ? new Date(dto.spentAt) : new Date(),
        category: dto.category?.trim() || null,
        description: dto.description.trim(),
        notes: dto.notes?.trim() || null,
        createdById,
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async findAll(from?: string, to?: string, tzOffset?: number) {
    const where =
      from && to
        ? (() => {
            const { from: fromDate, to: toDate } = parseDateRange(from, to, tzOffset);
            return { spentAt: { gte: fromDate, lte: toDate } as const };
          })()
        : {};

    return this.prisma.expenditure.findMany({
      where,
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { spentAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.expenditure.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
    if (!row) throw new NotFoundException('Expenditure not found');
    return row;
  }

  async update(id: string, dto: UpdateExpenditureDto) {
    await this.findOne(id);
    return this.prisma.expenditure.update({
      where: { id },
      data: {
        ...(dto.amount != null ? { amount: dto.amount } : {}),
        ...(dto.spentAt != null ? { spentAt: new Date(dto.spentAt) } : {}),
        ...(dto.category !== undefined ? { category: dto.category?.trim() || null } : {}),
        ...(dto.description != null ? { description: dto.description.trim() } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.expenditure.delete({ where: { id } });
    return { ok: true };
  }
}
