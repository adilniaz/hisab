# Infisical secrets

Implemented — see `scripts/docker-entrypoint.sh`, `.infisical.json`, and the
"Secrets (Infisical)" section of README.md / AGENTS.md for the full setup
flow. This file is just the secrets inventory, kept as a single point of
reference (mirrors bake_em_up's `docs/secrets.md`).

Project: dedicated Infisical project for hisab (separate from `trades` and
`bake_em_up`), same `eu.infisical.com` domain, `dev`/`prod` environments,
`main` branch mapped to `prod` (`.infisical.json`'s
`gitBranchToEnvironmentMapping`).

## Dev environment (Infisical `dev`)

| Var | Format / example |
|---|---|
| `DATABASE_URL` | `postgresql://hisab:hisab@hisab_db:5432/hisab` (Docker network hostname — see caveat below) |
| `AUTH_SECRET` | any string, e.g. `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3000` |
| `ADMIN_EMAIL` | `admin@hisab.local` |
| `ADMIN_PASSWORD` | any dev string, e.g. `hisab-dev-password` |

Dev values can mostly stay as the old `.env.example` placeholders — nothing
here needs to be a real secret.

## Prod environment (Infisical `prod`, mapped from `main` branch)

Same 5 var names, real values:

| Var | Format / example |
|---|---|
| `DATABASE_URL` | `postgresql://<user>:<real-password>@hisab_db:5432/<db>` — must embed the *same* password as `hisab_db`'s `POSTGRES_PASSWORD` (below, not in Infisical) |
| `AUTH_SECRET` | fresh `openssl rand -base64 32`, distinct from dev's |
| `AUTH_URL` | real public `https://` domain, not `localhost` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | real seed-admin credentials |

## Stays in `.env` / shell, not in Infisical

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` — bootstrap
  credentials for the `hisab_db` Postgres container itself. Docker Compose
  reads these from `.env`/the shell when starting the `hisab_db` service;
  Infisical secrets are only fetched *inside* the app container by
  `docker-entrypoint.sh`, so they can't reach `hisab_db`'s own
  `environment:` block. Keep `POSTGRES_PASSWORD` in sync with the password
  embedded in the `DATABASE_URL` secret above by hand.
- `INFISICAL_CLIENT_ID` / `INFISICAL_CLIENT_SECRET` / `INFISICAL_ENV` — the
  machine-identity credentials used to *reach* Infisical in the first place;
  naturally can't live inside Infisical. Exported in the host shell before
  `docker compose up`.
- `AUTH_TRUST_HOST` / `NODE_ENV` — not secrets, hardcoded directly in both
  compose files.

## Not applicable (no payment gateway integrations)

Unlike bake_em_up (Stripe/JazzCash/EasyPaisa gateway credentials), hisab's
`EASYPAISA`/`JAZZCASH` values are just a `PaymentMethod` enum recorded on
manually-entered donations — no gateway API keys, webhook secrets, or
`*_ENABLED` flags exist to manage.

## Open caveat

`DATABASE_URL`'s hostname (`hisab_db`) only resolves inside the Docker
Compose network. `dev:local` (bare `next dev` against a self-managed
Postgres) and `npm test` / `prisma migrate dev` don't go through Infisical
at all — they use `.env` / `.env.test` instead (see README.md / AGENTS.md).
Resolved deliberately here, unlike bake_em_up's still-open version of this
same caveat: Infisical is scoped to Docker-only flows for hisab, full stop.
