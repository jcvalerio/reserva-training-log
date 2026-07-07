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
