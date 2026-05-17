import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
} from 'typeorm';
import { Admin } from '../../admins/entities/admin.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  filename: string;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column('int')
  size: number;

  @Column()
  url: string;

  @Column({ nullable: true })
  uploadedById: string;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: Admin;

  @ManyToMany(() => Post, (post) => post.media)
  posts: Post[];

  @CreateDateColumn()
  createdAt: Date;
}
