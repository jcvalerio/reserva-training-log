import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VERCEL: optionalNonEmptyString,
  DATABASE_URL: optionalNonEmptyString,
  BETTER_AUTH_URL: optionalNonEmptyString,
  BETTER_AUTH_SECRET: optionalNonEmptyString,
  GOOGLE_CLIENT_ID: optionalNonEmptyString,
  GOOGLE_CLIENT_SECRET: optionalNonEmptyString,
  GOOGLE_GENERATIVE_AI_API_KEY: optionalNonEmptyString,
  GOOGLE_GENERATIVE_AI_MODEL: optionalNonEmptyString,
});

export const env = envSchema.parse(process.env);

export function requireEnv(keys: Array<keyof typeof env>) {
  const missingKeys = keys.filter((key) => !env[key]);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missingKeys.join(", ")}`);
  }
}
