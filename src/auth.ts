import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/db";
import * as schema from "@/db/schema";

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  (process.env.VERCEL ? undefined : "local-development-only-secret-change-before-deploy");

const authBaseUrl = process.env.BETTER_AUTH_URL ?? (process.env.VERCEL ? undefined : "http://localhost:3000");
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

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
