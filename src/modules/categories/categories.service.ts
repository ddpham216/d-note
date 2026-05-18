import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoryRepository.findOne({
      where: { slug: createCategoryDto.slug },
    });
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    const category = this.categoryRepository.create(createCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async findAll(options?: {
    page?: number | string;
    limit?: number | string;
    search?: string;
  }) {
    if (!options || (!options.page && !options.limit && !options.search)) {
      return await this.categoryRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;

    const query = this.categoryRepository
      .createQueryBuilder('category')
      .orderBy('category.createdAt', 'DESC');

    if (options.search) {
      query.andWhere(
        '(LOWER(category.name) LIKE :search OR LOWER(category.slug) LIKE :search)',
        { search: `%${options.search.toLowerCase()}%` },
      );
    }

    const [categories, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);
    
    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existing = await this.categoryRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });
      if (existing) {
        throw new ConflictException('Category slug already exists');
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    return await this.categoryRepository.remove(category);
  }
}
