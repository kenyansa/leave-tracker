import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum LeaveType {
  Annual = 'annual',
  Sick = 'sick',
  Unpaid = 'unpaid',
}

export enum LeaveStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column({ type: 'enum', enum: LeaveType }) type!: LeaveType;
  @Column({ type: 'date' }) startDate!: string;
  @Column({ type: 'date' }) endDate!: string;
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.Pending })
  status!: LeaveStatus;
  @Column({ type: 'text', nullable: true }) reason!: string | null;
  @CreateDateColumn() createdAt!: Date;
}
