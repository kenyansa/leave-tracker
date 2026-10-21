import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register({ name, email, password }: RegisterDto) {
    if (await this.users.existsByEmail(email)) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const { id, role } = await this.users.create({ name, email, passwordHash });
    return { id, name, email, role };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.users.findForLogin(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
    };
  }
}
