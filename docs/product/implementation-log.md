# Implementation Log

Living checkpoint for small iterations. Update this after every task iteration so the project can be paused and resumed with context.

## 2026-07-28 — Today's-session UI and per-set RIR/pain logging (Slice 2)

Status: completed.

Context:
- Direct continuation of Slice 1, confirmed working by the user in real usage (activated the seeded plan via `/plan`, saw "Tu plan activo"). This slice delivers the actual stated goal: recording training progress using RIR.
- Two UX decisions were confirmed with the user via mockup previews before implementation: (1) `/entrenar` highlights the next incomplete session as a suggestion but also lists every session manually-pickable, since the plan has no calendar dates; (2) the logging screen is a one-exercise-at-a-time wizard (matching `docs/product/session-logging-ux.md`'s documented ideal), not an all-exercises-on-one-page form.

Implemented:
- Added a unique index on `exercise_log(workout_session_id, exercise_prescription_id)` (migration `drizzle/0006_easy_thena.sql`) so first-set-of-an-exercise creation can use the same `onConflictDoNothing` race-closing pattern proven in Slice 1's plan activation.
- Added `src/workouts/`: `workout-repository.ts` (session start/resume, ownership-scoped fetch, run-details loader joining exercise/set logs, server-authoritative set-number computation, session completion), `set-log-schema.ts` (Zod validation mirroring `baseline-schema.ts`'s style), `session-progress.ts` (pure, unit-tested: session status derivation, suggested-session selection, week-grouped view-model builder for the picker).
- Added `/entrenar` (`src/app/entrenar/page.tsx` + `entrenar-page-content.tsx`): suggested-session card plus full week-by-week list with status badges (No iniciada / En progreso / Completada); an empty state links to `/plan` when there's no active plan yet.
- Added `/entrenar/[sessionId]` (`session-runner.tsx`, a client wizard): one exercise at a time, "Anterior"/"Siguiente ejercicio" navigation, per-set form (weight/reps default from the exercise's last logged set or target rep max, RIR defaults to the exercise's target RIR, pain defaults to 0, side toggle only for unilateral exercises defaulting to whichever side has fewer logged sets), inline save confirmation, and a pain->=7 warning banner. A completed session renders a read-only summary instead of forms.
- Departed from this app's usual redirect-per-save form convention for `saveSetAction`: it uses React 19's `useActionState` (validate, persist, `revalidatePath`, return a result — no redirect) since a tester logs many sets per sitting and a full navigation per set would be jarring. `startOrResumeSessionAction` and `completeSessionAction` keep the existing redirect convention since those are one-shot, page-leaving actions.
- Every entry point taking a client-supplied `workoutSessionId` re-verifies it belongs to the current user's profile via a `WHERE id = ? AND athleteProfileId = ?` query (no separate assertion helper needed — `src/lib/ownership.ts` is typed for resources with a literal `userId` field, which none of the domain tables have).
- Turned "Entrenar" from a disabled nav stub into a real link (`src/app/home-nav.ts`).
- Updated `docs/product/session-logging-ux.md` with an "Implemented" note and known deviations (no rest timer, no exercise-swap action yet, weight has no plan-level target to default from).

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 20 files, 64 tests (added `session-progress.test.ts`, `set-log-schema.test.ts`, `entrenar-page-content.test.tsx`, `session-runner.test.tsx`; updated `home-nav.test.ts` and `mobile-bottom-nav.test.tsx` for the nav change).
- `npm run build` passes; `/entrenar` and `/entrenar/[sessionId]` compile as dynamic routes.
- `npm run db:generate` produced one clean single-statement migration (the new unique index only); reviewed before applying. `npm run db:migrate` applied successfully against dev.
- Did not perform an end-to-end browser click-through against the real tester account in this iteration — left as the user's manual step, same as Slice 1.

Next iteration:
- See `docs/product/next-task.md` for candidate next steps (progression-suggestion UI, progress history, real-device validation, or a custom plan builder) — no single one was assumed; it's presented as an open decision.

## 2026-07-28 — Persist and activate the seeded plan (Slice 1)

Status: completed.

Context:
- User goal: reach a point where they can manually create a training plan and start recording progress with an RIR approach. Clarified "manually create" to mean activating the existing seeded hypertrophy template as-is (no custom exercise-picker builder yet), scoped as two slices. This is Slice 1: persistence + activation only. Slice 2 (today's-session UI + per-set RIR/pain logging) is the next task.
- This intentionally supersedes the prior guardrail that said not to add activate/workout-session/exercise-log/set-log behavior — that guardrail was protecting scope while onboarding foundations were being built.

Implemented:
- Added 4 new enums and 6 tables to `src/db/schema.ts`: `workoutPlan`, `planSessionTemplate`, `exercisePrescription` (used by this slice), plus `workoutSession`, `exerciseLog`, `setLog` (schema only, no application code reads/writes them yet — prep for Slice 2 so it doesn't need another migration).
- Added a partial unique index (`workout_plan_active_per_profile_idx`) enforcing at most one active plan per athlete profile, used both as a DB constraint and as the `onConflictDoNothing` arbiter that closes an activation race condition without needing multi-statement transactions (the `neon-http` driver in use doesn't support `db.transaction()`).
- Added `src/plans/plan-repository.ts`: `getActivePlanForProfile`, `activateSeededPlanForProfile` (idempotent — a second activation returns the existing plan instead of duplicating), and `toGeneratedWorkoutPlan` (a pure mapper that reconstructs the exact `GeneratedWorkoutPlan` Zod shape from relational rows and re-validates it, so the existing `getPlanPreviewSummary()` renderer could be reused unchanged for a persisted active plan).
- Added `src/app/plan/actions.ts` (`activatePlanAction`), mirroring the existing baseline/perfil/mediciones server-action pattern, with a server-side foundation-readiness re-check as defense in depth.
- Updated `/plan` to load the active plan (if any) and render it as "Tu plan activo" instead of the unsaved preview, with a `?saved=1` success banner. When no plan is active yet, the seeded preview keeps its existing read-only copy but now has an "Activar este plan" button beneath it.
- Generated and applied migration `drizzle/0005_tough_daredevil.sql` against the configured Neon development database.
- Updated `docs/specs/generated-plan-contract.md` to describe activation as implemented instead of future/out-of-scope.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 16 files, 38 tests (added `src/plans/plan-repository.test.ts` for the mapper round-trip/sort-order/null-coalescing behavior; extended `plan-page-content.test.tsx` with an active-plan render-path case).
- `npm run build` passes.
- `npm run db:generate` produced a single clean migration for all 6 tables + 4 enums; reviewed the SQL before applying. `npm run db:migrate` applied successfully.
- Did not perform an end-to-end browser/device activation click-through against the real tester account in this iteration — that write against the user's real dev-DB profile was left as their manual step rather than performed autonomously.

Next iteration:
- Slice 2 per `docs/product/next-task.md`: today's-session UI and per-set RIR/pain logging against the now-activated plan, using the already-created `workout_session`/`exercise_log`/`set_log` tables.
- Before that, it would help to have the user do the one manual pass this iteration deferred: sign in, complete foundations if needed, click "Activar este plan" on `/plan`, and confirm it shows "Tu plan activo" without duplicating on reload.

## 2026-07-19 — Mobile shell and baseline progress polish

Status: completed.

Implemented:
- Added a shared iPhone-first `AppShell` with persistent bottom navigation across Inicio, Perfil, Pesos base, Mediciones, and Plan.
- Replaced touch-hostile disabled nav spans with tappable/focusable disabled controls that show visible Spanish reasons for Entrenar and Progreso.
- Clarified the non-functional locale pill as `ES · EN pronto`.
- Added safe-area-aware sticky submit positioning and pending/disabled submit states for Perfil, Pesos base, and Mediciones.
- Added success/error banners after form actions using `?saved=1` and `?error=validation`, with server-action validation catches to avoid generic error pages for expected validation misses.
- Added a live Baseline progress card showing completed exercises/rows, a jump-to-pending link, and exercise anchors for the long optional scroll.

Verification:
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run test` passes: 15 files, 34 tests.
- `npm run build` passes.

Next iteration:
- Manually validate the shared bottom nav, form save feedback, safe-area sticky buttons, and Baseline progress anchors on a real iPhone with tester data. If this passes, continue with the remaining low-risk iPhone Web polish such as PWA manifest/home-screen install support.

## 2026-07-18 — Seeded preview validation harness

Status: completed.

Validation outcome:
- Working tree was clean at iteration start; `next-env.d.ts` was not dirty.
- Actual iPhone hardware was not available in the agent environment, so the real-device checklist in `docs/product/next-task.md` remains the required manual validation step.
- Added automated coverage for the iPhone-sized review intent without calling AI, persisting a plan, accepting/editing a draft, activating a plan, or creating workout/log/progression data.

Implemented:
- Extracted `/plan` UI into a pure `PlanPageContent` component so complete/incomplete review states can be tested deterministically.
- Added component coverage for complete-state read-only seeded preview copy, IA-off/Plan-sin-crear status, boundary badges, future set-log fields, exercise accordion expansion, exercise target details, and absence of accept/edit/activate/generate links.
- Added component coverage that the seeded preview remains hidden until Perfil, Pesos base, and Mediciones are complete.
- Switched remaining visible Spanish UX labels from AI/no-AI to IA/no-IA in plan readiness/home/profile copy.
- Updated `docs/product/next-task.md` to note the automated supplement while keeping real-iPhone validation as the next required step.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 13 files, 30 tests.
- `npm run build` passes.

Next iteration:
- Run the manual real-iPhone `/plan` complete-state validation with tester data using `docs/product/next-task.md`. If it passes, the next implementation task can design non-AI draft acceptance boundaries without persisting or activating a plan yet.

## 2026-07-18 — Next task documented

Status: completed.

Validation outcome:
- Working tree was clean at iteration start; `next-env.d.ts` was not dirty.
- No product code changed and no AI/plan persistence behavior was added.

Implemented:
- Added `docs/product/next-task.md` with an actionable real-iPhone `/plan` seeded-preview validation task.
- Captured setup, hard constraints, review checklist, pass criteria, allowed follow-up changes, required verification commands, and conventional commit guidance.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 12 files, 28 tests.
- `npm run build` passes.

Next iteration:
- Execute `docs/product/next-task.md`: validate the complete-state `/plan` seeded preview on an actual iPhone with tester data. Do not start AI plan generation or persist/activate a plan.

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
