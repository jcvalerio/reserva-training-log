import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/env";

const authSecret =
  env.BETTER_AUTH_SECRET ??
  (env.VERCEL ? undefined : "local-development-only-secret-change-before-deploy");

const authBaseUrl = env.BETTER_AUTH_URL ?? (env.VERCEL ? undefined : "http://localhost:3000");
const googleClientId = env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: authSecret,
  baseURL: authBaseUrl,
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
});
