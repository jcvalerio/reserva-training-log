import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import { parseAllowedDevOrigins } from "./src/config/dev-origins";

const allowedDevOrigins = parseAllowedDevOrigins(process.env.NEXT_ALLOWED_DEV_ORIGINS);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

// Source-map upload is what turns `at ad (0zsaoe4nar2uk.js:40:55721)` into a
// real file and line. It only runs when the org/project/token are present, so
// a local `npm run build` without Sentry credentials still works unchanged.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,

  // Source maps are uploaded to Sentry and deleted from the deployment, so
  // they are never served to the public from a public-facing app.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Widen the upload so framework frames resolve too — this crash's stack was
  // entirely inside minified vendor chunks.
  widenClientFileUpload: true,

  // No tunnelRoute: it proxies every event through our own server, and this
  // app runs on a free tier where that is a real cost. Revisit only if ad
  // blockers turn out to be swallowing events.
});
