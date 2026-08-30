import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "./sentry-privacy";

// Turbopack (the default bundler from Next 16) does NOT auto-import a
// sentry.client.config.ts the way the webpack build did — `instrumentation-client.ts`
// is the supported entry point. Don't rename this file.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Tag every event with the deployed commit so a stack trace can be tied to
  // an exact build. Vercel injects this automatically.
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",

  // See src/sentry-privacy.ts. This app logs health data; none of it leaves.
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  beforeSend: scrubEvent,

  // Errors only. Tracing is off deliberately: the free tier's quota is better
  // spent on crashes than on spans, and this app has no latency problem worth
  // instrumenting. Session Replay is off too — it records the screen, and this
  // screen shows pain scores and measurements.
  tracesSampleRate: 0,

  // A crash on someone's phone mid-workout is the thing we cannot afford to
  // miss, so don't sample errors down.
  sampleRate: 1.0,
});
