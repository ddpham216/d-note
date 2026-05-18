import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { PostStatus } from './entities/post-status.enum';
import { Media } from '../media/entities/media.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  private extractMediaFilenames(content: string, thumbnail: string | null): string[] {
    const filenames = new Set<string>();

    if (thumbnail) {
      const match = thumbnail.match(/\/([^/]+\.webp)$/i);
      if (match) {
        filenames.add(match[1]);
      }
    }

    if (content) {
      const regex = /!\[.*?\]\((.*?)\)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const url = match[1];
        const fileMatch = url.match(/\/([^/]+\.webp)$/i);
        if (fileMatch) {
          filenames.add(fileMatch[1]);
        }
      }
    }

    return Array.from(filenames);
  }

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const existing = await this.postRepository.findOne({
      where: { slug: createPostDto.slug },
    });
    if (existing) {
      throw new ConflictException('Post slug already exists');
    }

    const post = this.postRepository.create({
      ...createPostDto,
      authorId,
      publishedAt:
        createPostDto.status === PostStatus.PUBLISHED ? new Date() : null,
    });

    const filenames = this.extractMediaFilenames(
      createPostDto.content || '',
      createPostDto.thumbnail || null,
    );

    if (filenames.length > 0) {
      const media = await this.mediaRepository.find({
        where: { filename: In(filenames) },
      });
      post.media = media;
    } else {
      post.media = [];
    }

    return await this.postRepository.save(post);
  }

  async findAll(options: {
    status?: PostStatus;
    search?: string;
    categoryId?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const skip = (page - 1) * limit;

    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.author', 'author')
      .orderBy('post.createdAt', 'DESC');

    if (options.status) {
      query.andWhere('post.status = :status', { status: options.status });
    }

    if (options.search) {
      query.andWhere('LOWER(post.title) LIKE :search', {
        search: `%${options.search.toLowerCase()}%`,
      });
    }

    if (options.categoryId) {
      query.andWhere('post.categoryId = :categoryId', {
        categoryId: options.categoryId,
      });
    }

    const [posts, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['category', 'author'],
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }
    return post;
  }

  async findBySlug(slug: string) {
    const post = await this.postRepository.findOne({
      where: { slug },
      relations: ['category', 'author'],
    });
    if (!post) {
      throw new NotFoundException(`Post with slug ${slug} not found`);
    }
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const post = await this.findOne(id);

    if (updatePostDto.slug && updatePostDto.slug !== post.slug) {
      const existing = await this.postRepository.findOne({
        where: { slug: updatePostDto.slug },
      });
      if (existing) {
        throw new ConflictException('Post slug already exists');
      }
    }

    // Update publishedAt if status changes to PUBLISHED
    if (
      updatePostDto.status === PostStatus.PUBLISHED &&
      post.status !== PostStatus.PUBLISHED
    ) {
      post.publishedAt = new Date();
    }

    Object.assign(post, updatePostDto);

    const filenames = this.extractMediaFilenames(
      post.content || '',
      post.thumbnail || null,
    );

    if (filenames.length > 0) {
      const media = await this.mediaRepository.find({
        where: { filename: In(filenames) },
      });
      post.media = media;
    } else {
      post.media = [];
    }

    return await this.postRepository.save(post);
  }

  async remove(id: string) {
    const post = await this.findOne(id);
    return await this.postRepository.remove(post);
  }
}
