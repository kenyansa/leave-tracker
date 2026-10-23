import * as bcrypt from 'bcrypt';
import { In } from 'typeorm';
import dataSource from './data-source';
import { LeaveRequest, LeaveStatus, LeaveType } from './leave/leave-request.entity';
import { Role, User } from './users/user.entity';

const PASSWORD = 'password123';

const users = [
  { name: 'Ann', email: 'ann@demo.com', role: Role.Manager },
  { name: 'Bob', email: 'bob@demo.com', role: Role.Employee, manager: 'ann@demo.com' },
  { name: 'Cara', email: 'cara@demo.com', role: Role.Employee, manager: 'ann@demo.com' },
];

async function seed() {
  await dataSource.initialize();
  await dataSource.runMigrations();

  const repo = dataSource.getRepository(User);
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const ids = new Map<string, string>();

  for (const { manager, ...data } of users) {
    const existing = await repo.findOneBy({ email: data.email });
    const saved = await repo.save({
      ...existing,
      ...data,
      passwordHash,
      managerId: manager ? ids.get(manager)! : null,
    });
    ids.set(saved.email, saved.id);
  }

  const year = new Date().getUTCFullYear() + 1;
  const ann = ids.get('ann@demo.com')!;
  const requests = dataSource.getRepository(LeaveRequest);

  await requests.delete({ userId: In([...ids.values()]) });
  await requests.save([
    { userId: ids.get('bob@demo.com')!, type: LeaveType.Annual, startDate: `${year}-03-02`, endDate: `${year}-03-06`, reason: 'Family trip' },
    { userId: ids.get('bob@demo.com')!, type: LeaveType.Sick, startDate: `${year}-02-10`, endDate: `${year}-02-11`, status: LeaveStatus.Approved, decidedById: ann, decidedAt: new Date() },
    { userId: ids.get('cara@demo.com')!, type: LeaveType.Annual, startDate: `${year}-04-14`, endDate: `${year}-04-18`, reason: 'Wedding' },
  ]);
}

seed()
  .then(() => console.log('Seeded demo users and leave requests'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => dataSource.isInitialized && dataSource.destroy());