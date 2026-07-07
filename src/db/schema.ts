import {
  boolean,
  integer,
  jsonb,
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
