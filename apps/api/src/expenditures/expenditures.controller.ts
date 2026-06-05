import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ExpendituresService } from './expenditures.service';
import { CreateExpenditureDto } from './dto/create-expenditure.dto';
import { UpdateExpenditureDto } from './dto/update-expenditure.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';

@ApiTags('Expenditures')
@ApiBearerAuth()
@Roles(Role.MANAGER, Role.CASHIER)
@Controller('expenditures')
export class ExpendituresController {
  constructor(private readonly expendituresService: ExpendituresService) {}

  @Post()
  create(@Body() dto: CreateExpenditureDto, @CurrentUser() user: JwtUserPayload) {
    return this.expendituresService.create(dto, user.id);
  }

  @Get()
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tzOffset') tzOffset?: string,
  ) {
    return this.expendituresService.findAll(
      from,
      to,
      tzOffset ? parseInt(tzOffset, 10) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expendituresService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenditureDto) {
    return this.expendituresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expendituresService.remove(id);
  }
}
