import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../posts/entities/post.entity';
import { PostStatus } from '../posts/entities/post-status.enum';
import { Category } from '../categories/entities/category.entity';
import { Media } from '../media/entities/media.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  async getStats() {
    const [
      totalPosts,
      draftPosts,
      publishedPosts,
      totalCategories,
      totalMediaCount,
      mediaSizeSum,
      recentPosts,
      recentMedia,
    ] = await Promise.all([
      this.postRepository.count(),
      this.postRepository.count({ where: { status: PostStatus.DRAFT } }),
      this.postRepository.count({ where: { status: PostStatus.PUBLISHED } }),
      this.categoryRepository.count(),
      this.mediaRepository.count(),
      this.mediaRepository.createQueryBuilder('media')
        .select('SUM(media.size)', 'sum')
        .getRawOne(),
      this.postRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['category'],
      }),
      this.mediaRepository.find({
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const totalMediaSize = Number(mediaSizeSum?.sum) || 0;

    return {
      posts: {
        total: totalPosts,
        draft: draftPosts,
        published: publishedPosts,
      },
      categories: {
        total: totalCategories,
      },
      media: {
        totalCount: totalMediaCount,
        totalSize: totalMediaSize, // in bytes
      },
      recentPosts,
      recentMedia,
    };
  }
}
