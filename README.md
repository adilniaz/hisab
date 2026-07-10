# Hisab

Hisab (Urdu/Hindi for "account" or "ledger") is a donation and distribution tracker for small charitable organizations. It records who donated, whether the donation is pooled or earmarked for a specific recipient, and where every rupee was ultimately distributed — with role-based access control and per-user data scoping.

## Features

- **Donors & donations** — record cash/bank/EasyPaisa/JazzCash donations, pooled or designated (Zakat, Sadaqah, general, other), with optional anonymity.
- **Recipients & distributions** — track distributions against a specific designated donation or the general pool, with a server-enforced balance check so a distribution can never exceed what's actually available.
- **Reports** — donor statements, recipient histories, and full audit reports, exportable to PDF and Excel.
- **Role-based access** — `ADMIN` / `DATA_ENTRY` / `VIEWER` roles, plus optional per-user scoping (`RESTRICTED` to specific donors/recipients vs `ALL`).
- **Dashboard** — pool balance, unspent designated funds, recent activity, and a 6-month trend chart.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma 7](https://www.prisma.io) with the Postgres driver adapter
- [NextAuth v5](https://authjs.dev) (credentials provider, JWT sessions)
- Tailwind CSS v4 + shadcn-style components
- react-hook-form + Zod for form validation
- Vitest for tests

> **Note for contributors/agents:** this project pins a Next.js version with breaking changes from what's in most training data — notably, route middleware is `proxy.ts`, not `middleware.ts`. See [AGENTS.md](./AGENTS.md) before making framework-level changes.

## Getting started

### Prerequisites

- Docker + Docker Compose (recommended — both dev and prod scripts run through it)
- Node 24 if you want to run tooling (lint, tests, `prisma` CLI) outside a container

### Environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Prisma, when running outside Docker | Full Postgres connection string |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `docker-compose.yml` | The prod compose file fails fast if `POSTGRES_PASSWORD` isn't set — don't reuse the dev default |
| `AUTH_SECRET` | NextAuth | Generate with `openssl rand -hex 32`; the prod compose file fails fast if this isn't set |
| `AUTH_URL` | NextAuth | Public URL of the app |
| `NODE_ENV` | Next.js | `development` or `production` |

### Development

```bash
npm run dev
```

Runs `docker compose -f docker-compose.dev.yml up --build` — builds the app, starts Postgres, applies migrations, seeds the database, and runs `next dev` with hot reload on [http://localhost:3000](http://localhost:3000).

### Production

```bash
npm run start
```

Runs `docker compose up --build` — builds a standalone production image and starts it alongside Postgres. Requires `AUTH_SECRET` and `POSTGRES_PASSWORD` to be set in `.env` (see above); the compose file refuses to start with the old placeholder values.

## Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev stack via Docker Compose |
| `npm run start` | Start the prod stack via Docker Compose |
| `npm run build` | `next build` (used inside the prod Docker image) |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:run` | Vitest (watch mode / single run) |
| `npm run db:seed` | Seed the database (`prisma/seed.ts`) |

## Testing

```bash
npm run test:run
```

Unit tests live under `tests/`, mirroring the `app/`/`lib/` structure. Server actions are tested by mocking `@/lib/db` and `@/lib/permissions`; `tests/helpers/session.ts` provides a shared typed session builder. See [AGENTS.md](./AGENTS.md) for the conventions these tests follow.

## Database

Schema and migrations live under `prisma/`. Roles (`ADMIN`/`DATA_ENTRY`/`VIEWER`) and data scoping (`ALL`/`RESTRICTED` via `UserScope`) are enforced in `lib/permissions.ts`, not just in the UI. Most models use soft deletes (`deletedAt`) rather than hard deletes.

## Security

Authentication, authorization scoping, transactional balance checks, rate limiting, CSP/HSTS/security headers, and CSV export sanitization have all been reviewed and hardened — see the commit history for details on each fix. If you're deploying this yourself, rotate `AUTH_SECRET` and database credentials rather than reusing anything from `.env.example` or `docker-compose.dev.yml`.
