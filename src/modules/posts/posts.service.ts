import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { PostStatus } from './entities/post-status.enum';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

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
    return await this.postRepository.save(post);
  }

  async findAll(status?: PostStatus) {
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.author', 'author')
      .orderBy('post.createdAt', 'DESC');

    if (status) {
      query.andWhere('post.status = :status', { status });
    }

    return await query.getMany();
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
    return await this.postRepository.save(post);
  }

  async remove(id: string) {
    const post = await this.findOne(id);
    return await this.postRepository.remove(post);
  }
}
