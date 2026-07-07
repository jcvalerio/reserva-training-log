# Data Model

Conceptual MVP data model. Keep the first implementation lean and evolve only after field validation.

## User

Represents one authenticated person.

Fields:
- `id`
- `email`
- `name`
- `emailVerified`
- `image`
- `defaultLocale` — `es` or `en`
- `units` — `metric` initially
- `createdAt`
- `updatedAt`

Auth note:
- Better Auth owns the core `user`, `session`, `account`, and `verification` tables.
- External provider identity is stored in `account.providerId` + `account.accountId`, not as `authProviderUserId` on the app user.

Relationships:
- has one or more `AthleteProfile` records, but MVP expects one profile per user.

## AthleteProfile

Training context for plan generation and progression.

Fields:
- `id`
- `userId`
- `name`
- `sex`
- `birthYear` or `age`
- `trainingAgeYears`
- `recentTrainingFrequencyDaysPerWeek`
- `targetTrainingDaysPerWeek` — default 5
- `targetSessionDurationMinutes` — default 60
- `primaryGoal` — hypertrophy
- `secondaryGoals` — mobility, fat loss
- `experienceLevel` — intermediate
- `progressionAggressiveness` — conservative, normal, aggressive
- `preferredLocale` — `es` default
- `timezone` — default `America/Costa_Rica` for today's workout and date grouping
- `gymContext` — text or enum; full gym equipment for a commercial gym
- `notes`
- `createdAt`
- `updatedAt`

## Limitation

Pain, injury, or training constraint.

Fields:
- `id`
- `athleteProfileId`
- `bodyRegion` — shoulder, arm, knee, back, etc.
- `side` — left, right, bilateral, unknown
- `conditionName` — e.g. bursitis
- `severity` — mild, moderate, severe
- `requiresPainTracking` — boolean
- `avoidPatterns` — e.g. painful overhead pressing
- `notes`
- `active`
- `createdAt`
- `updatedAt`

MVP input note:
- `/perfil` accepts one limitation per line and persists each line as a dedicated `Limitation` row with conservative defaults (`bodyRegion=unknown`, `side=unknown`, `severity=moderate`, `requiresPainTracking=true`). Structured editing can be added after field testing.

## MusclePriority

Priority areas for plan generation.

Fields:
- `id`
- `athleteProfileId`
- `muscleGroup` — quadriceps, calves, glutes, back, etc.
- `priorityLevel` — normal, high, very_high
- `sideFocus` — right, left, bilateral, none
- `notes`
- `createdAt`
- `updatedAt`

MVP input note:
- `/perfil` accepts one priority per line and persists each line as a dedicated `MusclePriority` row with defaults (`priorityLevel=high`, `sideFocus=none`). Structured side/priority editing can be added after field testing.

## BodyMeasurement

Measurements for trend and asymmetry tracking.

Fields:
- `id`
- `athleteProfileId`
- `measuredAt`
- `bodyWeightKg`
- `waistCm`
- `rightThighCm`
- `leftThighCm`
- `rightCalfCm`
- `leftCalfCm`
- `rightArmCm`
- `leftArmCm`
- `notes`

Derived values:
- `thighDifferenceCm = leftThighCm - rightThighCm`
- `calfDifferenceCm = leftCalfCm - rightCalfCm`

## Exercise

Canonical exercise catalog.

Fields:
- `id`
- `slug` — unique stable key for seeded/suggested exercises
- `nameEs`
- `nameEn`
- `primaryMuscles`
- `secondaryMuscles`
- `equipmentType` — machine, cable, dumbbell, barbell, bodyweight, or MVP combined values
- `movementPattern`
- `isUnilateralCapable`
- `jointStressTags` — shoulder, knee, lower_back, etc.
- `defaultRepRangeMin`
- `defaultRepRangeMax`
- `notes`
- `createdAt`
- `updatedAt`

MVP implementation note:
- The baseline intake lazily upserts the first suggested exercise list into `exercise` by `slug`; a richer catalog/import can replace this after field validation.

## BaselineLift

Onboarding working-weight baseline.

Fields:
- `id`
- `athleteProfileId`
- `exerciseId`
- `side` — bilateral, left, right
- `weightKg` — decimal kg value
- `reps`
- `sets`
- `rir` — numeric 0, 1, 2, 3, 4 where 4 means `4+`; UI maps this to labels like `4+ Fácil`
- `painScore` — 0-10
- `notes`
- `recordedAt`

MVP implementation note:
- `/baseline` allows each suggested exercise/side to be skipped, but requires at least one complete baseline entry before saving.
- If a row is started, kg, reps, sets, numeric RIR, and pain score are all required; notes remain optional.
- Unilateral-capable suggested exercises render separate left/right rows and persist each side independently.

## WorkoutPlan

Generated or manually adjusted training plan.

Fields:
- `id`
- `athleteProfileId`
- `name`
- `goal`
- `durationWeeks` — default 4
- `daysPerWeek` — default 5
- `sessionDurationMinutes` — default 60
- `status` — draft, active, completed, archived
- `locale`
- `generationMetadata`
- `createdAt`
- `updatedAt`

Relationships:
- has many `PlanSessionTemplate`

## PlanSessionTemplate

A planned training day inside a plan.

Fields:
- `id`
- `workoutPlanId`
- `weekNumber`
- `dayIndex`
- `nameEs`
- `nameEn`
- `focus`
- `estimatedDurationMinutes`
- `mobilityNotes`

Relationships:
- has many `ExercisePrescription`

## ExercisePrescription

Planned exercise inside a session template.

Fields:
- `id`
- `planSessionTemplateId`
- `exerciseId`
- `orderIndex`
- `phase` — warmup, main, accessory, mobility
- `sideMode` — bilateral, unilateral_separate, unilateral_matched
- `targetSets`
- `targetRepMin`
- `targetRepMax`
- `targetWeightKg`
- `targetRir` — numeric 0, 1, 2, 3, 4 where 4 means `4+`
- `restSeconds`
- `notesEs`
- `notesEn`

## WorkoutSession

Concrete performed workout.

Fields:
- `id`
- `athleteProfileId`
- `workoutPlanId`
- `planSessionTemplateId`
- `scheduledDate`
- `startedAt`
- `completedAt`
- `status` — planned, active, completed, skipped
- `overallNotes`
- `createdAt`
- `updatedAt`

Relationships:
- has many `ExerciseLog`

## ExerciseLog

Performed exercise in a session.

Fields:
- `id`
- `workoutSessionId`
- `exercisePrescriptionId`
- `exerciseId`
- `orderIndex`
- `sideMode`
- `notes`

Relationships:
- has many `SetLog`

## SetLog

Every performed set.

Fields:
- `id`
- `exerciseLogId`
- `setNumber`
- `side` — bilateral, left, right
- `plannedWeightKg`
- `plannedRepsMin`
- `plannedRepsMax`
- `actualWeightKg`
- `actualReps`
- `rir` — numeric 0, 1, 2, 3, 4 where 4 means `4+`; numeric storage allows averaging for progression rules
- `painScore` — 0-10
- `notes`
- `completedAt`

## ProgressionSuggestion

Next-session recommendation derived from history.

Fields:
- `id`
- `athleteProfileId`
- `exerciseId`
- `side`
- `basedOnWorkoutSessionId`
- `suggestedWeightKg`
- `suggestedRepMin`
- `suggestedRepMax`
- `reasonEs`
- `reasonEn`
- `riskFlag` — none, pain, fatigue, asymmetry, deload
- `acceptedByUser`
- `createdAt`

## Key invariants

1. Users can only access their own athlete profiles and training data.
2. Set logs must include actual weight, reps, numeric RIR, and pain score.
3. Pain score is required for every set; pain-sensitive profiles/exercises may add extra confirmation.
4. Unilateral exercises can store separate left/right set logs.
5. Body measurement trends preserve historical records; never overwrite history.
6. Progression suggestions are recommendations; users can override them.
7. For asymmetry correction, the weaker side can constrain progression for the stronger side.
