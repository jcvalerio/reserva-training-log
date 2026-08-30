import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "./sentry-privacy";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),

  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV ?? "development",

  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
  beforeSend: scrubEvent,

  tracesSampleRate: 0,
  sampleRate: 1.0,
});
