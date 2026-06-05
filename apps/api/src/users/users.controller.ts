import { Controller, Get, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUserPayload } from '../auth/interfaces/jwt-payload.interface';
import { Role } from '../common/constants/roles';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@Roles(Role.MANAGER)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.usersService.update(id, dto, user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: JwtUserPayload) {
    return this.usersService.delete(id, user.id);
  }
}
