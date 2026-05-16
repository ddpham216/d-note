import { Module } from '@nestjs/common';
import { SeedingService } from './seeding.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { Permission } from '../../modules/roles/entities/permission.entity';
import { Admin } from 'src/modules/admins/entities/admin.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, Admin])],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}
