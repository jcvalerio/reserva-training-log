import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { muscleGroups, painLocations, type JointLoad, type MovementPattern } from "@/training/muscle-taxonomy";

export const localeEnum = pgEnum("locale", ["es", "en"]);
export const unitsEnum = pgEnum("units", ["metric"]);
export const sexEnum = pgEnum("sex", ["male", "female", "other", "prefer_not_to_say"]);
export const experienceLevelEnum = pgEnum("experience_level", ["intermediate"]);
export const progressionAggressivenessEnum = pgEnum("progression_aggressiveness", [
  "conservative",
  "normal",
  "aggressive",
]);
export const limitationSideEnum = pgEnum("limitation_side", ["left", "right", "bilateral", "unknown"]);
export const limitationSeverityEnum = pgEnum("limitation_severity", ["mild", "moderate", "severe"]);
export const musclePriorityLevelEnum = pgEnum("muscle_priority_level", ["normal", "high", "very_high"]);
export const sideFocusEnum = pgEnum("side_focus", ["right", "left", "bilateral", "none"]);
export const baselineSideEnum = pgEnum("baseline_side", ["bilateral", "left", "right"]);
export const workoutPlanStatusEnum = pgEnum("workout_plan_status", ["draft", "active", "completed", "archived"]);
export const exercisePhaseEnum = pgEnum("exercise_phase", ["warmup", "main", "accessory", "mobility"]);
export const workoutSessionStatusEnum = pgEnum("workout_session_status", [
  "planned",
  "active",
  "completed",
  "skipped",
]);
export const exerciseLoadMechanismEnum = pgEnum("exercise_load_mechanism", [
  "bodyweight",
  "dumbbell",
  "machine",
  "barbell",
]);
export const exercisePrescriptionTypeEnum = pgEnum("exercise_prescription_type", ["strength", "duration"]);
export const planShareInviteStatusEnum = pgEnum("plan_share_invite_status", ["pending", "redeemed"]);
// Values come from src/training/muscle-taxonomy.ts so the pgEnum literally
// cannot drift from the TS union. A pgEnum rather than text because the ~70
// seed rows are INSERTed by hand-written migration SQL where TypeScript checks
// nothing, and a typo'd 'gluteous' would silently create a 14th bucket that
// every weekly-volume report would then under-count against.
export const muscleGroupEnum = pgEnum("muscle_group", muscleGroups);
// Where the athlete says it hurts. Values come from muscle-taxonomy.ts so the
// enum cannot drift from the TS union.
export const painLocationEnum = pgEnum("pain_location", painLocations);

const updatedAtColumn = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    defaultLocale: localeEnum("default_locale").notNull().default("es"),
    units: unitsEnum("units").notNull().default("metric"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("user_email_unique").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("session_token_unique").on(table.token)],
);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAtColumn(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAtColumn(),
});

export const athleteProfile = pgTable("athlete_profile", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sex: sexEnum("sex"),
  birthYear: integer("birth_year"),
  trainingAgeYears: integer("training_age_years"),
  recentTrainingFrequencyDaysPerWeek: integer("recent_training_frequency_days_per_week"),
  targetTrainingDaysPerWeek: integer("target_training_days_per_week").notNull().default(5),
  targetSessionDurationMinutes: integer("target_session_duration_minutes").notNull().default(60),
  primaryGoal: text("primary_goal").notNull().default("hypertrophy"),
  secondaryGoals: jsonb("secondary_goals").$type<string[]>().notNull().default(["mobility", "fat_loss"]),
  experienceLevel: experienceLevelEnum("experience_level").notNull().default("intermediate"),
  progressionAggressiveness: progressionAggressivenessEnum("progression_aggressiveness")
    .notNull()
    .default("aggressive"),
  preferredLocale: localeEnum("preferred_locale").notNull().default("es"),
  timezone: text("timezone").notNull().default("America/Costa_Rica"),
  gymContext: text("gym_context").notNull().default("Gimnasio con equipo completo"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAtColumn(),
});

export const limitation = pgTable(
  "limitation",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    bodyRegion: text("body_region").notNull(),
    side: limitationSideEnum("side").notNull().default("unknown"),
    conditionName: text("condition_name").notNull(),
    severity: limitationSeverityEnum("severity").notNull().default("moderate"),
    requiresPainTracking: boolean("requires_pain_tracking").notNull().default(true),
    avoidPatterns: text("avoid_patterns"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("limitation_athlete_profile_id_idx").on(table.athleteProfileId)],
);

export const musclePriority = pgTable(
  "muscle_priority",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    muscleGroup: text("muscle_group").notNull(),
    priorityLevel: musclePriorityLevelEnum("priority_level").notNull().default("high"),
    sideFocus: sideFocusEnum("side_focus").notNull().default("none"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [index("muscle_priority_athlete_profile_id_idx").on(table.athleteProfileId)],
);

export const bodyMeasurement = pgTable(
  "body_measurement",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
    bodyWeightKg: numeric("body_weight_kg", { precision: 6, scale: 2 }),
    waistCm: numeric("waist_cm", { precision: 6, scale: 2 }),
    chestCm: numeric("chest_cm", { precision: 6, scale: 2 }),
    hipsCm: numeric("hips_cm", { precision: 6, scale: 2 }),
    rightThighCm: numeric("right_thigh_cm", { precision: 6, scale: 2 }),
    leftThighCm: numeric("left_thigh_cm", { precision: 6, scale: 2 }),
    rightCalfCm: numeric("right_calf_cm", { precision: 6, scale: 2 }),
    leftCalfCm: numeric("left_calf_cm", { precision: 6, scale: 2 }),
    rightArmCm: numeric("right_arm_cm", { precision: 6, scale: 2 }),
    leftArmCm: numeric("left_arm_cm", { precision: 6, scale: 2 }),
    notes: text("notes"),
  },
  (table) => [
    index("body_measurement_athlete_profile_id_idx").on(table.athleteProfileId),
    index("body_measurement_measured_at_idx").on(table.measuredAt),
  ],
);

// A deliberate, uncapped single-side capacity test — the only way this app can
// actually measure limb asymmetry.
//
// It exists because the obvious approach does not work. The plan's own
// unilateral rule ("la pierna fuerte usa el mismo peso sin superar sus
// repeticiones") equalises both sides on purpose, so ordinary logged sets have
// left volume ≡ right volume BY CONSTRUCTION. Measured on real history: two of
// three unilateral exercises read exactly 100% symmetric, and the third's
// apparent 25% gap was one extra set logged on the right at an identical load.
// An index built on normal sets would report a reassuring, rigorous-looking
// number that measures protocol compliance rather than symmetry.
//
// So a test row is NOT a workout set and is not stored as one: the strong side
// is explicitly NOT capped here, which is the whole point and is the opposite
// of how the athlete is told to train. Keeping it out of setLog also keeps it
// out of every volume, progression and weekly-sets read — a maximal-rep pair
// would otherwise inflate all of them.
//
// Both sides live on one row because a half-finished test is not a
// measurement. LSI = weaker / stronger * 100; below 90 is the conventional
// return-to-sport flag, which is why that threshold is defensible rather than
// invented here.
export const limbSymmetryTest = pgTable(
  "limb_symmetry_test",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    testedAt: timestamp("tested_at", { withTimezone: true }).notNull().defaultNow(),
    // Free text, matching exercisePrescription.exerciseNameEs rather than
    // pointing at a prescription row: a test outlives the plan it was run
    // under, and a restrict-FK to a prescription would make plans undeletable.
    exerciseNameEs: text("exercise_name_es").notNull(),
    // The same load on both sides. That is what makes the rep counts
    // comparable at all — an index over different loads compares nothing.
    testWeightKg: numeric("test_weight_kg", { precision: 6, scale: 2 }).notNull(),
    leftReps: integer("left_reps").notNull(),
    rightReps: integer("right_reps").notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("limb_symmetry_test_athlete_profile_id_idx").on(table.athleteProfileId),
    index("limb_symmetry_test_tested_at_idx").on(table.testedAt),
  ],
);

// Functional capacity: the mobility/healthy-aging half of the stated goal,
// which until now had no measure at all while every metric on /progreso was a
// hypertrophy metric.
//
// Two tests, both on the existing fortnightly measurement cadence:
//   - 30-second sit-to-stand: lower-limb strength and functional capacity.
//   - Single-leg stance, EYES CLOSED, timed per side.
//
// Eyes closed is not a stylistic choice. Published eyes-open norms for ages
// 40-49 sit around 40 s while the test is customarily capped at 30-45 s, so a
// healthy 47-year-old saturates it and the number reads "perfect" forever —
// the same ceiling failure that made limb symmetry unmeasurable from ordinary
// sets (see limbSymmetryTest). Eyes closed still discriminates in this age
// range; Springer et al. report a mean of 13.1 s even at 18-39.
//
// Per side, deliberately: it doubles as a BALANCE asymmetry, complementing the
// strength asymmetry that limbSymmetryTest measures.
//
// NO AGE-NORM COMPARISON IS STORED OR SHOWN, and that is a deliberate refusal
// rather than an omission. Both tests' published norms start at 60 (Rikli &
// Jones for the chair stand; Bohannon's meta-analysis for stance), and the
// sources that do cover 40-59 disagree with each other. Inventing a "you
// perform like someone 8 years younger" line on top of that would be
// fabricating clinical reference data in a health app. The athlete's own
// baseline is the comparator until a citable source for this age band is
// agreed on.
export const functionalTest = pgTable(
  "functional_test",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    testedAt: timestamp("tested_at", { withTimezone: true }).notNull().defaultNow(),
    // Repetitions completed in 30 seconds. Nullable so one test can be
    // recorded without the other — an athlete who only has a chair still gets
    // half the picture, rather than being blocked into recording neither.
    sitToStandReps: integer("sit_to_stand_reps"),
    // Seconds held, eyes closed, per side.
    balanceLeftSeconds: numeric("balance_left_seconds", { precision: 6, scale: 2 }),
    balanceRightSeconds: numeric("balance_right_seconds", { precision: 6, scale: 2 }),
    notes: text("notes"),
  },
  (table) => [
    index("functional_test_athlete_profile_id_idx").on(table.athleteProfileId),
    index("functional_test_tested_at_idx").on(table.testedAt),
  ],
);

// The exercise catalog: the single normalized source of truth for what muscle
// an exercise trains. Revived from the removed "Pesos base" intake flow, which
// left 12 rows behind that baseline_lift still references with
// onDelete:"restrict" — they cannot be deleted, so they are simply inactive.
//
// exercisePrescription.exerciseNameEs stays free text and stays the display
// name; this table only ever carries classification. See
// src/training/muscle-taxonomy.ts for the resolution order and the vocabulary.
export const exercise = pgTable(
  "exercise",
  {
    id: text("id").primaryKey(),
    // Catalog ids ARE slugs. The seed runs independently against the dev and
    // production Neon branches, so rows must come out byte-identical on both;
    // a generated id would diverge and break cross-branch comparison.
    slug: text("slug").notNull(),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en").notNull(),
    // NULL: seeded and shared by every profile. Set: created by one athlete
    // and private to them, so one person adding "Prensa rara" doesn't pollute
    // another's picker.
    athleteProfileId: text("athlete_profile_id").references(() => athleteProfile.id, {
      onDelete: "cascade",
    }),
    // DEFAULT false, deliberately. This is what lets the seed migration ignore
    // the 12 legacy rows without enumerating their slugs — and it means any
    // legacy row on the production branch that this machine has never seen is
    // hidden automatically rather than appearing in a picker as garbage. Only
    // rows the seed INSERT explicitly touches become true.
    isActive: boolean("is_active").notNull().default(false),
    // Nullable on purpose, twice over: cardio/conditioning entries genuinely
    // train no group for hypertrophy (distinct from "unclassified"), and a
    // NOT NULL add-column whose backfill misses one unseen production row
    // would fail mid-`vercel build` and take the whole deploy down.
    primaryMuscleGroup: muscleGroupEnum("primary_muscle_group"),
    // Enum array rather than jsonb: same DB-level guard as the primary column,
    // and it supports `&&`/`= ANY` for "what else hits femorales".
    secondaryMuscleGroups: muscleGroupEnum("secondary_muscle_groups")
      .array()
      .notNull()
      .default(sql`'{}'`),
    // Superseded by primaryMuscleGroup/secondaryMuscleGroups above. Still
    // holding English tokens ("biceps", "quadriceps") on the 12 inactive
    // legacy rows and read by nothing; dropped in a follow-up migration
    // rather than here, because dropping and adding in one diff makes
    // drizzle-kit ask whether it's a rename (same reason 0010 added and 0011
    // dropped).
    primaryMuscles: jsonb("primary_muscles").$type<string[]>().notNull().default([]),
    secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().notNull().default([]),
    equipmentType: text("equipment_type").notNull(),
    // Kept as text rather than promoted to a pgEnum: no aggregation partitions
    // on it (push:pull derives from the muscle group's region), and it's the
    // vocabulary most likely to churn, where an ALTER TYPE per iteration is
    // pure friction.
    movementPattern: text("movement_pattern").$type<MovementPattern>(),
    isUnilateralCapable: boolean("is_unilateral_capable").notNull().default(false),
    jointStressTags: jsonb("joint_stress_tags").$type<JointLoad[]>().notNull().default([]),
    defaultRepRangeMin: integer("default_rep_range_min").notNull().default(8),
    defaultRepRangeMax: integer("default_rep_range_max").notNull().default(12),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    // Two partial uniques rather than one global: a seeded slug is unique
    // across the app, but two athletes may each add their own "Prensa rara".
    uniqueIndex("exercise_seeded_slug_unique")
      .on(table.slug)
      .where(sql`${table.athleteProfileId} is null`),
    uniqueIndex("exercise_profile_slug_unique").on(table.athleteProfileId, table.slug),
  ],
);

export const baselineLift = pgTable(
  "baseline_lift",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "restrict" }),
    side: baselineSideEnum("side").notNull().default("bilateral"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
    reps: integer("reps").notNull(),
    sets: integer("sets").notNull(),
    rir: integer("rir").notNull(),
    painScore: integer("pain_score").notNull(),
    notes: text("notes"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("baseline_lift_athlete_profile_id_idx").on(table.athleteProfileId),
    index("baseline_lift_exercise_id_idx").on(table.exerciseId),
  ],
);

export const workoutPlan = pgTable(
  "workout_plan",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en"),
    goal: text("goal").notNull().default("hypertrophy"),
    durationWeeks: integer("duration_weeks").notNull(),
    daysPerWeek: integer("days_per_week").notNull(),
    sessionDurationMinutes: integer("session_duration_minutes").notNull(),
    locale: localeEnum("locale").notNull().default("es"),
    safetySummaryEs: text("safety_summary_es").notNull(),
    status: workoutPlanStatusEnum("status").notNull().default("draft"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    // Nullable: set the first time this plan (or a plan it was cloned from)
    // is shared via planShareInvite, then copied verbatim onto every clone
    // descended from it. Lets a future comparison feature find "every plan
    // that started from the same share" in one query, without walking a
    // parent/child graph.
    sharePlanGroupId: text("share_plan_group_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    // Enforces at most one active plan per profile; also the onConflictDoNothing
    // arbiter used by activateSeededPlanForProfile to close the activation race.
    uniqueIndex("workout_plan_active_per_profile_idx")
      .on(table.athleteProfileId)
      .where(sql`${table.status} = 'active'`),
    index("workout_plan_share_group_idx").on(table.sharePlanGroupId),
  ],
);

export const planSessionTemplate = pgTable(
  "plan_session_template",
  {
    id: text("id").primaryKey(),
    workoutPlanId: text("workout_plan_id")
      .notNull()
      .references(() => workoutPlan.id, { onDelete: "cascade" }),
    weekNumber: integer("week_number").notNull(),
    dayIndex: integer("day_index").notNull(),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en"),
    focus: text("focus").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes").notNull(),
    mobilityNotesEs: text("mobility_notes_es").notNull(),
  },
  (table) => [
    index("plan_session_template_workout_plan_id_idx").on(table.workoutPlanId),
    uniqueIndex("plan_session_template_plan_week_day_unique").on(
      table.workoutPlanId,
      table.weekNumber,
      table.dayIndex,
    ),
  ],
);

export const exercisePrescription = pgTable(
  "exercise_prescription",
  {
    id: text("id").primaryKey(),
    planSessionTemplateId: text("plan_session_template_id")
      .notNull()
      .references(() => planSessionTemplate.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    exerciseNameEs: text("exercise_name_es").notNull(),
    exerciseNameEn: text("exercise_name_en"),
    phase: exercisePhaseEnum("phase").notNull(),
    // Replaces the old 3-value sideMode enum (bilateral | unilateral_separate
    // | unilateral_matched) — the separate/matched distinction had zero
    // behavioral difference anywhere in the app. Real independent-per-side
    // progression tracking is future work, not this flag.
    isUnilateral: boolean("is_unilateral").notNull(),
    // NOT NULL DEFAULT 'strength': every existing row today is genuinely
    // strength-type (sets x reps x RIR), so this needs zero backfill — a
    // deliberate exception to this codebase's usual "app always passes
    // explicit values" convention, since it's provably accurate for all
    // pre-existing data.
    prescriptionType: exercisePrescriptionTypeEnum("prescription_type").notNull().default("strength"),
    targetSets: integer("target_sets").notNull(),
    // Nullable: only meaningful (and required at the Zod layer) when
    // prescriptionType is "strength".
    targetRepMin: integer("target_rep_min"),
    targetRepMax: integer("target_rep_max"),
    targetRir: integer("target_rir"),
    // Nullable: only meaningful when prescriptionType is "duration".
    durationSeconds: integer("duration_seconds"),
    restSeconds: integer("rest_seconds").notNull(),
    notesEs: text("notes_es").notNull(),
    notesEn: text("notes_en"),
    painSensitive: boolean("pain_sensitive").notNull().default(false),
    substitutionOptionsEs: jsonb("substitution_options_es").$type<string[]>().notNull().default([]),
    // Replaces the old incrementCategory enum (machine_or_lower_body |
    // upper_compound | isolation | dumbbell), which conflated equipment type
    // with body region and was being read by users as an exercise taxonomy
    // rather than what it actually drives: the weight-suggestion percentage.
    // Nullable: unclassified rows fall back to a flat increment.
    loadMechanism: exerciseLoadMechanismEnum("load_mechanism"),
    isCompound: boolean("is_compound"),
    // Nullable: set alongside workoutPlan.sharePlanGroupId the first time the
    // plan is shared, then copied verbatim onto the corresponding row in
    // every clone. A future comparison feature joins on this instead of
    // exerciseNameEs/orderIndex, so it survives either side later renaming
    // or reordering their own copy.
    lineageKey: text("lineage_key"),
    // Non-null only on a substitute: the exercise this one stands in for when
    // the machine is busy/broken or the movement doesn't feel right that day.
    //
    // A substitute is a *real* prescription, not a session-scoped override —
    // it accrues its own progression history like any other exercise, and
    // every existing read path works on it untouched. The link exists purely
    // so the day's main list can stay clean: the session runner and the plan
    // previews show the original, with its alternatives tucked underneath,
    // instead of the day visibly growing by one exercise every time you swap.
    //
    // set null rather than cascade on delete: if the original is ever removed
    // the substitute simply becomes a normal exercise in that day. Cascade
    // would fight exerciseLog's onDelete:"restrict" — a substitute with
    // logged history would block deleting the original outright.
    substitutedForPrescriptionId: text("substituted_for_prescription_id").references(
      (): AnyPgColumn => exercisePrescription.id,
      { onDelete: "set null" },
    ),
    // Why the substitute was created ("Máquina ocupada" / "Máquina dañada" /
    // "No me sentí bien" / free text). Kept because the reasons are not
    // clinically equivalent: equipment reasons are logistics, but "no me
    // sentí bien" is a symptom report, and silently swapping the exercise
    // without recording it would erase the one signal a physio would care
    // about. Nullable — substitutes predating this, or reused later, have none.
    substitutionReasonEs: text("substitution_reason_es"),
    // The classification link. Nullable by design: exerciseNameEs stays free
    // text and stays the display name, so an unmatched row degrades to "Sin
    // clasificar" in reports rather than blocking the builder or forcing a
    // catalog picker into the mid-session substitution flow. Reads fall back
    // to name matching (see muscle-taxonomy.ts), so this column is an
    // optimization over that fallback, not the only path.
    //
    // set null rather than restrict: restrict protects logged history on
    // exerciseLog, but this is only a pointer to a classification, and
    // restrict here would recreate exactly the problem baseline_lift caused —
    // catalog rows that can never be cleaned up.
    exerciseId: text("exercise_id").references(() => exercise.id, { onDelete: "set null" }),
  },
  (table) => [
    index("exercise_prescription_plan_session_template_id_idx").on(table.planSessionTemplateId),
    index("exercise_prescription_exercise_id_idx").on(table.exerciseId),
    uniqueIndex("exercise_prescription_template_order_unique").on(table.planSessionTemplateId, table.orderIndex),
  ],
);

// A single-use, email-bound invite to clone a plan into another account —
// never a live link. Redeeming inserts an independent workoutPlan (see
// redeemPlanShare in plan-share-repository.ts); nothing here is ever read or
// written to once status flips to "redeemed" except by a future comparison
// feature reading sharePlanGroupId/lineageKey, both on the plan tables
// above, not on this table.
export const planShareInvite = pgTable(
  "plan_share_invite",
  {
    id: text("id").primaryKey(),
    sourceWorkoutPlanId: text("source_workout_plan_id")
      .notNull()
      .references(() => workoutPlan.id, { onDelete: "cascade" }),
    createdByAthleteProfileId: text("created_by_athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    // Lowercased/trimmed at write time — redemption is only ever a
    // case-insensitive email match against the currently signed-in user.
    recipientEmail: text("recipient_email").notNull(),
    code: text("code").notNull(),
    status: planShareInviteStatusEnum("status").notNull().default("pending"),
    // set null, not restrict/cascade: an invite is a low-stakes historical
    // record, not logged training history — it should never block deleting
    // the profile that redeemed it.
    redeemedByAthleteProfileId: text("redeemed_by_athlete_profile_id").references(() => athleteProfile.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("plan_share_invite_code_unique").on(table.code),
    index("plan_share_invite_source_plan_idx").on(table.sourceWorkoutPlanId),
    index("plan_share_invite_recipient_email_idx").on(table.recipientEmail),
  ],
);

// Slice-2-prep tables: created now so a future set-logging iteration doesn't
// need another migration. No application code reads/writes these yet.

export const workoutSession = pgTable(
  "workout_session",
  {
    id: text("id").primaryKey(),
    athleteProfileId: text("athlete_profile_id")
      .notNull()
      .references(() => athleteProfile.id, { onDelete: "cascade" }),
    workoutPlanId: text("workout_plan_id")
      .notNull()
      .references(() => workoutPlan.id, { onDelete: "cascade" }),
    planSessionTemplateId: text("plan_session_template_id")
      .notNull()
      .references(() => planSessionTemplate.id, { onDelete: "cascade" }),
    status: workoutSessionStatusEnum("status").notNull().default("planned"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    // Whole-session Borg CR10-style effort rating (1 Extremadamente ligero -
    // 10 Esfuerzo máximo), captured on completion. Nullable/optional — low
    // friction to skip, matches notes. Distinct from per-set RIR: RIR is
    // effort relative to failure on one lift, this is systemic fatigue for
    // the whole session. See src/training/rpe.ts for the label scale.
    sessionRpe: integer("session_rpe"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("workout_session_athlete_profile_id_idx").on(table.athleteProfileId),
    index("workout_session_workout_plan_id_idx").on(table.workoutPlanId),
  ],
);

export const exerciseLog = pgTable(
  "exercise_log",
  {
    id: text("id").primaryKey(),
    workoutSessionId: text("workout_session_id")
      .notNull()
      .references(() => workoutSession.id, { onDelete: "cascade" }),
    // Restrict, not cascade: protects logged history from disappearing if a
    // prescription row is ever touched. A plan with logged history should be
    // soft-deleted via workoutPlan.status = "archived", never hard-deleted.
    exercisePrescriptionId: text("exercise_prescription_id")
      .notNull()
      .references(() => exercisePrescription.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index("exercise_log_workout_session_id_idx").on(table.workoutSessionId),
    // Also doubles as the onConflictDoNothing arbiter for the lazy-create
    // race in saveSetForSession (first set logged for an exercise).
    uniqueIndex("exercise_log_session_prescription_unique").on(
      table.workoutSessionId,
      table.exercisePrescriptionId,
    ),
  ],
);

export const setLog = pgTable(
  "set_log",
  {
    id: text("id").primaryKey(),
    exerciseLogId: text("exercise_log_id")
      .notNull()
      .references(() => exerciseLog.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    side: baselineSideEnum("side").notNull().default("bilateral"),
    // Nullable: a duration-type set (see exercisePrescription.prescriptionType)
    // has actualDurationSeconds instead of weight/reps/RIR.
    actualWeightKg: numeric("actual_weight_kg", { precision: 6, scale: 2 }),
    actualReps: integer("actual_reps"),
    rir: integer("rir"),
    actualDurationSeconds: integer("actual_duration_seconds"),
    // Nullable since 2026-08-31, and the null carries meaning: NOT ASKED.
    //
    // Until then this was `notNull` with a pre-filled 0 on every set-logging
    // form, and the result was 58 of 58 real sets logged at exactly 0 across
    // three athletes and a month of training. A scale that is always asked
    // stops being answered, and a field that arrives pre-filled with the
    // answer is not a question at all. Pain is now asked ONCE per exercise,
    // as a binary, and only a "sí" escalates to this 0–10 scale.
    //
    // So the three states are distinct and must stay that way:
    //   null → never asked (every set but the one carrying the answer)
    //   0    → asked, and the athlete said nothing bothered them
    //   1-10 → asked, and this is what they reported
    //
    // Rows predating the change also hold 0, which cannot be told apart from
    // a genuine "no" and is deliberately not backfilled: 0 blocks nothing in
    // suggestProgression, so reading those as "no pain" changes no behaviour.
    // Do NOT let a reader coerce null into 0 — `Math.max(null)` and
    // `null <= 0` both silently do, and one of those readers is a safety
    // brake. Skip nulls explicitly.
    painScore: integer("pain_score"),
    // Where it hurt, asked only when the binary above comes back "sí".
    // Nullable in three senses now: sets logged before this column existed,
    // sets never asked, and an escalation where the athlete skipped the
    // location.
    //
    // Replaces an inference. Before this, the pain-by-joint report attributed
    // a set's pain to every joint its exercise loads, which would report
    // "hombro" for someone whose wrist hurt; that fallback still runs for
    // historical rows, and the UI says which is which.
    //
    // This DOES feed the progression thresholds as of 2026-08-31: "muscular"
    // (ordinary soreness) no longer forces a load reduction the way joint
    // pain does, because DOMS is the expected response to effective
    // hypertrophy work and vetoing progression on it teaches under-reporting.
    // A missing location is treated as joint pain, not as muscular — the
    // conservative side — and pain >= 7 still stops everything regardless of
    // where it is. See suggestProgression in src/training/progression.ts.
    painLocation: painLocationEnum("pain_location"),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    // Deliberately NOT the shared updatedAtColumn() helper used by
    // exerciseLog/workoutSession: nullable, no default, no $onUpdateFn.
    // A `notNull().defaultNow()` column would stamp every pre-existing set as
    // "just updated", making the distinction meaningless. Nullable means
    // `updatedAt !== null` reads as exactly one thing — this set was corrected
    // after it was first logged — which is what the UI's "editado" marker
    // shows. Written explicitly by updateSetForSession, nowhere else.
    //
    // This matters beyond cosmetics: painScore is a safety brake (>2 blocks
    // aggressive progression, >=7 flags professional guidance), so a silently
    // revised pain score would quietly disable the app's pain-aware framing.
    // Editing stays unrestricted — this only makes it visible.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [index("set_log_exercise_log_id_idx").on(table.exerciseLogId)],
);
