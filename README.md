# ClickUp Automation Backend

NestJS backend for automating ClickUp time entries.

## Stack

- NestJS 11
- Node.js 20
- PostgreSQL 16 via TypeORM migrations
- Redis Cloud-ready provider for queues/cache/locks
- Docker Compose for API + Postgres

## Local Development

```bash
npm install
npm run start:dev
```

## Docker Development

```bash
docker compose up --build
```

Services:

- API: `http://localhost:4000`
- Health: `http://localhost:4000/health`
- Swagger: `http://localhost:4000/docs`
- Postgres: `localhost:5432`

Default Postgres credentials:

```text
POSTGRES_DB=clickup_automation
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
```

Redis is intentionally not started in Docker Compose. Add Redis Cloud values to `.env.development`.

## Architecture

The structure follows the McBreen backend style:

```text
src/
  common/       shared filters, middleware, cache, constants, helpers
  config/       centralized env configuration
  dto/          request/response DTOs by module
  entities/     TypeORM entities
  jobs/         scheduled jobs
  providers/    db and redis providers
  routes/       feature modules
  swagger/      OpenAPI setup
```

Initial feature modules:

- `auth`
- `clickup`
- `tasks`
- `automation-rules`
- `audit`
- `job-trigger`
- `time-entry-sync` scheduled job

## Authentication

Users normally create an application account with `POST /api/auth/signup` and later sign in with `POST /api/auth/login`. Both endpoints return a 15-minute bearer access token and store a rotating refresh token in an HttpOnly cookie. Send cookie-enabled requests to `POST /api/auth/refresh` to renew the access token.

After signup, connect the user's personal ClickUp token once with:

```text
POST /api/clickup/token/connect
DELETE /api/clickup/token
```

The token is validated against ClickUp, encrypted before storage, and never returned by the API. Deleting it pauses affected rules while preserving the user's connection, workspace, task, rule, and run data.

ClickUp OAuth and `POST /api/auth/clickup/token-login` remain available as a legacy migration path. Legacy users can set their first password through `POST /api/auth/password/setup`. Configure OAuth with this callback URL:

```text
http://localhost:4000/api/auth/clickup/callback
```

Set `CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET`, `CLICKUP_REDIRECT_URI`, `JWT_ACCESS_SECRET`, and `ENCRYPTION_KEY` in `.env.development`. Start login by navigating the browser to:

```text
GET /api/auth/clickup/authorize
```

## API Surface

- `POST /api/auth/signup` and `POST /api/auth/login` - email/password account sessions
- `POST /api/auth/password/setup` - one-time password setup for legacy users
- `POST /api/clickup/token/connect` and `DELETE /api/clickup/token` - connect, replace, or remove the encrypted personal token
- `GET /api/dashboard` - dashboard summary, performance, activity, and queued rules
- `GET /api/clickup/workspaces` - authorized ClickUp workspaces
- `POST /api/clickup/workspaces/:id/sync` - synchronize assigned task snapshots
- `GET /api/tasks` - paginated task search and filtering
- `/api/automation-rules` - rule CRUD, status, previews, executions, runs, and backfill
- `/api/automation-runs/:id` - approve, reject, or retry a run
- `/api/audit` - execution history, summary, details, and CSV export
- `/api/settings` - timezone, schedule, workspace, and default-duration preferences
- `POST /api/job-trigger/time-entry-sync` - internal-key-protected scheduler trigger

Durations are represented as integer minutes. Calendar dates use `YYYY-MM-DD`, and timestamps use ISO-8601 UTC strings. Swagger is available at `http://localhost:4000/docs`.

## Automation Safety

- Test a saved rule with `POST /api/automation-rules/:id/preview`, then confirm a real write with `POST /api/automation-rules/:id/execute` for the same `targetDate`.
- Existing time is calculated across the authenticated user's entire selected workspace day.
- `skip` only writes when the day has no existing time.
- `top_up` writes only the missing minutes.
- `approval` creates an awaiting-approval run and writes only after explicit approval.
- Overlapping active rules are rejected, and rule/date uniqueness makes execution idempotent.
- The scheduler runs every five minutes and processes yesterday after each user's local run time.
- Historical backfill requires a signed preview and is limited to 31 days.

## Database

Schema changes are migration-only. `synchronize` is disabled.

```bash
npm run migration:run
```

The initial migration creates users, ClickUp connections, workspace/task snapshots, automation rules, automation rule runs, and audit logs.
