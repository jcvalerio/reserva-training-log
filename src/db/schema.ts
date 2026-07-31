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
} from "drizzle-orm/pg-core";

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
  gymContext: text("gym_context").notNull().default("a fully-equipped commercial gym, full gym"),
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

export const exercise = pgTable(
  "exercise",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en").notNull(),
    primaryMuscles: jsonb("primary_muscles").$type<string[]>().notNull().default([]),
    secondaryMuscles: jsonb("secondary_muscles").$type<string[]>().notNull().default([]),
    equipmentType: text("equipment_type").notNull(),
    movementPattern: text("movement_pattern"),
    isUnilateralCapable: boolean("is_unilateral_capable").notNull().default(false),
    jointStressTags: jsonb("joint_stress_tags").$type<string[]>().notNull().default([]),
    defaultRepRangeMin: integer("default_rep_range_min").notNull().default(8),
    defaultRepRangeMax: integer("default_rep_range_max").notNull().default(12),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [uniqueIndex("exercise_slug_unique").on(table.slug)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    // Enforces at most one active plan per profile; also the onConflictDoNothing
    // arbiter used by activateSeededPlanForProfile to close the activation race.
    uniqueIndex("workout_plan_active_per_profile_idx")
      .on(table.athleteProfileId)
      .where(sql`${table.status} = 'active'`),
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
  },
  (table) => [
    index("exercise_prescription_plan_session_template_id_idx").on(table.planSessionTemplateId),
    uniqueIndex("exercise_prescription_template_order_unique").on(table.planSessionTemplateId, table.orderIndex),
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
    painScore: integer("pain_score").notNull(),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("set_log_exercise_log_id_idx").on(table.exerciseLogId)],
);
