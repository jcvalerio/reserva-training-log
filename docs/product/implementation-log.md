# Implementation Log

Living checkpoint for small iterations. Update this after every task iteration so the project can be paused and resumed with context.

## 2026-07-18 — Seeded preview mobile boundary polish

Status: completed.

Validation outcome:
- Working tree was clean at iteration start; `next-env.d.ts` was not dirty.
- Real-device iPhone validation was not available in the agent environment, so the `/plan` complete-state preview was reviewed statically for iPhone-sized touch targets and copy.
- The screen remains read-only and non-AI: no AI call, no plan persistence, no draft acceptance, and no activation.

Implemented:
- Switched remaining visible `/plan` AI labels to Spanish-first IA copy.
- Added deterministic seeded-preview boundary badges: Solo lectura, Sin IA, No guardado, and No activable.
- Improved the expandable exercise summary tap target and hint copy for mobile review.
- Documented non-AI draft persistence boundaries before any future accept/edit/activate work.

Verification:
- `npm run test` passes: 12 files, 28 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Validate `/plan` complete-state seeded preview on a real iPhone with tester data. If clear, the next small step can add an explicit non-AI draft acceptance design only; do not start AI plan generation or persist/activate a plan yet.

## 2026-07-18 — Seeded preview exercise details

Status: completed.

Implemented:
- Expanded the deterministic plan preview summary to include week-1 exercise-level targets: order, phase, side mode, sets, rep range, numeric RIR, rest, pain-sensitive flag, and substitutions.
- Updated `/plan` with iPhone-friendly expandable session details so complete onboarding users can inspect the seeded preview without persistence or activation.
- Added explicit future set-log field badges: kg, reps, RIR, dolor, and notas opcionales.
- Documented the current non-AI preview scaffold in `docs/specs/generated-plan-contract.md`.
- Updated unit coverage for preview exercise targets and required set-log fields.

Verification:
- `npm run test` passes: 12 files, 28 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Real-device sanity check of expandable seeded preview details on iPhone. If clear, the next small step can define non-AI draft persistence boundaries before implementing any accept/edit action. Do not start AI plan generation yet.

## 2026-07-18 — Seeded plan preview scaffold

Status: completed.

Implemented:
- Added a deterministic seeded-plan preview summary helper for non-persisted plan review scaffolding.
- Updated `/plan` to show a compact “Vista previa no guardada” section only when Perfil, Pesos base, and Mediciones are complete.
- The preview uses the existing seeded hypertrophy plan, shows week-1 session summaries and safety badges, and explicitly says it is not AI-generated, not persisted, and not activatable yet.
- Added unit coverage for seeded preview summary counts.

Verification:
- `npm run test` passes: 12 files, 28 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Real-device sanity check of the complete-state `/plan` preview on iPhone, then decide whether to add manual edit/accept scaffolding or keep validating onboarding data. Do not start AI plan generation yet.

## 2026-07-18 — Non-AI plan readiness polish

Status: completed.

Validation outcome:
- Confirmed the working tree was clean after reverting the generated `next-env.d.ts` dev-types rewrite.
- Reviewed `/plan` implementation and deterministic readiness states for iPhone-sized use with incomplete foundation state and complete Perfil + Pesos base + Mediciones state.
- The screen remains a non-AI readiness gate only: no AI call, no generated-plan persistence, and no plan activation.

Implemented:
- Clarified `/plan` copy so CTA actions are explicitly safe and only open pending onboarding steps or return to Inicio.
- Improved pending/ready state labels: Plan waits for bases when incomplete and becomes “Revisión no-AI” only after the foundations are complete.
- Added compact mobile status tiles for Bases, AI, and Plan state, plus slightly tighter small-width padding and clearer checklist pill styling.
- Updated deterministic readiness/gate tests for the safer CTA and state copy.

Verification:
- `npm run test` passes: 11 files, 27 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Real-device sanity check of the polished `/plan` copy on iPhone after tester data entry, then continue with non-AI plan review scaffolding only if prioritized. Do not start AI plan generation yet.

## 2026-07-18 — iPhone dev-origin configuration

Status: completed.

Issue:
- iPhone local-network testing against `http://192.168.68.69:3000` hit Next.js dev-resource cross-origin blocking for `__nextjs_font/geist-latin.woff2` and HMR websocket retries.
- Login from a phone also requires the auth base URL and Google OAuth redirect URL to match the host used on the phone.

Implemented:
- Added `NEXT_ALLOWED_DEV_ORIGINS` parsing for `next.config.ts` so local LAN hosts can be allowed without hardcoding environment-specific IPs in source.
- Documented iPhone local-network testing in `README.md`, including `npm run dev -- --hostname 0.0.0.0` and the OAuth host/redirect requirement.
- Added `.env.example` guidance for `NEXT_ALLOWED_DEV_ORIGINS`.
- Added deterministic coverage for parsing comma-separated dev origins.

Verification:
- `npm run test` passes: 11 files, 27 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Restart local dev with `NEXT_ALLOWED_DEV_ORIGINS="192.168.68.69"` in `.env.local` and validate iPhone page load.
- For iPhone Google login, set `BETTER_AUTH_URL` to the same reachable host and add the matching Google OAuth redirect URL, or use a stable HTTPS preview/tunnel if Google rejects private LAN IP callbacks.

## 2026-07-18 — Non-AI plan readiness screen

Status: completed.

Manual validation note:
- Login and logout workflows were tested successfully before this iteration.

Implemented:
- Added authenticated `/plan` page as a non-AI readiness/review gate.
- The plan screen summarizes Perfil, Pesos base, Mediciones, and Plan state without generating or persisting any plan.
- Added deterministic plan gate helper that always keeps `canGenerateAi=false` and guides incomplete users back to the next onboarding step.
- Updated home navigation so Plan is now a real link to the readiness screen, while Entrenar and Progreso remain disabled until a plan/session flow exists.
- Included pain-aware progression reminder on the plan readiness screen.

Verification:
- `npm run test` passes: 10 files, 25 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Manually validate `/plan` on an iPhone-sized viewport with both incomplete and complete onboarding states.
- If `/plan` copy is clear, the next small vertical slice can be non-AI plan persistence/review scaffolding or seeded fallback review only; do not call AI generation yet.

## 2026-07-18 — Home navigation availability polish

Status: completed.

Implemented:
- Made the signed-in/signed-out home navigation explicit about which destinations are available now versus future MVP areas.
- Kept Inicio, Perfil, Pesos base, and Mediciones as navigable onboarding routes.
- Marked Plan, Entrenar, and Progreso as disabled guidance with Spanish reasons instead of making them look like working links.
- Added deterministic coverage for implemented versus disabled home navigation items.

Verification:
- `npm run test` passes: 9 files, 23 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Manual validation step: sign in on an iPhone-sized viewport, confirm the home readiness CTA and disabled nav labels are clear, then walk `/perfil` → `/baseline` → `/mediciones` with tester data.
- If validation passes, document tester notes and only then consider non-AI plan-review scaffolding. Do not start AI plan generation yet.

## 2026-07-17 — Authenticated onboarding polish

Status: completed.

Implemented:
- Added a deterministic primary CTA to the M1 readiness helper so signed-in home guides the next safe onboarding step without starting AI plan generation.
- Polished signed-in readiness cards for small iPhone widths with clearer wrapping, touch targets, and focus rings.
- Clarified `/perfil`, `/baseline`, and `/mediciones` copy around profile-first navigation, replacement/history behavior, partial data, and the fact that AI plan generation is not triggered yet.
- Added an explicit empty/pending state for missing baseline weights.

Verification:
- `npm run test` passes: 8 files, 21 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Validate the polished flows on a real iPhone-sized browser with authenticated tester data.
- Continue non-AI onboarding foundations or plan-review scaffolding only when prioritized; do not start AI plan generation yet.

## 2026-07-17 — Onboarding readiness guidance

Status: completed.

Implemented:
- Added signed-in home guidance for M1 readiness: Perfil, Pesos base, Mediciones, and Plan.
- Used authenticated profile, baseline, and measurement data to mark foundation steps as ready, pending, or blocked.
- Kept the Plan step explicitly `No iniciado` and did not start AI plan generation.
- Added deterministic readiness helper coverage for blocked, complete, and partial onboarding states.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 8 files, 21 tests.
- `npm run build` passes.

Next iteration:
- Manually validate the signed-in home, `/perfil`, `/baseline`, and `/mediciones` flows on an iPhone-sized viewport.
- Continue non-AI foundations; do not start AI plan generation yet.

## 2026-07-06 — Body measurement tracking

Status: completed.

Implemented:
- Added `body_measurement` Drizzle table and migration for historical body measurements tied to an athlete profile.
- Added authenticated `/mediciones` page linked from the home shell.
- Added Spanish-first iPhone-friendly measurement form with optional date/time, weight, waist, left/right thigh, calf, arm, and notes.
- Preserved history by inserting a new measurement row on every save; previous rows are never overwritten.
- Allowed partial measurement saves while requiring at least one numeric measurement.
- Displayed recent measurement history plus derived left-minus-right thigh and calf gaps.
- Added recommended cadence copy: cada 2 semanas.
- Added unit coverage for measurement validation and gap calculation.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 7 files, 18 tests.
- `npm run build` passes.
- `npm run db:generate` created `drizzle/0004_old_spiral.sql`.
- `npm run db:migrate` applied `drizzle/0004_old_spiral.sql` successfully against the configured Neon development database.

Next iteration:
- Validate `/mediciones` manually on iPhone-sized viewport with a tester profile.
- Continue with non-AI progress foundations; do not start AI plan generation yet.

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

## 2026-07-06 — Authenticated athlete profile foundation

Status: completed.

Implemented:
- Added authenticated `/perfil` onboarding page for the core athlete context fields.
- Added server action to validate and save the current user's athlete profile.
- Added profile repository helpers that query by authenticated owner and assert ownership before returning/updating records.
- Added Spanish-first profile validation defaults for 5 days/week, 60-minute sessions, hypertrophy, mobility/fat-loss secondary goals, aggressive pain-aware progression, and Costa Rica timezone.
- Linked the home shell Perfil nav item to the authenticated profile route.
- Added unit coverage for profile parsing defaults and temporary note composition for limitations/priorities until dedicated tables exist.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 5 files, 11 tests.
- `npm run build` passes.

Next iteration:
- Confirm Google OAuth end-to-end locally and create/update a tester profile through `/perfil`.
- Add dedicated persistence for limitations and muscle priorities, or continue with baseline working-weight intake if the profile flow is sufficient for M1 testing.

## 2026-07-06 — Dedicated profile details persistence

Status: completed.

Implemented:
- Added Drizzle tables and migration for `limitation` and `muscle_priority` records tied to `athlete_profile` with cascade deletes and profile indexes.
- Updated `/perfil` to load and preserve existing limitations/priorities from dedicated rows instead of folding them into general notes.
- Updated profile save logic to replace the current profile's limitations/priorities from one-item-per-line text areas.
- Kept conservative MVP defaults for structured fields: unknown limitation side/body region, moderate severity, pain tracking required, high muscle priority, and no side focus.
- Updated data model docs with the MVP line-based input behavior.
- Added unit coverage for multiline normalization.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 5 files, 11 tests.
- `npm run build` passes.
- `npm run db:migrate` applied `drizzle/0002_simple_wolf_cub.sql` successfully against the configured Neon development database.

Next iteration:
- Confirm Google OAuth end-to-end locally and create/update a tester profile through `/perfil`.
- Start baseline working-weight intake with kg, reps, sets, RIR, pain score, notes, and unilateral left/right support.

## 2026-07-06 — Baseline working-weight intake

Status: completed.

Implemented:
- Added `exercise` and `baseline_lift` Drizzle tables with a migration for the MVP baseline catalog and onboarding working weights.
- Added authenticated `/baseline` page linked from the home shell.
- Added Spanish-first baseline form for the suggested key exercises with bilateral and unilateral left/right rows.
- Added server action/repository logic to require an athlete profile, lazily upsert the suggested exercise catalog, and replace the tester's current baseline entries.
- Added deterministic validation requiring at least one completed baseline row while allowing individual exercises to be skipped.
- Enforced complete baseline rows: kg, reps, sets, numeric RIR 0-4, pain score 0-10, side, and optional notes.
- Added unit coverage for baseline parsing, required pain/RIR, skipped exercises, and unilateral left/right data preservation.
- Updated data model docs with the MVP exercise catalog and baseline intake behavior.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 6 files, 14 tests.
- `npm run build` passes.
- `npm run db:migrate` applied `drizzle/0003_silky_stark_industries.sql` successfully against the configured Neon development database.

Next iteration:
- Confirm Google OAuth end-to-end locally and create/update tester profile + baseline through `/perfil` and `/baseline`.
- Add body measurement tracking with left/right thigh/calf gaps and history preservation.
