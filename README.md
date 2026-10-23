# Leave Tracker

A small HR leave-management app. Employees request leave and see their balance. Managers approve or reject requests from their direct reports.

**Stack:** Angular (standalone, signals, Tailwind) · NestJS · PostgreSQL · Docker

## Run it

```bash
cp .env.example .env            # then set JWT_SECRET (openssl rand -hex 64)
docker compose up --build
./scripts/demo-data.sh          # creates a manager and an employee
```

- App: http://localhost:8080
- API: http://localhost:3000
- Demo logins (password `password123`): `ann@demo.com` (manager), `bob@demo.com` (employee, reports to Ann)

## Develop locally

```bash
docker compose up -d db
cd api && cp .env.example .env && npm ci && npm run start:dev
cd web && npm ci && npx ng serve        # http://localhost:4200
```

`api/.env` needs `DATABASE_URL=postgres://leave:leave@127.0.0.1:5433/leave_tracker` and a `JWT_SECRET`.

## Running Migrations

```bash
npm run migration:run
```

Reverting:

```bash
npm run migration:revert
```

## Tests

The API has end-to-end tests that run against a real PostgreSQL database.

```bash
docker compose exec db psql -U leave -d leave_tracker -c "CREATE DATABASE leave_tracker_test;"
cd api && npm run test:e2e
```

They cover authentication, role checks, ownership, overlap detection, balance limits, and manager scoping. Dates are derived from next year, so they pass whenever they run.

## Architecture

```mermaid
flowchart LR
  Browser[Angular SPA] -->|REST + JWT| API[NestJS API]
  API --> DB[(PostgreSQL)]
```

**API modules:** `auth` (register, login, guards), `users`, `leave` (requests, balance, approvals).

**Data model**

| Table            | Key columns                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `users`          | id, name, email, passwordHash, role (`employee` / `manager`), managerId      |
| `leave_requests` | id, userId, type, startDate, endDate, status, reason, decidedById, decidedAt |

**Endpoints**

| Method | Path                                      | Access                         |
| ------ | ----------------------------------------- | ------------------------------ |
| POST   | `/auth/register`, `/auth/login`           | public                         |
| POST   | `/auth/refresh`                           | public, needs refresh cookie   |
| POST   | `/auth/logout`                            | public, revokes refresh cookie |
| GET    | `/leave/me`, `/leave/balance?year=`       | authenticated                  |
| POST   | `/leave`                                  | authenticated                  |
| PATCH  | `/leave/:id/cancel`                       | owner, pending only            |
| GET    | `/leave/pending`                          | manager (own reports)          |
| PATCH  | `/leave/:id/approve`, `/leave/:id/reject` | manager (own reports)          |

## Design decisions

- **Secure by default.** A global JWT guard protects every route. Only routes marked `@Public()` are open, so forgetting a decorator makes a route private, not public.
- **Authorization is enforced in queries.** A manager can only decide requests from their direct reports, and cancel looks up `id` and `userId` together. Other people's requests return 404.
- **Balance is derived**, not stored. Used days are summed from pending and approved requests, so the balance cannot drift from the data. Pending days count as used, which reserves them.
- **Atomic decisions.** Approve and reject use a conditional `UPDATE ... WHERE status = 'pending'`, so two simultaneous decisions cannot both succeed.
- **Cancel is a status change.** Requests are kept for audit, not deleted.
- **Server owns the rules.** The frontend reloads from the API after every change and shows the server's error messages, so there is one copy of the business rules.
- **Registration cannot set a role.** The DTO has no `role` field and unknown fields are stripped.
- **Short-lived access tokens, rotating refresh tokens.** The access token lives 15 minutes, in memory only. The refresh token is an opaque value in an httpOnly, SameSite=Strict cookie scoped to `/auth`, stored hashed in the database. Each refresh rotates it, and replaying a used token revokes the whole token family.

## Known limitations

- A failed refresh (including a network blip) signs the user out, and there is no proactive refresh before expiry.
- Expired and revoked refresh-token rows are never cleaned up. A scheduled job would fix this.
- Login and refresh have no rate limiting.
- Migrations run at application start. With several instances, run them as a separate deploy step.
- Overlap and balance checks can race under simultaneous requests from the same user. The fix is a Postgres exclusion constraint on the date range, or a row lock inside a transaction.
- Days are counted as calendar days, with no weekends or public holidays.
- No pagination, no registration screen, no user management.
- The API URL is baked into the frontend build. Production would put both behind one reverse proxy on the same origin.

## How I used AI tools

I built this with Claude as a pair-programming partner. I chose the stack (Angular, NestJS, Tailwind, PostgreSQL) and the scope, and we worked in small steps: backend first, then frontend, with a commit after each step.

**What AI did:**

- It proposed the project structure and data model, wrote the first version of each module, wrote the e2e test suite, and drafted the Dockerfiles.

**What I did:**

- I ran every step myself, tested each endpoint with curl and in the browser before moving on, debugged my local environment, and decided what to keep.

**Where it was wrong or incomplete, and how it was caught:**

- A DTO class that redeclared an inherited property failed to compile under TypeScript 6. The compiler caught it, and I split the DTOs.
- The generated Nest scaffold used ESM settings that clashed with the CommonJS build. I traced it to `tsconfig.json` and `package.json` and reverted to CommonJS.
- The balance endpoint always used the current year. A failing e2e test exposed it, and I added a `?year=` parameter.

**How I verified the code:**

- The e2e tests run against a real PostgreSQL database, and cover authentication, roles, ownership, overlap and balance rules, and manager scoping. I also tried the failure cases by hand (wrong password, expired token, someone else's request).

**What I would not trust AI output for without checking:**

- Security-sensitive code (auth, role checks, query scoping), library versions, and anything involving dates and time zones.
