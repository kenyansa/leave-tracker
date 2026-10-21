import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveRequest, LeaveStatus } from './leave-request.entity';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly repo: Repository<LeaveRequest>,
  ) {}

  async create(userId: string, dto: CreateLeaveDto) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must not be before startDate');
    }
    const overlaps = await this.repo.existsBy({
      userId,
      status: In([LeaveStatus.Pending, LeaveStatus.Approved]),
      startDate: LessThanOrEqual(dto.endDate),
      endDate: MoreThanOrEqual(dto.startDate),
    });
    if (overlaps)
      throw new ConflictException('Dates overlap an existing request');

    return this.repo.save(this.repo.create({ ...dto, userId }));
  }

  findMine(userId: string) {
    return this.repo.find({ where: { userId }, order: { startDate: 'DESC' } });
  }

  async cancel(id: string, userId: string) {
    const request = await this.repo.findOneBy({ id, userId });
    if (!request) throw new NotFoundException();
    if (request.status !== LeaveStatus.Pending) {
      throw new ConflictException('Only pending requests can be cancelled');
    }
    request.status = LeaveStatus.Cancelled;
    return this.repo.save(request);
  }
}
