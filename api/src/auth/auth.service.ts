import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { RefreshToken } from './refresh-token.entity';

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectRepository(RefreshToken)
    private readonly tokens: Repository<RefreshToken>,
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
    return this.issue(user, randomUUID());
  }

  async refresh(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException();

    const stored = await this.tokens.findOneBy({ tokenHash: sha256(rawToken) });
    if (!stored) throw new UnauthorizedException();

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId); // a used token came back: assume it was stolen
      throw new UnauthorizedException();
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException();

    const { affected } = await this.tokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    const user = await this.users.findById(stored.userId);
    if (!affected || !user) throw new UnauthorizedException();

    return this.issue(user, stored.familyId);
  }

  async logout(rawToken?: string) {
    if (!rawToken) return;
    const stored = await this.tokens.findOneBy({ tokenHash: sha256(rawToken) });
    if (stored) await this.revokeFamily(stored.familyId);
  }

  private async issue(user: Pick<User, 'id' | 'role'>, familyId: string) {
    const refreshToken = randomBytes(32).toString('base64url');
    await this.tokens.save(
      this.tokens.create({
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      }),
    );
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    });
    return { accessToken, refreshToken };
  }

  private revokeFamily(familyId: string) {
    return this.tokens.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
