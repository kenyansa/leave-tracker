import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>) {
    return this.repo.save(this.repo.create(data));
  }

  existsByEmail(email: string) {
    return this.repo.existsBy({ email });
  }

  findForLogin(email: string) {
    return this.repo.findOne({
      where: { email },
      select: { id: true, role: true, passwordHash: true },
    });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }
}
