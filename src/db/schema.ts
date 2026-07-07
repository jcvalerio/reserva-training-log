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
