import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserStatus } from './user-status.enum';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'date', nullable: true })
  dob: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.INACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
