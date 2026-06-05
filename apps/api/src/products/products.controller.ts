import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(Role.MANAGER, Role.CASHIER)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Post(':id/image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    return this.productsService.saveProductImage(id, file);
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Delete(':id/image')
  clearImage(@Param('id') id: string) {
    return this.productsService.clearProductImage(id);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.productsService.findAll({ category, isActive });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Roles(Role.MANAGER, Role.CASHIER)
  @Patch(':id/price')
  updatePrice(@Param('id') id: string, @Body() dto: UpdatePriceDto) {
    return this.productsService.updatePrice(id, dto);
  }
}
