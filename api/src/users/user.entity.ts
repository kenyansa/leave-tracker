import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum Role {
  Employee = 'employee',
  Manager = 'manager',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ unique: true }) email!: string;
  @Column({ select: false }) passwordHash!: string;
  @Column({ type: 'enum', enum: Role, default: Role.Employee }) role!: Role;
  @Column({ type: 'uuid', nullable: true }) managerId!: string | null;
}