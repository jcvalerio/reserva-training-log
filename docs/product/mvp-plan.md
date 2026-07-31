# Fresh Web MVP Plan

## Mission

Build a Spanish-first iPhone web app that acts as a practical gym companion for intermediate lifters: create a hypertrophy-focused plan, execute sessions, record every set, track pain/measurements, and suggest progression between repeated workouts.

## Confirmed product decisions

- Platform: iPhone-only web MVP first.
- Native Apple Watch/iOS: deferred until web MVP proves the workflow.
- Users: separate login per person.
- Testers: Athlete A, Athlete B, Athlete C.
- Gym: a fully-equipped commercial gym; full equipment, machines, cables, dumbbells up to 65 kg, powerlifting/functional areas.
- Training history: approximately 3 years consistent training; last year 4-5 days/week.
- Level: intermediate recreational lifters, not beginners.
- Frequency: 5 days/week.
- Session length: 60 minutes.
- Training style: bodybuilding/hypertrophy.
- Primary goal: muscle growth and mobility for health/aging.
- Secondary goal: burn fat as a side effect.
- Progression preference: aggressive, but pain-aware.
- Language: Spanish default, English supported from the start.
- Logging granularity: every set plus notes.
- Effort model: RIR, not RPE, for per-set logging. (2026-07-31: an optional whole-*session* RPE — Borg CR10 scale — was added separately, for a training-load trend; per-set logging stays RIR-only, unchanged from this original decision.)
- Pain tracking: required for pain-sensitive profiles/exercises.
- Offline mode: deferred to avoid early complexity.

## Tester-specific context

### Athlete A

- Priority: quadriceps and lower-body development.
- Special focus: right/left asymmetry.
- Current measurements:
  - Left thigh/quadriceps larger by 2 cm
  - Left calf larger by 3 cm
  - (absolute circumferences omitted)
  - (only the left/right gap drives any rule)
- Plan implications:
  - Track unilateral lower-body exercises separately.
  - Start unilateral sets with the right/weaker side.
  - Let right-side performance determine left-side matching volume.
  - Include quad and calf priority work.
  - Track body measurements every 2 weeks.

### Athlete B and Athlete C

- Limitation: bursitis on one arm/shoulder.
- Plan implications:
  - Require pain score for shoulder-related movements.
  - Prefer neutral-grip pressing/pulling where useful.
  - Bias toward machines/cables and controlled ranges.
  - Include shoulder prehab/mobility.
  - Avoid painful overhead pressing early.

## MVP loop

**Updated 2026-07-31** to match what actually shipped — see `docs/product/next-task.md` for the full current-state summary.

1. Sign in.
2. Create athlete profile.
3. Choose a plan: pick a template (hypertrophy or fat-loss circuit) or build one manually, day by day.
4. Review and activate the plan.
5. Execute today's workout on iPhone.
6. Log every set: kg, reps, RIR, pain, notes (or duration, for cardio/mobility-type exercises).
7. Complete the session — optionally rate it (RPE) and add a note.
8. Next time, see previous performance and progression suggestions.
9. Track body measurements and trends over time.

## Non-goals for MVP

- Apple Watch companion.
- Native iOS app.
- Full offline sync.
- Social features.
- Coach/client management.
- Nutrition tracking.
- Exercise video library.
- Automatic rep detection.
- Wearable sensor ingestion.
- Complex periodization editor.
- Public template marketplace.

## Definition of done for MVP

The MVP is successful when all three testers can use it for two weeks in the real gym and confirm:

- Session logging is fast enough during training.
- Every set can be recorded without spreadsheet-like friction.
- Previous performance is visible before each exercise.
- Progression suggestions are understandable and editable.
- Pain tracking helps avoid repeating problematic exercises.
- At least one 5% improvement signal is visible for each tester where appropriate.
