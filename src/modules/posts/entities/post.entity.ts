import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Category } from 'src/modules/categories/entities/category.entity';
import { Admin } from 'src/modules/admins/entities/admin.entity';
import { Media } from 'src/modules/media/entities/media.entity';
import { PostStatus } from './post-status.enum';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null; // Summary for SEO meta-description

  @Column({ type: 'varchar', nullable: true })
  thumbnail: string | null;

  // SEO Fields
  @Column({ type: 'varchar', nullable: true })
  metaTitle: string | null;

  @Column({ type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  metaKeywords: string | null;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.DRAFT,
  })
  status: PostStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column()
  authorId: string;

  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'authorId' })
  author: Admin;

  @Column()
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.posts)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @ManyToMany(() => Media, (media) => media.posts)
  @JoinTable({ name: 'post_media' })
  media: Media[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
