import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Post } from '../posts/entities/post.entity';
import { Category } from '../categories/entities/category.entity';
import { Media } from '../media/entities/media.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Category, Media])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule { }
