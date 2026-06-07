import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdatePriceDto } from './dto/update-price.dto';

const UPLOAD_SUBDIR = join('uploads', 'products');
const PUBLIC_PREFIX = '/api/uploads/products/';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private uploadsDir() {
    const dir = join(process.cwd(), UPLOAD_SUBDIR);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  private removeLocalImageFile(imageUrl: string | null | undefined) {
    if (!imageUrl?.startsWith(PUBLIC_PREFIX)) return;
    const name = imageUrl.slice(PUBLIC_PREFIX.length);
    if (!name || name.includes('..') || name.includes('/')) return;
    const fp = join(this.uploadsDir(), name);
    if (existsSync(fp)) {
      try {
        unlinkSync(fp);
      } catch {
        /* ignore */
      }
    }
  }

  async create(dto: CreateProductDto) {
    const { purchasePrice, retailPrice, wholesalePrice, imageUrl, unitPrices, ...productData } =
      dto;

    const baseUnit = await this.prisma.unit.findUnique({
      where: { id: dto.baseUnitId },
    });
    if (!baseUnit) {
      throw new BadRequestException('Base unit not found');
    }

    const unitTypeMap: Record<string, string> = {
      bottle: 'BOTTLE',
      crate: 'CRATE',
      carton: 'CARTON',
      can: 'CAN',
      unit: 'UNIT',
    };
    const unitType = unitTypeMap[baseUnit.name.toLowerCase()] ?? 'UNIT';

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          unitType: unitType as 'BOTTLE' | 'CRATE' | 'CARTON' | 'CAN' | 'UNIT',
          ...(imageUrl?.trim() ? { imageUrl: imageUrl.trim() } : {}),
          ...(unitPrices ? { unitPrices: unitPrices as unknown as Prisma.InputJsonValue } : {}),
        },
      });

      await tx.productPriceHistory.create({
        data: {
          productId: product.id,
          purchasePrice,
          retailPrice,
          wholesalePrice,
        },
      });

      return product;
    });
  }

  async findAll(params: { category?: string; isActive?: boolean } = {}) {
    const where: Record<string, unknown> = {};
    if (params.category) where.category = params.category;
    if (params.isActive !== undefined) where.isActive = params.isActive;

    return this.prisma.product.findMany({
      where,
      include: {
        baseUnit: true,
        priceHistory: {
          where: { effectiveTo: null },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
        defaultSupplier: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        priceHistory: { orderBy: { effectiveFrom: 'desc' } },
        inventoryBalance: { include: { location: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const { imageUrl: imagePatch, ...rest } = dto;
    const updateData: Record<string, unknown> = { ...rest };

    if (imagePatch !== undefined) {
      const trimmed = imagePatch.trim();
      if (trimmed === '') {
        const prev = await this.prisma.product.findUnique({
          where: { id },
          select: { imageUrl: true },
        });
        this.removeLocalImageFile(prev?.imageUrl);
        updateData.imageUrl = null;
      } else {
        updateData.imageUrl = trimmed;
      }
    }

    if (dto.baseUnitId) {
      const baseUnit = await this.prisma.unit.findUnique({
        where: { id: dto.baseUnitId },
      });
      if (!baseUnit) {
        throw new BadRequestException('Base unit not found');
      }
      const unitTypeMap: Record<string, string> = {
        bottle: 'BOTTLE',
        crate: 'CRATE',
        carton: 'CARTON',
        can: 'CAN',
        unit: 'UNIT',
      };
      updateData.unitType = unitTypeMap[baseUnit.name.toLowerCase()] ?? 'UNIT';
    }
    return this.prisma.product.update({ where: { id }, data: updateData });
  }

  async saveProductImage(productId: string, file: Express.Multer.File) {
    await this.findOne(productId);
    const allowed = new Map([
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
      ['image/gif', 'gif'],
    ]);
    const ext = allowed.get(file.mimetype);
    if (!ext) {
      throw new BadRequestException('Invalid image type (use JPEG, PNG, WebP, or GIF)');
    }
    const prev = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { imageUrl: true },
    });
    this.removeLocalImageFile(prev?.imageUrl);
    const filename = `${productId}-${Date.now()}.${ext}`;
    await writeFile(join(this.uploadsDir(), filename), file.buffer);
    const publicUrl = `${PUBLIC_PREFIX}${filename}`;
    return this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: publicUrl },
      include: {
        baseUnit: true,
        priceHistory: {
          where: { effectiveTo: null },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
        defaultSupplier: true,
      },
    });
  }

  async clearProductImage(productId: string) {
    await this.findOne(productId);
    const prev = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { imageUrl: true },
    });
    this.removeLocalImageFile(prev?.imageUrl);
    return this.prisma.product.update({
      where: { id: productId },
      data: { imageUrl: null },
      include: {
        baseUnit: true,
        priceHistory: {
          where: { effectiveTo: null },
          take: 1,
          orderBy: { effectiveFrom: 'desc' },
        },
        defaultSupplier: true,
      },
    });
  }

  async updatePrice(id: string, dto: UpdatePriceDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Close current price record
      await tx.productPriceHistory.updateMany({
        where: { productId: id, effectiveTo: null },
        data: { effectiveTo: new Date() },
      });

      return tx.productPriceHistory.create({
        data: {
          productId: id,
          purchasePrice: dto.purchasePrice,
          retailPrice: dto.retailPrice,
          wholesalePrice: dto.wholesalePrice,
        },
      });
    });
  }

  /** Returns the current effective price for a product */
  async getCurrentPrice(productId: string) {
    return this.prisma.productPriceHistory.findFirst({
      where: { productId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /**
   * Permanently delete a product. Removes its prices, stock balances and image.
   * Fails with a clear message if the product is referenced by sales/purchases
   * (deactivate it instead, to keep that history intact).
   */
  async remove(id: string) {
    const product = await this.findOne(id);
    try {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.inventoryBalance.deleteMany({ where: { productId: id } });
        await tx.productPriceHistory.deleteMany({ where: { productId: id } });
        await tx.product.delete({ where: { id } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException(
          'This product has sales or purchase history and cannot be deleted. Deactivate it instead.',
        );
      }
      throw e;
    }
    this.removeLocalImageFile(product.imageUrl);
    return { id, deleted: true };
  }
}
