# Milestones

Work in small vertical slices. Each milestone must be usable on iPhone before moving forward.

## M0 — Product and technical foundation

Status: in progress. App bootstrap, stack dependencies, initial migration, Spanish landing page, and local verification are complete. Remaining M0 work is real env setup, database migration against Neon, and CI/deployment wiring.

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

Deliverables:
- Baseline working-weight intake for key lifts.
- Unilateral baseline support for left/right exercises.
- Body measurement tracking.
- Asymmetry calculations.

Acceptance:
- Athlete A can enter right/left thigh and calf measurements.
- Baseline lifts can include kg, reps, sets, RIR, pain, notes.
- The UI shows measurement trends and left/right gaps.

## M3 — AI plan generation v1

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
- Previous session baseline display per exercise.
- Progression suggestion engine.
- Accept/override suggested weight/reps.
- Pain-aware exercise warnings.

Acceptance:
- Repeated exercises show previous kg/reps/RIR/pain.
- The app suggests increases when performance and pain permit.
- The app holds/reduces/replaces when pain or fatigue flags appear.
- A 5% improvement signal can be shown after repeated sessions.

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
