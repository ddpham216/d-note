import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async uploadFile(file: Express.Multer.File, adminId: string): Promise<Media> {
    const filename = `${uuidv4()}.webp`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.join(uploadDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Convert image to webp format using sharp
    const sharpInfo = await sharp(file.buffer)
      .webp({ quality: 80 })
      .toFile(filePath);

    const url = `/public/uploads/${filename}`;

    const media = this.mediaRepository.create({
      filename: filename,
      originalName: file.originalname,
      mimeType: 'image/webp',
      size: sharpInfo.size,
      url: url,
      uploadedById: adminId,
    });

    return await this.mediaRepository.save(media);
  }

  async findAll(options?: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    inUse?: string;
  }) {
    const page = Number(options?.page) || 1;
    const limit = Number(options?.limit) || 15;
    const skip = (page - 1) * limit;

    const query = this.mediaRepository
      .createQueryBuilder('media')
      .leftJoinAndSelect('media.uploadedBy', 'uploadedBy')
      .leftJoinAndSelect('media.posts', 'posts')
      .orderBy('media.createdAt', 'DESC');

    if (options?.search) {
      query.andWhere('LOWER(media.originalName) LIKE :search', {
        search: `%${options.search.toLowerCase()}%`,
      });
    }

    if (options?.inUse === 'true') {
      query.andWhere('posts.id IS NOT NULL');
    } else if (options?.inUse === 'false') {
      query.andWhere('posts.id IS NULL');
    }

    const [mediaList, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: mediaList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async remove(id: string) {
    const media = await this.mediaRepository.findOne({ 
      where: { id },
      relations: ['posts']
    });
    
    if (!media) {
      throw new NotFoundException(`Media file with ID ${id} not found`);
    }

    if (media.posts && media.posts.length > 0) {
      throw new BadRequestException(`Cannot delete media because it is currently used in ${media.posts.length} post(s). Please remove it from the posts first.`);
    }

    // Try to delete physical file
    try {
      const filePath = path.join(process.cwd(), 'public', 'uploads', media.filename);
      if (fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete physical file: ${media.filename}`, error);
      // We still proceed to delete from database even if physical file deletion fails
    }

    return await this.mediaRepository.remove(media);
  }
}
