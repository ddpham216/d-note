import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { CategoriesModule } from '../categories/categories.module';
import { Media } from '../media/entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Media]), CategoriesModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
