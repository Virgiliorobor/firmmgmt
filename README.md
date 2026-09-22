# Law firm management

Work visibility and decision support centered on the **managing partner**. English (US). Firm timezone **America/New_York**. This first version covers sign-in (TOTP), partner home, clients, Unassigned projects, the Projects list, project header, and session revocation.

SharePoint is the document store of record (ADR-001). Microsoft Graph is a stub in this local version. The application does not send client email.

Repository: [github.com/Virgiliorobor/firmmgmt](https://github.com/Virgiliorobor/firmmgmt)

## Stack

Next.js 15 App Router, TypeScript strict, Drizzle ORM, PostgreSQL 16 (or PGlite when `DATABASE_URL` is unset), Vitest, Playwright, Tailwind mapped only to CSS variables in `styles/tokens.css`.

## [DEVIATION] database for local/Windows

Docker is not required. If `DATABASE_URL` is a `postgres://` URL, the app uses Postgres. Otherwise it uses **PGlite** at `PGLITE_PATH` (default `.data/dev`). Vitest always uses in-memory PGlite. Schema stays portable PostgreSQL.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set at least:
   - `SESSION_SECRET` (32+ characters)
   - `FIELD_ENCRYPTION_KEY` (64 hex chars)
   - `AUTH_PROVIDER=totp-local`
   - Demo users (`DEMO_MANAGING_PARTNER_EMAIL`, `DEMO_MANAGING_PARTNER_PASSWORD` ≥ 12 chars, `DEMO_MANAGING_PARTNER_TOTP_SECRET` as a Base32 TOTP secret). Repeat for administrative manager, lawyer, and integration operator if you want those roles.
3. `npm install`
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev` → http://localhost:3847/sign-in

The app listens on **3847** (not 3000/8080) so it is less likely to collide with other services on the same server. Override with `PORT` only if that port is already taken.

Load the TOTP secret into an authenticator (issuer `TOTP_ISSUER`). Passwords and TOTP secrets must not be committed.

`SEED_ON_START=true` seeds demo users when the Node server boots (used by Playwright).

## Tests

```
npx tsc --noEmit
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright `@smoke`: login → partner-home → create project → see it on Projects and Unassigned. It uses the demo TOTP path (not a skipped auth bypass).

## Env names

See `.env.example` (build_plan §6): `NODE_ENV`, `DATABASE_URL`, `APP_BASE_URL`, `FIRM_TIMEZONE`, `FIRM_LOCALE`, `DEDICATED_INTAKE_ADDRESS`, `SESSION_SECRET`, `SESSION_IDLE_HOURS`, `AUTH_PROVIDER`, `MICROSOFT_*`, `TOTP_ISSUER`, `GRAPH_*`, `FIELD_ENCRYPTION_KEY`, `STAGING_COPY_*`, `ALLOWED_UPLOAD_MIME`, `MAX_UPLOAD_BYTES`, `LOG_LEVEL`, `SENTRY_DSN`, `CORS_ORIGINS`, `RATE_LIMIT_MAX_PER_MINUTE`, `LOCKOUT_FAILURES`. Extra local keys: `PGLITE_PATH`, `SEED_ON_START`, `GIT_SHA`, `DEMO_*`.

## Modules

`modules/{id}`: db, event-bus, audit-log, auth, policy, rate-limit, web-app, client, project, practice-area, firm-settings. Cross-module writes go through the outbox. Next.js `app/` is the HTTP composition root for web-app.

Public routes: `/sign-in`, `/api/health`, `/api/auth/totp/*`, `/api/auth/microsoft/callback`, `/api/webhooks/graph`. Unauthenticated `/projects` and `/api/*` return 401.

## Backup / restore / rollback

Coolify daily Postgres backup is an owner hosting action. Restore application data by restoring Postgres (or replacing the PGlite directory). Restoring the database does **not** restore SharePoint files or Microsoft grants. Rollback: deploy a previous `main` SHA.

## Staff personal data (PRIV-1)

Export or delete **staff login** rows (`users`, `sessions`, `totp_credentials`) with a documented admin query. Never delete client work tables in application code.

## Deploy (Coolify, Docker Compose)

Use **Docker Compose**, not a lone Dockerfile resource. `docker-compose.yaml` starts the app and PostgreSQL 16 on one private network. The app stays 12-factor: same image, same env names, later Azure is a different host, not a rewrite.

### Coolify clicks

1. Stop or delete the previous **Dockerfile-only** resource for this repo if it exists (it had no Postgres).
2. **+ New** → **Resource** → **Docker Compose** (empty / from a Git repository).
3. Repository: `https://github.com/Virgiliorobor/firmmgmt`, branch `main`.
4. Compose file: `/docker-compose.yaml` (Coolify’s default). Base Directory: `/`.
5. On the **`app`** service Domains field, enter `https://YOUR-DOMAIN:3847`. The `:3847` is the **container** port for Coolify’s proxy. Public HTTPS stays 443. Do not publish a host port.
6. Persistent Storage on **`app`**: leave **off**. Postgres already has the `postgres-data` volume in Compose. Do not add an app volume.
7. Environment (Build/Runtime). Generate secrets on your machine, then paste:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use that once for `SESSION_SECRET`. Run it again for `POSTGRES_PASSWORD` (letters and numbers only, so the URL stays valid). For `FIELD_ENCRYPTION_KEY` use 64 hex chars (the same command already prints 64 hex).

| Name | Value |
|---|---|
| `POSTGRES_USER` | `lfm` |
| `POSTGRES_PASSWORD` | the generated password |
| `POSTGRES_DB` | `firmmgmt` |
| `APP_BASE_URL` | `https://YOUR-DOMAIN` (no `:3847`) |
| `SESSION_SECRET` | 64 hex from the command |
| `FIELD_ENCRYPTION_KEY` | 64 hex from a second run |
| `AUTH_PROVIDER` | `totp-local` |
| `SEED_ON_START` | `true` for the first deploy if you set demo users |
| `DEMO_MANAGING_PARTNER_EMAIL` | a test address you control |
| `DEMO_MANAGING_PARTNER_PASSWORD` | ≥ 12 characters |
| `DEMO_MANAGING_PARTNER_TOTP_SECRET` | Base32 TOTP secret (e.g. `JBSWY3DPEHPK3PXP` for local demo only) |

Do **not** set `DATABASE_URL` (Compose builds it as `postgres://lfm:…@postgres:5432/firmmgmt`). Do **not** set `PGLITE_PATH`, `PORT=3000`, or a host port mapping.

If a previous deploy left Postgres **unhealthy**, delete the Compose volume `postgres-data` (or the whole resource volumes) before redeploying. An empty `POSTGRES_PASSWORD` on first boot can leave a bad data directory. Set `POSTGRES_PASSWORD` in Coolify; the file default `lfm-demo-change-me` is only so the container can start.

8. Deploy. Health is `GET /api/health`. Sign-in is `https://YOUR-DOMAIN/sign-in`.
9. After the first successful login, set `SEED_ON_START=false` so later deploys do not keep reseeding.

### Azure later (no product change)

Same Dockerfile and env names. Differences are hosting only:

| | Coolify now | Azure later |
|---|---|---|
| App | Compose service `app` | Container Apps or App Service from the same image |
| Database | Compose `postgres` + volume | Azure Database for PostgreSQL — set `DATABASE_URL` to that URL and do not run the Compose `postgres` service |
| Public TLS | Coolify proxy | Azure Front Door / Container Apps ingress |
| Listen port | `3847` (avoids other VPS apps) | `PORT` from Azure (often `8080`); the app already reads `PORT` |
| Identity / files | TOTP now; Graph stub | Same `MICROSOFT_*` / `GRAPH_*` names when the tenant is ready |

GitHub Actions: typecheck, lint, unit/integration, build, image build, `npm audit`, gitleaks.

## API (S01)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | DB ping, outbox heartbeat, SHA |
| POST | `/api/auth/totp/start` | email + password → challenge_id |
| POST | `/api/auth/totp/verify` | challenge_id + code, or email + password + code |
| POST | `/api/auth/logout` | revoke current session |
| GET | `/api/auth/microsoft/callback` | stub 501 |
| GET/POST | `/api/clients` | list / create |
| GET/POST | `/api/projects` | list / create Unassigned |
| GET | `/api/projects/:id` | header fields; operator 404 |
| GET | `/api/sessions` | own sessions |
| POST | `/api/sessions/:id/revoke` | revoke |
