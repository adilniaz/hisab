<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: hisab

Hisab (Urdu/Hindi for "account" or "ledger") is a donation/distribution tracker for a small charitable org. It records who donated, whether the donation is pooled or earmarked for a specific recipient, and where every rupee was ultimately distributed — with role-based access control and per-user data scoping. See [README.md](./README.md) for the human-facing overview; this file is the complete agent-facing reference (this file is what Claude Code auto-loads via `CLAUDE.md`'s `@AGENTS.md` import — README.md is **not** auto-loaded, so anything an agent needs is folded in here too, even if it duplicates README.md).

## Feature overview

- **Donors & donations** — record cash/bank/EasyPaisa/JazzCash donations, pooled or designated (Zakat, Sadaqah, general, other context), with optional anonymity.
- **Recipients & distributions** — track distributions against a specific designated donation or the general pool, with a server-enforced balance check so a distribution can never exceed what's actually available.
- **Reports** — donor statements, recipient histories, and full audit reports, exportable to PDF and Excel. A separate `/api/export` route provides CSV exports (donations/distributions/donors/recipients), rate-limited per admin.
- **Role-based access** — `ADMIN` / `DATA_ENTRY` / `VIEWER` roles, plus optional per-user scoping (`RESTRICTED` to specific donors/recipients vs `ALL`). See the Conventions section below for exactly how scope is enforced.
- **Dashboard** — pool balance, unspent designated funds, a Zakat-overdue alert (designated Zakat donations >40 days old with undistributed funds), recent activity, and a 6-month trend chart.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Prisma 7](https://www.prisma.io) with the Postgres driver adapter (`@prisma/adapter-pg`)
- [NextAuth v5](https://authjs.dev) (credentials provider, JWT sessions, 24h maxAge)
- Tailwind CSS v4 + shadcn-style components (`src/components/ui/`)
- react-hook-form + Zod for form validation
- `@react-pdf/renderer` (PDF reports) and `exceljs` (Excel reports/exports)
- Vitest for tests (unit + DB-integration)

## Secrets (Infisical)

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` are
managed by [Infisical](https://infisical.com) (EU Cloud, `.infisical.json` at
repo root) for both Docker flows (`npm run dev` → `docker-compose.dev.yml`,
`npm run start` → `docker-compose.yml`). `scripts/docker-entrypoint.sh`
authenticates via Universal Auth (`INFISICAL_CLIENT_ID`/`INFISICAL_CLIENT_SECRET`,
exported in the host shell — required, both compose files fail fast if unset),
exports secrets with `infisical export`, runs `prisma migrate deploy`, and
(when `INFISICAL_ENV != "prod"`, default `"dev"`) seeds the admin user before
`exec`-ing the container's CMD. Prod stays a manual seed step:
`docker compose exec hisab npx tsx prisma/seed.ts`.

`DATABASE_URL`'s stored value uses the Docker network hostname (`hisab_db`),
so it only resolves inside Compose — `dev:local` / `npm test` / `prisma
migrate dev` don't go through Infisical at all and keep using `.env` /
`.env.test` instead (see below).

## Environment variables (`.env` — local/non-Docker use only)

Copy `.env.example` to `.env` and fill in real values before running anything outside Docker. Docker-based app runs get `DATABASE_URL`/`AUTH_*`/`ADMIN_*` from Infisical instead (see above) — `.env` here only bootstraps the `hisab_db`/`db_test` Postgres containers' own credentials and supplies non-Docker tooling (`dev:local`, tests, `prisma migrate dev`).

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Prisma, when running outside Docker | Full Postgres connection string |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `docker-compose.yml` (bootstraps the `hisab_db` container) | Must match the password embedded in the `DATABASE_URL` secret stored in Infisical |
| `AUTH_SECRET` | NextAuth, when running outside Docker | Generate with `openssl rand -hex 32` (or `-base64 32`) |
| `AUTH_URL` | NextAuth, when running outside Docker | Public URL of the app |
| `AUTH_TRUST_HOST` | NextAuth, when running outside Docker | Must be `"true"` when running behind a reverse proxy (e.g. Caddy); set directly in both compose files (not a secret) for Docker flows |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `prisma/seed.ts`, when running outside Docker | Seeds the initial admin user |
| `NODE_ENV` | Next.js | `development` or `production` |

`.env.test` / `.env.test.example` are the integration-test-only equivalents — see Testing below.

## Available npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev stack via Docker Compose (`docker-compose.dev.yml`) — builds the app, starts Postgres, applies migrations, seeds the DB, runs `next dev` with hot reload on port 3000 |
| `npm run dev:local` | `next dev` directly, no Docker (needs a reachable `DATABASE_URL`) |
| `npm run build` | `next build` (used inside the prod Docker image) |
| `npm run start` | Start the prod stack via Docker Compose (`docker-compose.yml`) — requires `POSTGRES_PASSWORD` in `.env` and `INFISICAL_CLIENT_ID`/`INFISICAL_CLIENT_SECRET` exported in the shell |
| `npm run start:local` | `next start` directly, no Docker |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, writes `src/` and `tests/` |
| `npm run db:seed` | Seed the database (`prisma/seed.ts`, uses `ADMIN_EMAIL`/`ADMIN_PASSWORD`) |
| `npm run prisma:migrate:dev` | `prisma migrate dev` — do not use in this sandboxed dev environment, see Known environment constraint below |
| `npm run prisma:migrate:deploy` | `prisma migrate deploy` — apply pending migrations without prompting |
| `npm run prisma:generate` | `prisma generate` |

## Deployment (Caddy / HTTPS)

- Production runs via `docker-compose.yml`: app publishes on host port **3002** (cookbook uses 3000, bake_em_up uses 3001, on the same host), Postgres is bound to `127.0.0.1:5434`.
- The app already sends its own HSTS header (`src/proxy.ts`: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`) and its own CSP (`next.config.ts`). Caddy's job is TLS termination and routing only — don't add a second HSTS header in the Caddyfile.
- Minimal Caddyfile: `reverse_proxy localhost:3002` under the app's domain block. If Caddy itself runs in Docker, use `network_mode: host` and mount the Caddyfile plus `caddy_data`/`caddy_config` volumes.
- Set the `AUTH_URL` secret in Infisical's `prod` environment to the public `https://` domain, and `AUTH_TRUST_HOST=true` (in `docker-compose.yml`) — NextAuth's callback/cookie handling depends on both being correct behind a reverse proxy.
- Verify after cutover: `curl -sI https://<domain> | grep -i strict-transport-security` should show the header exactly once — a duplicate usually means a Caddyfile `header` directive is also adding it.

## Architecture

- All source lives under `src/` (standardized layout shared with bake_em_up/cookbook). `src/app/(auth)` — login. `src/app/(dashboard)` — the authenticated app (overview, donations, donors, recipients, distributions, reports, users, profile). `src/app/api/export` — a standalone CSV export route.
- `src/proxy.ts` is this Next.js version's route-gating file (the renamed `middleware.ts`) — it checks the JWT with `getToken()`, re-validates `active`/`tokenVersion` against the DB, enforces ADMIN-only access to `/admin` and `/reports`, sets the shared security headers, and redirects unauthenticated requests to `/login`. Don't create a `middleware.ts`; it won't run. (CSP stays in `next.config.ts`.)
- `src/lib/auth.ts` — NextAuth v5 credentials provider (24h JWT sessions, `AUTH_*` env vars, audit logging via `src/lib/audit.ts`). `src/lib/permissions.ts` — the authorization layer: `requireAuth()`, `requireAuthApi()`, `canModify()`, `donorFilter()`, `recipientFilter()`.
- `src/lib/prisma.ts` exports the `prisma` singleton (renamed from `lib/db.ts`'s `db` — same client, standardized name).
- `src/lib/balance.ts` — the single source of truth for donation/pool balance math. It accepts an optional Prisma client argument so the same functions serve read-only dashboard queries (default client) and the Serializable transaction in `distributions/actions.ts` (passed `tx`). Don't reimplement balance math elsewhere.

## Conventions worth knowing before touching auth/data code

- **Every server action must call `requireAuth()`.** Actions that return a single record by ID (`getDonation`, `getDistribution`, donor/recipient statements, etc.) must also apply `donorFilter(session)` / `recipientFilter(session)` — list-view actions already do this; single-record reads are where this has been missed before. See `donations/actions.ts`'s `getDonation()` for the reference pattern.
- **Scope applies to writes too.** Non-ADMIN-gated mutations that target a specific donor/recipient (`createDonation`, `updateDonor`, `updateRecipient`, `createDistribution`) must call `assertDonorInScope(session, donorId)` / `assertRecipientInScope(session, recipientId)` (`src/lib/permissions.ts`) before writing, so a RESTRICTED user can't create or modify records attached to entities outside their read scope. Both helpers are no-ops for ALL-scope users.
- **Mutations that check-then-write must do it inside `prisma.$transaction(..., { isolationLevel: "Serializable" })`.** A separate read-then-write without a transaction is a race condition, not just a style preference — see `distributions/actions.ts`'s `assertWithinBalance`.
- **Soft deletes.** Most models have `deletedAt` instead of hard deletes; filter `deletedAt: null` in every list/read query, including nested `include`s.
- **Client-side Zod schemas must match the server schema**, especially for ID fields (`.uuid()` vs a plain non-empty string) — a looser client schema just means the user finds out about invalid input from a raw server error instead of an inline form message.
- Form components catch submission errors with a shared `getErrorMessage(e)` helper (`src/lib/utils.ts`) rather than `catch (e: any) { e.message }`, which throws if the rejection isn't an `Error`.

## Testing

- Vitest. Server action tests mock `@/lib/prisma` and `@/lib/permissions` (not `@/lib/auth` directly — its NextAuth-generated types have overloaded call signatures that fight `vi.mocked()`'s type inference).
- `tests/helpers/session.ts` has a shared `mkSession(role, scopeType)` for building a typed `Session` in tests (includes `tokenVersion: 0`).
- When mocking `prisma.$transaction`, mock it to invoke the callback with the mock object (`vi.fn((cb) => cb(mockDb))`) so the code under test sees the same mocked methods whether it goes through `tx` or `prisma` directly.
- Prisma model return shapes are large; mocking a partial shape needs a cast on the resolved value in most cases — use `as never` (ESLint's `no-explicit-any` rejects `as any`), and don't cast where it's avoidable (e.g. a mock a caller never reads the resolved value of — just omit `.mockResolvedValue()` and let it resolve `undefined`).
- **DB-integration tests** (`tests/integration/`, mirroring cookbook's pattern) hit a real, ephemeral Postgres instead of mocks: `docker compose -f docker-compose.dev.yml up -d db_test` (port 5434, `hisab_test`, tmpfs-backed), copy `.env.test.example` to `.env.test` if you haven't, then `npx prisma migrate deploy` (with `.env.test` loaded — `set -a; source .env.test; set +a` first) after pulling a new migration. `tests/helpers/db.ts#resetDb()` truncates all tables in FK order and refuses to run unless `DATABASE_URL` contains `hisab_test`; call it in `beforeEach`. `vitest.config.ts` loads `.env.test` itself and runs test files serially (`fileParallelism: false`) since they share one DB.

## Known environment constraint

No persistent dev Postgres is available in this sandboxed dev environment by default (the ephemeral `db_test` container above is test-only, torn down/reset freely). If you need to change `prisma/schema.prisma`, hand-author the matching migration SQL under `prisma/migrations/<timestamp>_<name>/migration.sql` (see `20260710140000_add_performance_indexes` for the pattern) instead of running `prisma migrate dev`, and validate with `prisma validate` / `prisma format` / `prisma generate` instead — then apply it to `db_test` with `prisma migrate deploy` to confirm it's well-formed before committing.
