<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: hisab

A donation/distribution tracker (donors, donations, recipients, distributions, reports) for a small charitable org. See [README.md](./README.md) for what it does and how to run it.

## Architecture

- All source lives under `src/` (standardized layout shared with bake_em_up/cookbook). `src/app/(auth)` — login. `src/app/(dashboard)` — the authenticated app (overview, donations, donors, recipients, distributions, reports, users, profile). `src/app/api/export` — a standalone CSV export route.
- `src/proxy.ts` is this Next.js version's route-gating file (the renamed `middleware.ts`) — it checks the JWT with `getToken()`, re-validates `active`/`tokenVersion` against the DB, enforces ADMIN-only access to `/admin` and `/reports`, sets the shared security headers, and redirects unauthenticated requests to `/login`. Don't create a `middleware.ts`; it won't run. (CSP stays in `next.config.ts`.)
- `src/lib/auth.ts` — NextAuth v5 credentials provider (24h JWT sessions, `AUTH_*` env vars, audit logging via `src/lib/audit.ts`). `src/lib/permissions.ts` — the authorization layer: `requireAuth()`, `requireAuthApi()`, `canModify()`, `donorFilter()`, `recipientFilter()`.
- `src/lib/prisma.ts` exports the `prisma` singleton (renamed from `lib/db.ts`'s `db` — same client, standardized name).
- `src/lib/balance.ts` — the single source of truth for donation/pool balance math. It accepts an optional Prisma client argument so the same functions serve read-only dashboard queries (default client) and the Serializable transaction in `distributions/actions.ts` (passed `tx`). Don't reimplement balance math elsewhere.

## Conventions worth knowing before touching auth/data code

- **Every server action must call `requireAuth()`.** Actions that return a single record by ID (`getDonation`, `getDistribution`, donor/recipient statements, etc.) must also apply `donorFilter(session)` / `recipientFilter(session)` — list-view actions already do this; single-record reads are where this has been missed before. See `donations/actions.ts`'s `getDonation()` for the reference pattern.
- **Mutations that check-then-write must do it inside `prisma.$transaction(..., { isolationLevel: "Serializable" })`.** A separate read-then-write without a transaction is a race condition, not just a style preference — see `distributions/actions.ts`'s `assertWithinBalance`.
- **Soft deletes.** Most models have `deletedAt` instead of hard deletes; filter `deletedAt: null` in every list/read query, including nested `include`s.
- **Client-side Zod schemas must match the server schema**, especially for ID fields (`.uuid()` vs a plain non-empty string) — a looser client schema just means the user finds out about invalid input from a raw server error instead of an inline form message.
- Form components catch submission errors with a shared `getErrorMessage(e)` helper (`src/lib/utils.ts`) rather than `catch (e: any) { e.message }`, which throws if the rejection isn't an `Error`.

## Testing

- Vitest. Server action tests mock `@/lib/prisma` and `@/lib/permissions` (not `@/lib/auth` directly — its NextAuth-generated types have overloaded call signatures that fight `vi.mocked()`'s type inference).
- `tests/helpers/session.ts` has a shared `mkSession(role, scopeType)` for building a typed `Session` in tests (includes `tokenVersion: 0`).
- When mocking `prisma.$transaction`, mock it to invoke the callback with the mock object (`vi.fn((cb) => cb(mockDb))`) so the code under test sees the same mocked methods whether it goes through `tx` or `prisma` directly.
- Prisma model return shapes are large; mocking a partial shape needs a cast on the resolved value in most cases — use `as never` (ESLint's `no-explicit-any` rejects `as any`), and don't cast where it's avoidable (e.g. a mock a caller never reads the resolved value of — just omit `.mockResolvedValue()` and let it resolve `undefined`).

## Known environment constraint

No live Postgres is available in this sandboxed dev environment by default. If you need to change `prisma/schema.prisma`, hand-author the matching migration SQL under `prisma/migrations/<timestamp>_<name>/migration.sql` (see `20260710140000_add_performance_indexes` for the pattern) instead of running `prisma migrate dev`, and validate with `prisma validate` / `prisma format` / `prisma generate` instead.
