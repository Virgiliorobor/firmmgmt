# Law firm management

Work visibility and decision support centered on the **managing partner**. English (US). Firm timezone **America/New_York**. This first version covers sign-in (TOTP), partner home, clients, Unassigned projects, the Projects list, project header, and session revocation.

SharePoint is the document store of record (ADR-001). Microsoft Graph is a stub in this local version. The application does not send client email.

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
6. `npm run dev` → http://localhost:3000/sign-in

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

Coolify daily Postgres backup is an owner hosting action (not in this local version). Restore application data by restoring Postgres (or replacing the PGlite directory). Restoring the database does **not** restore SharePoint files or Microsoft grants. Rollback: deploy a previous `main` SHA. Staging is not configured until `deployment_config.md` is filled.

## Staff personal data (PRIV-1)

Export or delete **staff login** rows (`users`, `sessions`, `totp_credentials`) with a documented admin query. Never delete client work tables in application code.

## Deploy

Dockerfile is multi-stage, non-root (`USER nextjs`), health at `/api/health`. GitHub Actions: typecheck, lint, unit/integration, build, image build, `npm audit`, gitleaks. Owner will create the GitHub remote later — do not invent a URL. `src/` may be its own git repo; do not push until the owner says so.

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
