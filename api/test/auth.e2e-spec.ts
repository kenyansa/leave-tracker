import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Refresh tokens (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const credentials = { email: 'dana@test.com', password: 'password123' };

  const setCookies = (res: request.Response) =>
    res.headers['set-cookie'] as unknown as string[];
  const refreshCookie = (res: request.Response) =>
    setCookies(res)
      .find((c) => c.startsWith('refresh_token='))!
      .split(';')[0];

  const login = () => http().post('/auth/login').send(credentials).expect(200);
  const refresh = (cookie: string) =>
    http().post('/auth/refresh').set('Cookie', cookie);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    await app
      .get(DataSource)
      .query(
        'TRUNCATE users, leave_requests, refresh_tokens RESTART IDENTITY CASCADE',
      );
    await http()
      .post('/auth/register')
      .send({ name: 'Dana', ...credentials })
      .expect(201);
  });

  afterAll(() => app.close());

  it('sets an httpOnly, strict, /auth-scoped cookie and keeps the refresh token out of the body', async () => {
    const res = await login();
    const cookie = setCookies(res)[0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/auth/);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  it('includes the registered name in the access token', async () => {
    const { accessToken } = (await login()).body as { accessToken: string };
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString(),
    ) as { name: string };

    expect(payload.name).toBe('Dana');
  });

  it('rotates the refresh token and returns a working access token', async () => {
    const first = refreshCookie(await login());
    const res = await refresh(first).expect(200);

    expect(refreshCookie(res)).not.toBe(first);
    const { accessToken } = res.body as { accessToken: string };
    await http()
      .get('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('rejects a refresh without a cookie', () =>
    http().post('/auth/refresh').expect(401));

  it('revokes the whole family when a used token is replayed', async () => {
    const original = refreshCookie(await login());
    const rotated = refreshCookie(await refresh(original).expect(200));

    await refresh(original).expect(401);
    await refresh(rotated).expect(401);
  });

  it('rejects an expired refresh token', async () => {
    const cookie = refreshCookie(await login());
    await app
      .get(DataSource)
      .query(
        `UPDATE refresh_tokens SET "expiresAt" = now() - interval '1 minute'`,
      );
    await refresh(cookie).expect(401);
  });

  it('revokes the token on logout', async () => {
    const cookie = refreshCookie(await login());
    await http().post('/auth/logout').set('Cookie', cookie).expect(204);
    await refresh(cookie).expect(401);
  });
});
