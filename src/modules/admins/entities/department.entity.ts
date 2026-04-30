import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Admin } from './admin.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Department, (department) => department.subDepartments, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parentDepartment: Department;

  @Column({ nullable: true })
  parentId: number;

  @OneToMany(() => Department, (department) => department.parentDepartment)
  subDepartments: Department[];

  @Column({ default: 1 })
  level: number;

  @ManyToMany(() => Admin, (admin) => admin.departments)
  admins: Admin[];
}
