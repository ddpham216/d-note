import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserTier } from './entities/user-tier.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, firstName, lastName, dob, phoneNumber } =
      createUserDto;
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      dob: dob || null,
      phoneNumber: phoneNumber || null,
      tier: UserTier.FREE,
    });

    return await this.usersRepository.save(user);
  }

  async findAll(skip = 0, take = 10) {
    const [data, total] = await this.usersRepository.findAndCount({
      skip,
      take,
      relations: ['role'],
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

  findOne(id: string) {
    return this.usersRepository.findOne({ 
      where: { id },
      relations: ['role'],
    });
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    const result = await this.usersRepository
      .createQueryBuilder()
      .update(User)
      .set(updateData)
      .where('id = :id', { id })
      .returning('*')
      .execute();
      
    if (!result.raw.length) {
      throw new ConflictException('User not found after update');
    }
    return result.raw[0] as User;
  }

  remove(id: string) {
    return this.usersRepository.delete(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email })
      .addSelect('user.password')
      .getOne();
  }
}
