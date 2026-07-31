# Milestones

Work in small vertical slices. Each milestone must be usable on iPhone before moving forward.

**Note (2026-07-31)**: this is the original planning doc; the product direction shifted away from M3's "AI plan generation" (never built, not pursued — see M3 below and `docs/product/next-task.md`) toward manual plan creation instead. M0/M1/M2/M4/M5 below are all done; M6 (field validation) is still open.

## M0 — Product and technical foundation

Status: done. App bootstrap, stack dependencies, migrations, Spanish landing page, CI checks, Neon + Vercel deployment are all complete and have been in production use throughout this project.

Goal: align scope and bootstrap a clean project.

Deliverables:
- Fresh Next.js app.
- TypeScript strict mode.
- Tailwind styling foundation.
- Spanish default locale and English secondary locale.
- Test setup with Vitest and Playwright.
- Database migrations.
- Basic deployment target selected.

Acceptance:
- App runs locally.
- A Spanish landing page loads on iPhone viewport.
- Tests run in CI/local.

## M1 — Authentication and athlete profiles

Goal: each tester has a separate login and profile.

Deliverables:
- Auth provider integration.
- Athlete profile CRUD.
- Profile fields for age, sex, training age, frequency, goals, limitations, language, and units.
- Pain-sensitive area setup.

Acceptance:
- Each tester can sign in separately.
- Each tester can create/edit their own profile.
- Profiles are private per user.

## M2 — Baseline intake and body measurements

Goal: capture enough context to generate useful first plans.

**Update (2026-07-31)**: the baseline working-weight intake ("Pesos base") shipped as planned below, but was later removed entirely (2026-07-31) — it turned out to be read only as a count for an onboarding gate, never consumed by any plan or progression logic, and got fully overwritten on every save (no history). Body measurement tracking below is unaffected and still live.

Deliverables:
- ~~Baseline working-weight intake for key lifts.~~ Removed — see update above.
- ~~Unilateral baseline support for left/right exercises.~~ Removed — see update above.
- Body measurement tracking. **Done**, still live at `/mediciones`.
- Asymmetry calculations. **Done** — thigh/calf gaps, plus a `/progreso` trend card and asymmetry-improvement signal added 2026-07-31.

Acceptance:
- Athlete A can enter right/left thigh and calf measurements. **Done.**
- ~~Baseline lifts can include kg, reps, sets, RIR, pain, notes.~~ N/A — feature removed.
- The UI shows measurement trends and left/right gaps. **Done.**

## M3 — AI plan generation v1

**Not pursued (2026-07-31).** Plans are created manually instead — a small template catalog (`/plan/templates`) plus a custom day-by-day builder (`/plan/builder`), both validated against the same schema this milestone would have used for AI output (`src/plans/generated-plan-schema.ts`). `src/ai/provider.ts` (an unused stub) and its dependencies were removed. Kept below as the original design record.

Goal: generate a practical 4-week plan.

Deliverables:
- Structured onboarding payload to AI.
- 4-week, 5-day, 60-minute hypertrophy plan generation.
- Spanish plan output by default.
- Safety/validation guardrails.
- Review-before-start screen.

Acceptance:
- Plan respects 5 days/week and 60-minute sessions.
- Plan includes machines/cables/free weights as appropriate for hypertrophy and injury reduction.
- Shoulder bursitis profiles receive safer exercise choices and pain-aware notes.
- Lower-body priority profile receives quad/calf/unilateral emphasis.

## M4 — Session execution and set logging

Goal: make gym logging fast and reliable on iPhone.

Deliverables:
- Today's workout view.
- Exercise-by-exercise execution flow.
- Set logging with kg, reps, RIR, pain, notes.
- Sticky bottom save/next action.
- Session completion.

Acceptance:
- A tester can log a set in under 5 seconds when using default planned values.
- Every set is persisted.
- Notes are optional and compatible with iPhone dictation.
- UI works well on iPhone 14 Pro Max viewport.

## M5 — Previous performance and progression suggestions

Goal: turn logs into next-session guidance.

Deliverables:
- Previous session baseline display per exercise. **Done** — `/entrenar/[sessionId]` shows "Última vez" (kg/reps/RIR/dolor) before the first set of a repeated exercise, matched across weeks by exercise name.
- Progression suggestion engine. **Done** — `src/training/progression.ts`, surfaced via `src/workouts/progression-view.ts`.
- Accept/override suggested weight/reps. **Done** — the suggested weight (flat ±5%, see `docs/product/progression-rules.md`) prefills the weight/reps inputs; freely editable before saving.
- Pain-aware exercise warnings. **Done** (carried over from Slice 2) — high-pain save warning in the logging wizard, plus the suggestion engine's own pain-based hold/reduce logic.

Acceptance:
- Repeated exercises show previous kg/reps/RIR/pain. **Done.**
- The app suggests increases when performance and pain permit. **Done.**
- The app holds/reduces/replaces when pain or fatigue flags appear. **Done.**
- A 5% improvement signal can be shown after repeated sessions. **Done** — `/progreso` (`src/app/progreso/`) compares each exercise's two most recent completed instances and flags all 6 signals in `docs/product/progression-rules.md`'s "5% improvement definition": total volume load, pain improvement at a maintained workload, reps at the same load, load at the same reps (both RIR-gated), estimated 1RM (RIR-adjusted Epley), and asymmetry improvement (both the per-exercise performance gap and the body-measurement gap).

## M6 — Two-week field validation

Goal: validate the real workflow before expanding.

Deliverables:
- Real-use checklist.
- Feedback form or notes capture.
- Basic progress dashboard.

Acceptance:
- All three testers complete at least two weeks of sessions.
- Friction points are documented.
- Decision made: continue web, add offline, or move toward native Apple app/watch.
