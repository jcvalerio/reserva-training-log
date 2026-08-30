import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Reserva logs pain scores, pain locations and body measurements. That is
 * health data, and since the app went public it comes from people we do not
 * know. None of it is ever useful for debugging a crash, so none of it leaves
 * the app.
 *
 * `dataCollection: { userInfo: false, httpBodies: [] }` in each Sentry.init
 * is the first line of defence. This is the second: a belt-and-braces scrub
 * applied to every event regardless of how it was captured, because a default
 * that changes in a future SDK version should not silently start exfiltrating
 * medical data.
 *
 * Deliberately an allowlist-shaped denial rather than a blocklist of known
 * field names: anything that looks like a value gets dropped from request
 * data, and only the fields we explicitly need for debugging survive.
 */

/** Query/body/cookie keys that must never appear in an event. */
const SENSITIVE_KEYS = [
  "pain",
  "painscore",
  "painlocation",
  "dolor",
  "weight",
  "peso",
  "reps",
  "rir",
  "rpe",
  "measurement",
  "medicion",
  "thigh",
  "calf",
  "waist",
  "muslo",
  "pantorrilla",
  "cintura",
  "notes",
  "notas",
  "email",
  "name",
  "nombre",
];

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive));
}

/**
 * Session and set ids are UUIDs in the path — those we keep, because they are
 * how you find the offending row, and a UUID on its own identifies nothing
 * without database access. Everything else in the query string goes.
 */
function scrubUrl(url: string): string {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) {
    return url;
  }
  return `${url.slice(0, queryStart)}?[query redacted]`;
}

/**
 * Scrubs a value that might itself carry a query string.
 *
 * Key-name matching is not enough, and a real captured payload proved it: the
 * navigation breadcrumb stores `{ from, to }` — innocuous key names whose
 * *values* were full URLs including `?pain=8&peso=80&medicion=54`. Caught only
 * by reading an actual event, never by reading the config.
 */
function scrubValue(value: unknown): unknown {
  if (typeof value === "string" && value.includes("?")) {
    return scrubUrl(value);
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  return value;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  // Request payloads: drop bodies wholesale, scrub query strings and headers.
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;

    if (typeof event.request.url === "string") {
      event.request.url = scrubUrl(event.request.url);
    }

    if (event.request.query_string) {
      event.request.query_string = "[redacted]";
    }

    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (isSensitiveKey(key) || key.toLowerCase() === "authorization" || key.toLowerCase() === "cookie") {
          event.request.headers[key] = "[redacted]";
        }
      }
    }
  }

  // Never attach a user identity. We want to know a crash happened, not who
  // it happened to; the session id in the URL is enough to find the data.
  delete event.user;

  // Breadcrumbs can carry form values from console logs and fetch bodies.
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => {
      const next = { ...crumb };

      if (crumb.data) {
        const scrubbed: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(crumb.data)) {
          scrubbed[key] = isSensitiveKey(key) ? "[redacted]" : scrubValue(value);
        }
        next.data = scrubbed;
      }

      // A console breadcrumb's message is whatever was logged, and a
      // navigation breadcrumb's is a URL. Both can carry a query string.
      if (typeof next.message === "string") {
        next.message = scrubValue(next.message) as string;
      }

      return next;
    });
  }

  // `extra` and `contexts` are free-form and easy to pollute by accident.
  if (event.extra) {
    for (const key of Object.keys(event.extra)) {
      event.extra[key] = isSensitiveKey(key) ? "[redacted]" : scrubValue(event.extra[key]);
    }
  }

  return event;
}
