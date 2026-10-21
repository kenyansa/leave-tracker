import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Leave Tracker API (e2e)', () => {
  let app: INestApplication;
  let ann: string; // manager
  let bob: string; // employee, reports to ann
  let cara: string; // employee, no manager
  let bobRequestId: string;

  const http = () => request(app.getHttpServer());
  const password = 'password123';

  // Always next year, so dates stay in the future whenever the tests run.
  const year = new Date().getUTCFullYear() + 1;
  const date = (monthDay: string) => `${year}-${monthDay}`;

  const signUp = (name: string) =>
    http()
      .post('/auth/register')
      .send({ name, email: `${name}@test.com`, password })
      .expect(201);

  const login = async (name: string) => {
    const res = await http()
      .post('/auth/login')
      .send({ email: `${name}@test.com`, password })
      .expect(200);
    return `Bearer ${(res.body as { accessToken: string }).accessToken}`;
  };

  const requestLeave = (
    token: string,
    startDate: string,
    endDate: string,
    type = 'annual',
  ) =>
    http()
      .post('/leave')
      .set('Authorization', token)
      .send({ type, startDate, endDate });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const db = app.get(DataSource);
    await db.query('TRUNCATE users, leave_requests RESTART IDENTITY CASCADE');

    await Promise.all(['ann', 'bob', 'cara'].map(signUp));
    await db.query(
      `UPDATE users SET role = 'manager' WHERE email = 'ann@test.com'`,
    );
    await db.query(
      `UPDATE users SET "managerId" = (SELECT id FROM users WHERE email = 'ann@test.com') WHERE email = 'bob@test.com'`,
    );
    [ann, bob, cara] = await Promise.all(['ann', 'bob', 'cara'].map(login));
  });

  afterAll(() => app.close());

  describe('auth and roles', () => {
    it('ignores a role sent at registration', async () => {
      const res = await http()
        .post('/auth/register')
        .send({ name: 'eve', email: 'eve@test.com', password, role: 'manager' })
        .expect(201);
      expect(res.body).toMatchObject({ role: 'employee' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('rejects a duplicate email', () =>
      http()
        .post('/auth/register')
        .send({ name: 'ann', email: 'ann@test.com', password })
        .expect(409));

    it('rejects a wrong password', () =>
      http()
        .post('/auth/login')
        .send({ email: 'bob@test.com', password: 'wrong-password' })
        .expect(401));

    it('requires a token on protected routes', () =>
      http().get('/leave/me').expect(401));

    it('forbids employees from manager routes', () =>
      http().get('/leave/pending').set('Authorization', bob).expect(403));
  });

  describe('leave requests', () => {
    it('creates a pending request', async () => {
      const res = await requestLeave(bob, date('03-01'), date('03-05')).expect(
        201,
      );
      expect(res.body).toMatchObject({ status: 'pending', type: 'annual' });
      bobRequestId = (res.body as { id: string }).id;
    });

    it('rejects overlapping dates', () =>
      requestLeave(bob, date('03-03'), date('03-08')).expect(409));

    it('rejects an end date before the start date', () =>
      requestLeave(bob, date('04-10'), date('04-05')).expect(400));

    it('rejects a request that exceeds the balance', () =>
      requestLeave(bob, date('04-01'), date('04-17')).expect(409));

    it('rejects a request that spans two calendar years', () =>
      requestLeave(bob, `${year}-12-30`, `${year + 1}-01-02`).expect(400));

    it('reports the remaining balance', async () => {
      const res = await http()
        .get(`/leave/balance?year=${year}`)
        .set('Authorization', bob)
        .expect(200);
      expect(res.body).toContainEqual({
        type: 'annual',
        allowance: 21,
        used: 5,
        remaining: 16,
      });
    });

    it("hides other users' requests on cancel", () =>
      http()
        .patch(`/leave/${bobRequestId}/cancel`)
        .set('Authorization', cara)
        .expect(404));

    it('frees the dates once a request is cancelled', async () => {
      const created = await requestLeave(
        cara,
        date('06-01'),
        date('06-02'),
      ).expect(201);
      const { id } = created.body as { id: string };

      const cancelled = await http()
        .patch(`/leave/${id}/cancel`)
        .set('Authorization', cara)
        .expect(200);
      expect(cancelled.body).toMatchObject({ status: 'cancelled' });

      await requestLeave(cara, date('06-01'), date('06-02')).expect(201);
    });
  });

  describe('manager approvals', () => {
    it("lists only the manager's reports' pending requests", async () => {
      const res = await http()
        .get('/leave/pending')
        .set('Authorization', ann)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect((res.body as { id: string }[])[0].id).toBe(bobRequestId);
    });

    it("cannot decide a request from someone who isn't a report", async () => {
      const created = await requestLeave(
        cara,
        date('05-03'),
        date('05-04'),
      ).expect(201);
      const { id } = created.body as { id: string };
      await http()
        .patch(`/leave/${id}/approve`)
        .set('Authorization', ann)
        .expect(404);
    });

    it('approves a request from a report', async () => {
      const res = await http()
        .patch(`/leave/${bobRequestId}/approve`)
        .set('Authorization', ann)
        .expect(200);
      expect(res.body).toMatchObject({ status: 'approved' });
      expect((res.body as { decidedById: string }).decidedById).toBeTruthy();
    });

    it('cannot decide the same request twice', () =>
      http()
        .patch(`/leave/${bobRequestId}/approve`)
        .set('Authorization', ann)
        .expect(409));

    it('cannot cancel an approved request', () =>
      http()
        .patch(`/leave/${bobRequestId}/cancel`)
        .set('Authorization', bob)
        .expect(409));

    it('rejects a request from a report', async () => {
      const created = await requestLeave(
        bob,
        date('08-03'),
        date('08-04'),
      ).expect(201);
      const { id } = created.body as { id: string };

      const res = await http()
        .patch(`/leave/${id}/reject`)
        .set('Authorization', ann)
        .expect(200);
      expect(res.body).toMatchObject({ status: 'rejected' });
    });
  });
});
