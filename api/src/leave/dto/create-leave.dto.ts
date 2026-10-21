import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { LeaveType } from '../leave-request.entity';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateLeaveDto {
  @IsEnum(LeaveType) type!: LeaveType;

  @Matches(DATE_ONLY) @IsISO8601({ strict: true }) startDate!: string;
  @Matches(DATE_ONLY) @IsISO8601({ strict: true }) endDate!: string;

  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
