import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

const safeUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { fullName: 'asc' },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdSafe(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: safeUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    await this.findByIdSafe(id);
    if (id === currentUserId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
  }

  async deactivate(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    await this.findByIdSafe(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: safeUserSelect,
    });
  }

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    await this.findByIdSafe(id);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Reassign all related records to the current user before deleting
      await tx.purchase.updateMany({ where: { createdById: id }, data: { createdById: currentUserId } });
      await tx.sale.updateMany({ where: { createdById: id }, data: { createdById: currentUserId } });
      await tx.stockTransfer.updateMany({ where: { createdById: id }, data: { createdById: currentUserId } });
      await tx.stockAdjustment.updateMany({ where: { createdById: id }, data: { createdById: currentUserId } });
      await tx.dailySession.updateMany({ where: { openedById: id }, data: { openedById: currentUserId } });
      await tx.dailySession.updateMany({ where: { closedById: id }, data: { closedById: currentUserId } });

      await tx.user.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
