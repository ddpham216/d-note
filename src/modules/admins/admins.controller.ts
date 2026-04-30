import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from 'src/common/constants/role.enum';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminsService.create(createAdminDto);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.MANAGER)
  findAll() {
    return this.adminsService.findAll();
  }

  @Get('departments/all')
  @Roles(RoleType.ADMIN, RoleType.MANAGER, RoleType.EDITOR_IN_CHIEF)
  findAllDepartments() {
    return this.adminsService.findAllDepartments();
  }

  @Post('departments')
  @Roles(RoleType.ADMIN)
  createDepartment(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.adminsService.createDepartment(
      createDepartmentDto.name,
      createDepartmentDto.description,
      createDepartmentDto.parentId,
    );
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.MANAGER)
  findOne(@Param('id') id: string) {
    return this.adminsService.findOne(id);
  }
}
