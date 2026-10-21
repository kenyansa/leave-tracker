import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { ANNUAL_ALLOWANCE } from './leave.constants';
import { LeaveRequest, LeaveStatus, LeaveType } from './leave-request.entity';

const inclusiveDays = (start: string, end: string) =>
  (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;

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
    const year = Number(dto.startDate.slice(0, 4));
    if (year !== Number(dto.endDate.slice(0, 4))) {
      throw new BadRequestException('Requests cannot span calendar years');
    }
    const overlaps = await this.repo.existsBy({
      userId,
      status: In([LeaveStatus.Pending, LeaveStatus.Approved]),
      startDate: LessThanOrEqual(dto.endDate),
      endDate: MoreThanOrEqual(dto.startDate),
    });
    if (overlaps)
      throw new ConflictException('Dates overlap an existing request');

    const allowance = ANNUAL_ALLOWANCE[dto.type];
    if (allowance !== null) {
      const used = (await this.usedDays(userId, year))[dto.type] ?? 0;
      const days = inclusiveDays(dto.startDate, dto.endDate);
      if (used + days > allowance) {
        throw new ConflictException(
          `Insufficient ${dto.type} balance: ${allowance - used} days remaining`,
        );
      }
    }
    return this.repo.save(this.repo.create({ ...dto, userId }));
  }

  async balance(userId: string, year = new Date().getUTCFullYear()) {
    const used = await this.usedDays(userId, year);
    return Object.values(LeaveType).map((type) => {
      const allowance = ANNUAL_ALLOWANCE[type];
      const usedDays = used[type] ?? 0;
      return {
        type,
        allowance,
        used: usedDays,
        remaining: allowance === null ? null : allowance - usedDays,
      };
    });
  }

  findPendingForManager(managerId: string) {
    return this.repo.find({
      where: { status: LeaveStatus.Pending, user: { managerId } },
      relations: { user: true },
      order: { startDate: 'ASC' },
    });
  }

  async decide(
    id: string,
    managerId: string,
    decision: LeaveStatus.Approved | LeaveStatus.Rejected,
  ) {
    if (!(await this.repo.existsBy({ id, user: { managerId } })))
      throw new NotFoundException();

    const { affected } = await this.repo.update(
      { id, status: LeaveStatus.Pending },
      { status: decision, decidedById: managerId, decidedAt: new Date() },
    );
    if (!affected) throw new ConflictException('Request is no longer pending');
    return this.repo.findOneByOrFail({ id });
  }

  private async usedDays(userId: string, year: number) {
    const rows = await this.repo
      .createQueryBuilder('r')
      .select('r.type', 'type')
      .addSelect('SUM(r.endDate - r.startDate + 1)', 'days')
      .where('r.userId = :userId', { userId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [LeaveStatus.Pending, LeaveStatus.Approved],
      })
      .andWhere('EXTRACT(YEAR FROM r.startDate) = :year', { year })
      .groupBy('r.type')
      .getRawMany<{ type: LeaveType; days: string }>();
    return Object.fromEntries(
      rows.map((r) => [r.type, Number(r.days)]),
    ) as Partial<Record<LeaveType, number>>;
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
