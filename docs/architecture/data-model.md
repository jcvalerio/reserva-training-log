# Data Model

Conceptual MVP data model. Keep the first implementation lean and evolve only after field validation.

## User

Represents one authenticated person.

Fields:
- `id`
- `authProviderUserId`
- `email`
- `displayName`
- `defaultLocale` — `es` or `en`
- `units` — `metric` initially
- `createdAt`
- `updatedAt`

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

## MusclePriority

Priority areas for plan generation.

Fields:
- `id`
- `athleteProfileId`
- `muscleGroup` — quadriceps, calves, glutes, back, etc.
- `priorityLevel` — normal, high, very_high
- `sideFocus` — right, left, bilateral, none
- `notes`

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
- `nameEs`
- `nameEn`
- `primaryMuscles`
- `secondaryMuscles`
- `equipmentType` — machine, cable, dumbbell, barbell, bodyweight
- `movementPattern`
- `isUnilateralCapable`
- `jointStressTags` — shoulder, knee, lower_back, etc.
- `defaultRepRangeMin`
- `defaultRepRangeMax`
- `notes`

## BaselineLift

Onboarding working-weight baseline.

Fields:
- `id`
- `athleteProfileId`
- `exerciseId`
- `side` — bilateral, left, right
- `weightKg`
- `reps`
- `sets`
- `rir` — 0, 1, 2, 3, 4_plus
- `painScore` — 0-10
- `notes`
- `recordedAt`

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
- `targetRir`
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
- `rir` — 0, 1, 2, 3, 4_plus
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
2. Set logs must include actual weight, reps, RIR, and pain score.
3. Pain score is required for profiles/exercises marked pain-sensitive.
4. Unilateral exercises can store separate left/right set logs.
5. Body measurement trends preserve historical records; never overwrite history.
6. Progression suggestions are recommendations; users can override them.
7. For asymmetry correction, the weaker side can constrain progression for the stronger side.
