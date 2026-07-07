import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/env";

import * as schema from "./schema";

// Next.js evaluates route modules during production builds. Use a harmless
// placeholder when DATABASE_URL is absent so builds can complete; real auth/db
// requests still require DATABASE_URL to be configured in local/Vercel envs.
const connectionString = env.DATABASE_URL ?? "postgresql://missing:missing@localhost:5432/missing";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
