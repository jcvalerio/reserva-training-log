# First Features

**Note (2026-07-31)**: written when AI plan generation was the planned mechanism. That was never built and isn't the current direction — plans are created manually (a template catalog plus a custom builder). Any "AI"/"generated plan" references below describe the original plan, not shipped behavior; see `docs/product/implementation-log.md`/`next-task.md` for what's actually built.

## Feature 1 — Spanish-first app shell

User story:
> As a tester, I want the app to open in Spanish on my iPhone so it feels built for my real gym use.

Scope:
- Responsive mobile-first layout.
- Spanish default locale.
- English secondary locale.
- Basic navigation: Inicio, Perfil, Plan, Entrenar, Progreso.

Acceptance:
- iPhone 14 Pro Max viewport looks usable.
- Locale can switch between Spanish and English.
- No desktop-first tables in core workout screens.

## Feature 2 — Separate login per tester

User story:
> As each tester, I want my own account so my plan, injuries, logs, and progress are private.

Scope:
- Auth setup.
- User record creation.
- Ownership enforced in data access.

Acceptance:
- Three testers can sign in separately.
- One tester cannot access another tester's profile, plan, or sessions.

## Feature 3 — Athlete onboarding profile

User story:
> As a tester, I want to provide my training context so the generated plan matches my goal, experience, and limitations.

Fields:
- Name
- Age or birth year
- Sex
- Training age years
- Recent training frequency
- Target days/week: 5
- Target duration: 60 minutes
- Goal: hypertrophy + mobility
- Secondary goal: fat loss
- Progression preference: aggressive
- Limitations/pain-sensitive areas
- Muscle priorities

Acceptance:
- Athlete A can set quadriceps/calves as priority and right-side asymmetry notes.
- Athletes B and C can set shoulder/arm bursitis limitation.

## Feature 4 — Baseline working-weight intake

User story:
> As a tester, I want to enter current working weights so week 1 starts close to reality.

Scope:
- Key lift baseline form.
- kg, reps, sets, RIR, pain, notes.
- Unilateral left/right baseline when relevant.

Suggested baseline exercises:
- Leg press
- Single-leg leg press
- Leg extension
- Hack squat or Smith squat
- Seated/lying leg curl
- Calf raise
- Chest press or dumbbell bench
- Lat pulldown
- Seated row
- Shoulder-friendly press or lateral raise
- Cable triceps
- Cable/biceps curl

Acceptance:
- Baseline can be skipped per exercise but not for all exercises.
- Unilateral entries support separate left/right values.

## Feature 5 — Body measurement tracking

User story:
> As a tester, I want to track measurements over time so I can see muscle and asymmetry trends.

Scope:
- Measurement entry.
- Trend list/chart.
- Difference calculations.
- Partial measurement saves are allowed when at least one numeric measurement is present.

Initial measurements for Athlete A:
- Left thigh larger by 2 cm
- Left calf larger by 3 cm

(Absolute circumferences are intentionally not recorded here; the left/right gap is the only value any rule reads.)

Acceptance:
- App shows thigh and calf left/right gaps.
- App preserves historical entries.
- Recommended cadence is every 2 weeks.

## Feature 6 — Generate hypertrophy plan v1

User story:
> As a tester, I want the app to generate a 5-day hypertrophy plan adapted to my body, limitations, and gym.

Scope:
- 4-week plan.
- 5 days/week.
- 60-minute sessions.
- Intermediate level.
- Full gym equipment.
- Spanish plan by default.
- AI output must match the Zod contract in `src/plans/generated-plan-schema.ts`.
- Seeded fallback plan is available if AI fails or returns invalid output.
- Review before start.

Plan bias:
- Mixed machines, cables, dumbbells, and selected free weights.
- Bias toward machines/cables where they improve hypertrophy stimulus and reduce injury risk.
- Include mobility/prehab work.

Acceptance:
- Plan has 5 distinct sessions per week.
- Each session has exercises, sets, rep ranges, numeric target RIR, rest seconds, and notes.
- Invalid AI output is rejected before persistence.
- If AI generation fails, tester can accept/edit the seeded fallback plan and continue to logging.
- Shoulder bursitis profiles avoid or modify risky shoulder movements.
- Lower-body priority profile gets extra quad/calf/unilateral focus.

## Feature 7 — Today's workout execution

User story:
> As a tester in the gym, I want to start today's workout and log each set quickly with one hand.

Scope:
- Today's session page.
- Exercise cards or one-exercise-at-a-time flow.
- Planned vs actual values.
- Big controls.
- Sticky bottom action.

Acceptance:
- User can start, pause mentally, and complete session.
- User can log every set without navigating complex tables.
- Notes are optional and compatible with iPhone dictation.

## Feature 8 — Set logging with RIR and pain

User story:
> As a tester, I want to record kg, reps, RIR, pain, and notes for every set so the app can guide progression safely.

Fields:
- Weight kg
- Reps
- RIR
- Pain score
- Notes

RIR labels:
- `4+ Fácil`
- `3 reps en reserva`
- `2 reps en reserva`
- `1 rep en reserva`
- `0 Fallo`

Acceptance:
- Weight/reps default from plan or previous set.
- RIR uses large buttons.
- Pain score uses fast 0-10 input.
- Set persists immediately after save.

## Feature 9 — Previous performance baseline

User story:
> As a tester repeating an exercise, I want to see what I did last time so I know what to beat.

Scope:
- Show last session's best/relevant sets.
- Show previous pain score.
- Show previous notes.

Acceptance:
- Before logging an exercise, user sees last kg/reps/RIR/pain.
- For unilateral exercises, left/right histories are shown separately.

## Feature 10 — Progression suggestion v1

User story:
> As a tester, I want the app to suggest what to do next time so I can progressively overload.

Scope:
- Rule-based progression engine first.
- AI can explain suggestions later, but should not be the only decision-maker.
- Accept/override suggestions.

Acceptance:
- If all target reps completed, average RIR >= 2, and pain <= 2, app suggests an increase.
- If pain > 3, app suggests hold/reduce/replace.
- If reps fall sharply, app suggests hold or reduce.
- Suggestions are understandable in Spanish.
