# Next Task

## Today's-session UI and per-set RIR/pain logging (Slice 2)

Context: Slice 1 (persist and activate the seeded plan) is complete. A tester with a complete Perfil/Pesos base/Mediciones foundation can now activate the seeded 4-week hypertrophy plan as their real, saved, active plan from `/plan`. The DB schema already has `workout_session`, `exercise_log`, and `set_log` tables (added in the Slice 1 migration) — they exist but no application code reads or writes them yet.

Automated coverage already in place:
- `src/plans/plan-repository.test.ts` covers the relational-to-`GeneratedWorkoutPlan` mapper (`toGeneratedWorkoutPlan`), including sort-order independence and null/optional field coalescing.
- `src/app/plan/plan-page-content.test.tsx` covers the unsaved seeded preview, the gated pre-foundation state, and the active-plan render path after activation.

Objective:
- Let a tester with an active plan open "today's" (or any) planned session and log real sets against it: actual weight (kg), actual reps, numeric RIR (0-4), pain score (0-10), and optional notes — matching the every-set logging contract already documented in `docs/product/session-logging-ux.md` and `docs/architecture/data-model.md`.
- Support marking a session as started/completed.

Hard constraints:
- Do not call AI.
- Do not build a custom plan builder (picking exercises/sets from scratch) — this iteration only logs against the already-activated seeded plan.
- Do not implement progression-suggestion UI yet (`src/training/progression.ts` already has the pure rule-based engine; wiring it into the UI is a later iteration per `docs/product/milestones.md` M5).
- Keep Spanish-first UX; English support must not be removed.
- Preserve pain-aware progression rules: pain >2 blocks aggressive progression framing, pain >3 should visually flag reduce/modify, pain >=7 should flag stop/professional-guidance framing.
- Reuse existing patterns: `src/plans/plan-repository.ts` (repository pattern), `src/app/baseline/actions.ts` (server action shape), `src/app/submit-button.tsx` / `src/app/form-status-banner.tsx` (pending state / save feedback), `src/training/rir.ts` (RIR labels/display).

Suggested approach:
1. Add a `workout-repository.ts` (or similar) with functions to create/fetch a `WorkoutSession` for a given `planSessionTemplateId`, and to append `ExerciseLog`/`SetLog` rows.
2. Add a route (e.g. `/entrenar` or `/plan/[sessionId]`) showing the exercises for a chosen planned session with a per-set logging form.
3. Server action to save a set (kg, reps, RIR, pain, notes) and mark the session in-progress/completed.
4. Add tests for the new repository logic and any pure helpers (e.g. session-completion detection).

If changes are needed elsewhere:
- Keep them deterministic and small.
- Update `docs/product/implementation-log.md` with outcome and next step.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- If schema changes are needed, run `npm run db:generate` then `npm run db:migrate` against the configured dev database, and review the generated SQL before applying.
- Commit with a conventional commit, e.g. `feat: add session set logging`.

## Deferred: real-device validation

Real-iPhone manual validation of the mobile shell (bottom nav, sticky submit buttons, save banners, Baseline progress UX) documented in earlier iterations is still worth doing whenever a physical device and tester login are available, including a pass on the new "Activar este plan" flow. Not blocking further implementation work.
