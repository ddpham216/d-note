import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';
import { Department } from './entities/department.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    @InjectRepository(Admin)
    private adminsRepository: Repository<Admin>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    const { email, password, firstName, lastName, phoneNumber, roleIds, departmentIds } = createAdminDto;

    const existingAdmin = await this.adminsRepository.findOne({ where: { email } });
    if (existingAdmin) {
      throw new ConflictException('Email is already in use by another admin');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = this.adminsRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
    });

    if (roleIds && roleIds.length > 0) {
      admin.roles = await this.rolesRepository.findBy({ id: In(roleIds) });
    }

    if (departmentIds && departmentIds.length > 0) {
      admin.departments = await this.departmentsRepository.findBy({ id: In(departmentIds) });
    }

    return await this.adminsRepository.save(admin);
  }

  async findAll(skip = 0, take = 10) {
    const [data, total] = await this.adminsRepository.findAndCount({
      skip,
      take,
      relations: ['roles', 'roles.permissions', 'departments'],
    });

    return {
      data,
      total,
      skip,
      take,
      page: Math.floor(skip / take) + 1,
      lastPage: Math.ceil(total / take) || 1,
    };
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.adminsRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions', 'departments'],
    });
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    return admin;
  }

  async findOneOrNull(id: string): Promise<Admin | null> {
    return this.adminsRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions', 'departments'],
    });
  }

  async findByEmail(email: string): Promise<Admin | null> {
    return this.adminsRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.roles', 'roles')
      .leftJoinAndSelect('roles.permissions', 'permissions')
      .leftJoinAndSelect('admin.departments', 'departments')
      .where('admin.email = :email', { email })
      .addSelect('admin.password')
      .getOne();
  }

  // Department Management
  async createDepartment(name: string, description?: string, parentId?: number) {
    let parentDepartment: Department | undefined = undefined;
    let level = 1;

    if (parentId) {
      const foundParent = await this.departmentsRepository.findOne({ where: { id: parentId } });
      if (!foundParent) {
        throw new NotFoundException(`Parent department with ID ${parentId} not found`);
      }
      parentDepartment = foundParent;
      level = parentDepartment.level + 1;
    }

    const department = this.departmentsRepository.create({
      name,
      description,
      parentDepartment,
      level,
    });

    return await this.departmentsRepository.save(department);
  }

  async findAllDepartments() {
    return await this.departmentsRepository.find({
      relations: ['subDepartments', 'parentDepartment'],
    });
  }
}
