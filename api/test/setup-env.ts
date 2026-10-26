process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://leave:leave@127.0.0.1:5432/leave_tracker_test';
process.env.JWT_SECRET = 'test-secret';
