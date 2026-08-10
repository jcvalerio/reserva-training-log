# Data Model

Describes the tables actually defined in `src/db/schema.ts` as of 2026-07-31. Where a table or field exists in the database but isn't read/written by any current application code, that's called out explicitly rather than omitted — this doc previously drifted for months into describing an earlier conceptual design instead of what was actually built, which is exactly the failure mode to avoid this time. If you change `schema.ts`, update the matching section here in the same change.

## User

Represents one authenticated person. Owned by Better Auth, not hand-rolled.

Fields:
- `id`, `name`, `email`, `emailVerified`, `image`
- `defaultLocale` — `es` or `en`, defaults `es`
- `units` — `metric` only today
- `createdAt`, `updatedAt`

Auth note:
- Better Auth owns `user`, `session`, `account`, and `verification`. External provider identity lives in `account.providerId`/`account.accountId`.

Relationships:
- has one `AthleteProfile` in practice (not DB-enforced, but every code path assumes at most one).

## AthleteProfile

Fields: `id`, `userId`, `name`, `sex`, `birthYear`, `trainingAgeYears`, `recentTrainingFrequencyDaysPerWeek`, `targetTrainingDaysPerWeek` (default 5), `targetSessionDurationMinutes` (default 60), `primaryGoal` (always `"hypertrophy"` today — the form only allows that one literal), `secondaryGoals` (jsonb array, default `["mobility", "fat_loss"]`), `experienceLevel` (always `"intermediate"` — the enum has no other value defined), `progressionAggressiveness`, `preferredLocale`, `timezone` (default `America/Costa_Rica`), `gymContext`, `notes`, `createdAt`, `updatedAt`.

**Known gap, confirmed 2026-07-31**: every field here except the row's mere existence is currently write-only — none of it is read by plan generation (there is none — see below), the plan builder, or progression logic. `hasProfile` (does a row exist at all) is the only thing any other code path checks. This reads like the intended context payload for an AI plan-generation feature that was never wired in (`src/ai/provider.ts` exists but has zero imports anywhere in the app). Left as-is deliberately — the user chose to keep the fields in case that feature ships later, rather than trim them now.

## Limitation

One row per pain-sensitive area or training constraint, free-text-driven.

Fields: `id`, `athleteProfileId`, `bodyRegion`, `side` (enum: left/right/bilateral/unknown, default unknown), `conditionName`, `severity` (enum: mild/moderate/severe, default moderate), `requiresPainTracking` (default true), `avoidPatterns`, `notes`, `active`, `createdAt`, `updatedAt`.

`/perfil` accepts one limitation per line of free text and persists each line as a row with conservative defaults (`bodyRegion="unknown"`, `side="unknown"`, `severity="moderate"`) — there's no structured per-field editing UI. **Same known-gap status as AthleteProfile**: captured and re-displayed on the same form, not read anywhere else (not by the plan builder, not by `exercisePrescription.painSensitive`, which is set independently per exercise).

## MusclePriority

Fields: `id`, `athleteProfileId`, `muscleGroup`, `priorityLevel` (enum: normal/high/very_high, default high), `sideFocus` (enum: right/left/bilateral/none, default none), `notes`, `createdAt`, `updatedAt`.

Same free-text-per-line pattern and same known-gap status as `Limitation` — captured via `/perfil`, never read elsewhere.

## BodyMeasurement

Fields: `id`, `athleteProfileId`, `measuredAt` (defaults to save time), `bodyWeightKg`, `waistCm`, `rightThighCm`, `leftThighCm`, `rightCalfCm`, `leftCalfCm`, `rightArmCm`, `leftArmCm`, `notes`. All numeric fields nullable — a save just needs at least one populated value.

Derived (computed on read, not stored): `thighGapCm = leftThighCm - rightThighCm`, `calfGapCm = leftCalfCm - rightCalfCm` (`src/measurements/measurement-schema.ts`'s `calculateMeasurementGaps`).

- `/mediciones` inserts a new row on every save and never overwrites history; lists recent entries with per-entry gaps.
- `/progreso` shows a body-measurement trend card: oldest-vs-latest deltas for weight/waist (`src/measurements/measurement-trend.ts`'s `buildBodyMeasurementTrend`), plus a *separate* latest-vs-immediately-previous comparison specifically for the asymmetry-improvement signal (`thighGapImproved`/`calfGapImproved` — gap shrank ≥5% since the last measurement). These are two different comparison windows over the same table, not the same number shown twice.

## Exercise

The exercise catalog: the normalized source of truth for what muscle an exercise trains. **Revived 2026-08-09** (it had been orphaned since 2026-07-31, when the "Pesos base" intake flow it originally backed was removed) to support weekly volume-per-muscle-group reporting on `/progreso`.

Fields: `id` (**equals `slug`** — the seed migration runs independently against the dev and production Neon branches, so rows must come out byte-identical on both; a generated id would diverge), `slug`, `nameEs`, `nameEn`, `athleteProfileId` (nullable FK → `AthleteProfile`, cascade — NULL means a seeded row shared by every profile, set means one athlete's private addition), `isActive` (boolean, **default `false`**), `primaryMuscleGroup` (`muscle_group` enum, nullable), `secondaryMuscleGroups` (`muscle_group[]`, default `{}`), `equipmentType`, `movementPattern` (text, typed `MovementPattern` in TS), `isUnilateralCapable`, `jointStressTags` (jsonb, typed `JointLoad[]`), `defaultRepRangeMin`/`Max`, `notes`, `createdAt`, `updatedAt`. `primaryMuscles`/`secondaryMuscles` (legacy jsonb holding English tokens) are superseded and read by nothing; they survive only because dropping them in the same diff that adds the new columns makes drizzle-kit prompt for a rename decision.

`isActive` defaulting to **false** is load-bearing. 12 legacy rows from the removed flow are still referenced by `BaselineLift` with `onDelete: restrict`, so they can never be deleted; defaulting to false hides them from every picker without the migration having to enumerate their slugs, and hides any unseen legacy row on the production branch automatically. Only rows the seed `INSERT` in `drizzle/0018` explicitly touches become active.

`primaryMuscleGroup` is nullable for two distinct reasons: cardio and conditioning entries genuinely train no group for hypertrophy purposes (a *classified* zero, distinct from "unclassified"), and a `NOT NULL` add-column whose backfill missed one unseen production row would fail mid-`vercel build` and take the whole deploy down.

Body region (empuje/tirón/pierna/core) is **derived** from the primary muscle group by `regionForMuscleGroup` and is deliberately never stored — storing a region beside a muscle group is exactly how `incrementCategory` drifted into meaning two things at once.

The vocabulary, the ~70-entry seed catalog, and the name matcher live in `src/training/muscle-taxonomy.ts`; the pgEnum's values are imported from that module so the two cannot drift.

## BaselineLift

Fields: `id`, `athleteProfileId`, `exerciseId` (FK → `Exercise`, `onDelete: restrict`), `side`, `weightKg`, `reps`, `sets`, `rir`, `painScore`, `painLocation`, `notes`, `recordedAt`.

**Orphaned as of 2026-07-31** — no route, form, or repository code touches this table (`src/baseline/` and `src/app/baseline/` were deleted). Retained rather than dropped. Its `restrict` FK onto `Exercise` is why the 12 legacy catalog rows are deactivated rather than deleted (see `Exercise` above).

## WorkoutPlan

Fields: `id`, `athleteProfileId`, `nameEs`, `nameEn`, `goal` (`"hypertrophy" | "fat_loss"`), `durationWeeks` (vestigial — always `1`; see below), `daysPerWeek`, `sessionDurationMinutes`, `locale`, `safetySummaryEs`, `status` (`draft | active | completed | archived`), `activatedAt`, `createdAt`, `updatedAt`. A partial unique index enforces at most one `status = 'active'` row per profile.

A plan is one routine that repeats indefinitely — there is no fixed week count. `durationWeeks` is a NOT NULL DB column with no real meaning anymore (always `1`); `PlanSessionTemplate.weekNumber` is similarly always `1` for anything created under the current model. This was a deliberate redesign (see implementation log's "exercise model redesign" entries) away from an earlier 4-week-block model; old data from that model can still round-trip (read as week 1 only) but nothing new is created that way.

A plan is populated one of three ways: the custom builder (`/plan/builder`, draft → active), a hardcoded template (`src/plans/plan-templates.ts`'s catalog — currently a hypertrophy 5-day split and a fat-loss A/B circuit, `/plan/templates`), or — not built — AI generation. There is no AI generation path today.

Relationships: has many `PlanSessionTemplate`.

## PlanSessionTemplate

A planned training day inside a plan.

Fields: `id`, `workoutPlanId`, `weekNumber` (vestigial, see above — always `1`), `dayIndex`, `nameEs`, `nameEn`, `focus`, `estimatedDurationMinutes`, `mobilityNotesEs`.

`mobilityNotesEs` is shown to the user in two places: expanded under each session in any plan preview (`/plan`, `/plan/templates/[id]`), and as a coaching cue in the session header while actually training (`/entrenar`).

Relationships: has many `ExercisePrescription`.

## ExercisePrescription

Planned exercise inside a session template. The most redesigned table in the schema — four separate phases replaced its original shape (see implementation log).

Fields: `id`, `planSessionTemplateId`, `orderIndex`, `exerciseNameEs`/`exerciseNameEn` (free text — **not** a foreign key to `Exercise`), `phase` (`warmup | main | accessory | mobility`), `isUnilateral` (boolean — replaced a 3-value `sideMode` enum whose two unilateral variants had zero behavioral difference anywhere in the app), `prescriptionType` (`strength | duration`), `targetSets`, `targetRepMin`/`targetRepMax`/`targetRir` (nullable — only meaningful for `strength`), `durationSeconds` (nullable — only meaningful for `duration`), `restSeconds`, `notesEs`/`notesEn`, `painSensitive`, `substitutionOptionsEs` (jsonb string array), `loadMechanism` (`bodyweight | dumbbell | machine | barbell`, nullable), `isCompound` (nullable boolean), `exerciseId` (nullable FK → `Exercise`, `onDelete: set null`).

`loadMechanism`×`isCompound` replaced an earlier `incrementCategory` enum that conflated equipment type with body region; together they drive the suggested weight-increment percentage in `/entrenar` (`src/workouts/progression-view.ts`). They are **not** the exercise taxonomy — that is `exerciseId`, added 2026-08-09.

`exerciseId` is nullable by design. `exerciseNameEs` remains free text and remains the display name, so the builder and the mid-session substitution flow keep accepting typed names; an unmatched row degrades to "Sin clasificar" in reports rather than blocking anything. `set null` rather than `restrict`, because `restrict` protects logged history on `ExerciseLog` whereas this is only a pointer to a classification — and `restrict` here would recreate exactly the `BaselineLift` problem of catalog rows that can never be cleaned up.

Classification resolves in three steps: `exerciseId` → catalog row, else `findCatalogEntryByName(exerciseNameEs)` in TS (accent/case/block-prefix/alias tolerant), else unclassified. Step two is why the backfill migrations are an optimization rather than a correctness requirement — plans this machine has never seen still classify correctly. `notesEs` is shown as a coaching cue while training, not just in plan previews.

## WorkoutSession

A concrete, performed instance of a `PlanSessionTemplate`.

Fields: `id`, `athleteProfileId`, `workoutPlanId`, `planSessionTemplateId`, `status` (`planned | active | completed | skipped`), `startedAt`, `completedAt`, `notes` (column exists; no application code reads or writes it — a real gap, distinct from the deliberately-orphaned tables above), `createdAt`, `updatedAt`.

`startOrResumeWorkoutSession` reuses an existing `active` row for the same profile+template rather than creating a duplicate; completing a day and starting it again later (the plan repeats indefinitely, so this is the normal flow, not an edge case) creates a fresh row.

Relationships: has many `ExerciseLog`.

## ExerciseLog

One row per exercise actually attempted within a session — created lazily on the first set logged for that exercise, not upfront.

Fields: `id`, `workoutSessionId`, `exercisePrescriptionId` (FK, `onDelete: restrict` — deliberately not `cascade`, so logged history can never disappear just because a prescription row changes; a plan with real history is archived, never hard-deleted), `createdAt`, `updatedAt`. No `notes` field on this table — per-set notes live on `SetLog`, not here.

Relationships: has many `SetLog`.

## SetLog

Every performed set (or duration-based bout).

Fields: `id`, `exerciseLogId`, `setNumber`, `side` (`bilateral | left | right`, default bilateral), `actualWeightKg`/`actualReps`/`rir` (nullable — null for a duration-type set), `actualDurationSeconds` (nullable — null for a strength-type set; exactly one of these two groups is populated, enforced at the Zod layer via a discriminated union on the sibling prescription's `prescriptionType`, not a DB constraint), `painScore`, `notes`, `completedAt`.

There is no `plannedWeightKg`/`plannedRepsMin`/`plannedRepsMax` on this table — planned targets live on `ExercisePrescription` and are read from there, not duplicated onto every set. `notes` is shown back to the user wherever a set is displayed (mid-workout, "Última vez," the completed-session summary) and also silently feeds `suggestProgression`'s technique/discomfort keyword check (`src/training/progression.ts`).

## Progression suggestions — computed, not persisted

There is no `ProgressionSuggestion` table. A next-session weight/rep suggestion is computed live, on every render, from `SetLog` history — `src/training/progression.ts`'s `suggestProgression()` (the action/risk-flag/reason) composed with `src/workouts/progression-view.ts` (the weight-increment math, keyed on `loadMechanism`/`isCompound`). Nothing about a suggestion is ever written back to the database, and there's no "accepted by user" concept — the user either logs a set matching the suggestion or doesn't. See `docs/product/progression-rules.md` for the actual rules.

## Key invariants

1. Users can only access their own athlete profile and training data (enforced by scoping every query to the authenticated user's `athleteProfileId`, not by a DB-level policy).
2. A strength-type set requires actual weight, reps, and numeric RIR; a duration-type set requires `actualDurationSeconds` instead — never both, never neither (Zod discriminated union, not a DB CHECK constraint).
3. Pain score is required for every set, regardless of prescription type.
4. Unilateral exercises log separate left/right sets; `targetSets` means sets *per side*, not a shared total (a real bug fixed during the exercise-model redesign — see implementation log).
5. Body measurements are append-only; a save never overwrites a previous row.
6. Progression suggestions are computed, not stored, and are always a prefilled default the user can override by logging something different.
7. Classification is per **prescription**, not per exercise name. The same free-text name on two different days may carry different `exerciseId`s; weekly volume resolves per prescription (correct — that is where the sets are), while `/progreso`'s grouped exercise list resolves per name off the most recent instance.
8. A substitute resolves its own `exerciseId` from its own name and never inherits the replaced exercise's. Dosage (phase, sets, reps, RIR, rest, load mechanism) inherits; identity does not — the live data has a calf raise substituting an incline press, and inheriting would credit calf work to pecho.
9. `painLocation` is the reported truth; the joints an exercise loads are only a fallback for sets logged before the column existed (added 2026-08-09). The two must never be presented identically — an inferred location would report "hombro" for a hurting wrist. It deliberately does not yet affect the progression thresholds.
10. Effective sets for a unilateral exercise are `max(left, right) + bilateral`, never a distinct-`setNumber` count: `setNumber` is assigned across the whole exercise log regardless of side, so 3 left + 3 right carries setNumbers 1–6 and a distinct count would double it.
11. At most one `WorkoutPlan` per profile has `status = 'active'` (DB-enforced via a partial unique index); activating a new one archives whichever plan was active, it doesn't delete it.
