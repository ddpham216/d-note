import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/modules/roles/entities/permission.entity';
import { Role } from 'src/modules/roles/entities/role.entity';
import { Repository } from 'typeorm';
import { INITIAL_ROLES_PERMISSIONS } from './initial-data';
import { RoleType } from 'src/common/constants/role.enum';

@Injectable()
export class SeedingService implements OnModuleInit {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async onModuleInit() {
    this.logger.log('Checking database seeds...');
    await this.seedPermission();
    await this.seedRole();
    this.logger.log('Database seeding completed!');
  }

  private async seedPermission() {
    const permissions = Object.values(INITIAL_ROLES_PERMISSIONS).flat();
    const uniquePermissions = [...new Set(permissions)];

    for (const slug of uniquePermissions) {
      const exists = await this.permissionRepository.findOne({
        where: { slug },
      });
      if (!exists) {
        await this.permissionRepository.save({
          slug,
          description: `Permission for ${slug}`,
        });
        this.logger.log(`Created permission: ${slug}`);
      }
    }
  }

  private async seedRole() {
    for (const roleName of Object.keys(INITIAL_ROLES_PERMISSIONS)) {
      const permissionSlugs = INITIAL_ROLES_PERMISSIONS[roleName] as RoleType[];
      let role = await this.roleRepository.findOne({
        where: { name: roleName },
        relations: ['permissions'],
      });

      if (!role) {
        role = this.roleRepository.create({
          name: roleName,
        });
        this.logger.log(`Created role: ${roleName}`);
      }

      const permissionEntities: Permission[] = [];
      for (const slug of permissionSlugs) {
        const perm = await this.permissionRepository.findOne({
          where: { slug },
        });
        if (perm) {
          permissionEntities.push(perm);
        }
      }

      role.permissions = permissionEntities;
      await this.roleRepository.save(role);
    }
  }
}
