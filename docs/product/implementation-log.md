# Implementation Log

Living checkpoint for small iterations. Update this after every task iteration so the project can be paused and resumed with context.

## 2026-07-06 — Stack decision locked

Status: completed.

Decisions:
- Hosting: Vercel.
- App: Next.js App Router, React, TypeScript strict, Tailwind.
- Database: Neon Postgres.
- ORM/migrations: Drizzle ORM + Drizzle Kit.
- Auth: Better Auth, starting with Google OAuth only for the tester group.
- AI: Vercel AI SDK with a Gemini Flash-class model behind an adapter.
- Validation/guardrails: Zod plus deterministic server-side validation before persistence.

Rationale:
- Prioritizes free/low-cost personal use over fastest SaaS setup.
- Keeps data and auth tables in owned Postgres.
- Avoids Supabase platform features until storage/realtime/Auth are actually needed.
- Favors explicit TypeScript/SQL-shaped code that coding agents can modify safely.

Next iteration:
- Bootstrap the Next.js app in the repository.
- Add initial dependencies and scripts.
- Verify local build/lint/test where possible.

## 2026-07-06 — Next.js app bootstrapped

Status: completed.

Implemented:
- Bootstrapped Next.js 16.2 App Router with React 19, TypeScript strict, Tailwind CSS 4, and ESLint.
- Added stack dependencies: Drizzle ORM/Kit, Neon serverless driver, Better Auth, next-intl, Vercel AI SDK, Google AI SDK, and Zod.
- Added test tooling: Vitest, React Testing Library, jsdom, and Playwright configured for iPhone 14 Pro Max.
- Added Spanish-first mobile landing page at `/` with MVP navigation labels and every-set logging fields.
- Added locale constants and a unit test preserving Spanish default plus English support.
- Added Better Auth route scaffold at `/api/auth/[...all]` with Google OAuth enabled only when env vars are present.
- Added Drizzle schema for Better Auth core tables plus initial `athlete_profile` table.
- Generated initial Drizzle migration in `drizzle/0000_thankful_the_call.sql`.
- Added `.env.example` for local/Vercel environment setup without secrets.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- `npm run db:generate` created the initial migration.

Notes:
- `npm install` reports moderate transitive vulnerability audit warnings from the current dependency tree; no production code secrets were added.
- Playwright browsers were not installed or executed in this iteration.
- Real auth/database runtime requires Neon `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and Google OAuth env vars.

Next iteration:
- Create Neon project and Google OAuth credentials, then configure Vercel/local env vars.
- Run `npm run db:migrate` against Neon.
- Implement real Google sign-in UI and authenticated ownership helpers.

## 2026-07-06 — MVP release workflow selected

Status: completed.

Decision:
- Do not add a long-lived `develop` branch for the MVP.
- Use `main` as the always-releasable production branch.
- Use short-lived `feature/*` and `fix/*` branches for implementation work.
- Keep production and development data separate with distinct Neon database URLs.
- Vercel production env points to production resources; local and preview envs point to development resources.

Rationale:
- Reduces branch and release overhead for a personal-use-first MVP.
- Preserves the important safety boundary: no feature branch should use the production database.
- Keeps release simple: pass checks, merge to `main`, deploy to production.

Docs updated:
- Added `docs/architecture/release-workflow.md`.
- Linked the workflow from `README.md`.
- Updated deployment notes in `docs/architecture/technical-stack.md`.

Next iteration:
- Configure Neon production/development database URLs in Vercel and local `.env.local`.
- Confirm Google OAuth redirect URLs for localhost and production.
- Run the initial migration against the development database first.

## 2026-07-06 — Node version pinned

Status: completed.

Implemented:
- Added `.nvmrc` with Node `v24.18.0` to keep local agent/developer runtime consistent with the current project bootstrap.
- Updated local development instructions to run `nvm use` before installing or starting the app.

Notes:
- `next-env.d.ts` can be rewritten by `next dev` between `.next/dev/types` and `.next/types`; this generated change was reverted and should not be treated as a feature change.

Next iteration:
- Configure Neon production/development database URLs in Vercel and local `.env.local`.
- Confirm Google OAuth redirect URLs for localhost and production.
- Run the initial migration against the development database first.

## 2026-07-06 — Gap analysis corrective pass

Status: completed.

Validated and addressed the correctness-blocking documentation review before continuing M1/M3 work.

Implemented:
- Locked RIR as numeric `0 | 1 | 2 | 3 | 4`, where `4` displays as `4+` in the UI.
- Made pain thresholds authoritative: `pain >2` blocks aggressive progression, `pain >3` reduces/modifies/swaps, and `pain >=7` stops/avoids with professional-guidance copy if persistent.
- Added generated plan contract docs and runtime Zod schema in `src/plans/generated-plan-schema.ts`.
- Added seeded fallback plan in `src/plans/seeded-plan.ts` so AI failure does not block field testing.
- Added rule-based progression engine skeleton with tests for increase, pain hold, pain reduce/modify, and sharp rep drop.
- Added runtime environment parsing in `src/env.ts` and wired auth/db/AI provider config through it.
- Added Drizzle `$onUpdateFn` for `updatedAt` columns.
- Added athlete profile `timezone`, defaulting to `America/Costa_Rica`.
- Added Node/npm `engines` to `package.json`.
- Added GitHub Actions CI for lint, typecheck, unit tests, and build.
- Added Drizzle migration `drizzle/0001_safe_speed.sql` for the timezone column.

Docs updated:
- `docs/architecture/data-model.md`
- `docs/architecture/technical-stack.md`
- `docs/product/milestones.md`
- `docs/product/open-questions.md`
- `docs/product/progression-rules.md`
- `docs/product/session-logging-ux.md`
- `docs/specs/first-features.md`
- `docs/specs/generated-plan-contract.md`

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 3 files, 6 tests.
- `npm run build` passes.

Next iteration:
- Run `npm run db:migrate` against the development Neon database first.
- Confirm Better Auth Google callback locally.
- Implement real sign-in UI and authenticated ownership helpers.

## 2026-07-06 — Drizzle local env loading fixed

Status: completed.

Issue:
- `npm run db:migrate` failed because `drizzle.config.ts` read `process.env.DATABASE_URL` directly, while Next.js-style `.env.local` files are not loaded automatically by Drizzle Kit.

Implemented:
- Updated `drizzle.config.ts` to load `.env.local` or `.env` with Node `process.loadEnvFile()` before reading `DATABASE_URL`.
- Added a clear error if `DATABASE_URL` is still missing.
- Updated README migration instructions to note that `.env.local` is used.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run db:migrate` applied migrations successfully against the configured Neon database.

Next iteration:
- Confirm Better Auth Google callback locally.
- Implement real sign-in UI and authenticated ownership helpers.

## 2026-07-06 — Google sign-in UI and ownership helpers

Status: completed.

Implemented:
- Added server auth helpers for Better Auth session lookup, required-user redirects, and Google OAuth configuration checks.
- Replaced the placeholder landing CTA with a working Google sign-in client button.
- Added signed-in/signed-out home shell behavior with active-session copy and sign-out support.
- Added privacy-preserving ownership helpers to assert/filter user-owned resources before future profile queries.
- Added unit coverage for ownership helper behavior.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 4 files, 9 tests.
- `npm run build` passes.

Next iteration:
- Confirm Better Auth Google callback locally with the configured Google OAuth credentials.
- Start the athlete profile foundation behind authenticated ownership checks.
