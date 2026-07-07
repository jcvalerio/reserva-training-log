import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function loadLocalEnv() {
  for (const path of [".env.local", ".env"]) {
    if (!process.env.DATABASE_URL && existsSync(path)) {
      process.loadEnvFile(path);
    }
  }
}

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Add it to .env.local or export it before running Drizzle commands.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
