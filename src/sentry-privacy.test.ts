import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";

import { scrubEvent } from "./sentry-privacy";

function eventWith(partial: Partial<ErrorEvent>): ErrorEvent {
  return { type: undefined, ...partial } as ErrorEvent;
}

describe("scrubEvent", () => {
  it("drops the request body entirely, whatever is in it", () => {
    const event = eventWith({
      request: { url: "https://gym.jcvalerio.com/entrenar/abc", data: { painScore: 7, actualWeightKg: "80" } },
    });

    expect(scrubEvent(event)?.request?.data).toBeUndefined();
  });

  it("drops cookies, which carry the session", () => {
    const event = eventWith({ request: { cookies: { "better-auth.session_token": "secret" } } });

    expect(scrubEvent(event)?.request?.cookies).toBeUndefined();
  });

  it("keeps the URL path but redacts the query string", () => {
    // The session UUID in the path is how you find the offending row, and on
    // its own it identifies nobody without database access. The query string
    // has no such justification.
    const event = eventWith({
      request: { url: "https://gym.jcvalerio.com/entrenar/677d49ab?ejercicio=x&pain=8" },
    });

    expect(scrubEvent(event)?.request?.url).toBe("https://gym.jcvalerio.com/entrenar/677d49ab?[query redacted]");
  });

  it("leaves a URL with no query string untouched", () => {
    const event = eventWith({ request: { url: "https://gym.jcvalerio.com/progreso" } });

    expect(scrubEvent(event)?.request?.url).toBe("https://gym.jcvalerio.com/progreso");
  });

  it("redacts the query_string field as well as the URL", () => {
    const event = eventWith({ request: { query_string: "pain=8&peso=80" } });

    expect(scrubEvent(event)?.request?.query_string).toBe("[redacted]");
  });

  it("redacts auth and cookie headers", () => {
    const event = eventWith({
      request: { headers: { Authorization: "Bearer x", Cookie: "a=b", "User-Agent": "iPhone" } },
    });

    const headers = scrubEvent(event)?.request?.headers;
    expect(headers?.Authorization).toBe("[redacted]");
    expect(headers?.Cookie).toBe("[redacted]");
    // User-Agent is the whole point of device debugging — it must survive.
    expect(headers?.["User-Agent"]).toBe("iPhone");
  });

  it("never attaches a user identity", () => {
    const event = eventWith({ user: { id: "user-1", email: "someone@example.com" } });

    expect(scrubEvent(event)?.user).toBeUndefined();
  });

  it("redacts sensitive keys in breadcrumb data but keeps the rest", () => {
    const event = eventWith({
      breadcrumbs: [
        {
          category: "fetch",
          data: { url: "/entrenar", painScore: 7, actual_weight_kg: "80", status_code: 500 },
        },
      ],
    });

    const data = scrubEvent(event)?.breadcrumbs?.[0]?.data;
    expect(data?.painScore).toBe("[redacted]");
    expect(data?.actual_weight_kg).toBe("[redacted]");
    expect(data?.status_code).toBe(500);
    expect(data?.url).toBe("/entrenar");
  });

  it("matches sensitive keys regardless of casing, underscores or hyphens", () => {
    const event = eventWith({
      extra: { PAIN_SCORE: 7, "pain-location": "hombro", actualReps: 10, RIR: 2, harmless: "keep" },
    });

    const extra = scrubEvent(event)?.extra;
    expect(extra?.PAIN_SCORE).toBe("[redacted]");
    expect(extra?.["pain-location"]).toBe("[redacted]");
    expect(extra?.actualReps).toBe("[redacted]");
    expect(extra?.RIR).toBe("[redacted]");
    expect(extra?.harmless).toBe("keep");
  });

  it("redacts Spanish field names too, since the app is Spanish-first", () => {
    const event = eventWith({ extra: { dolor: 8, peso: "80", medicion: "54", notas: "me duele el hombro" } });

    const extra = scrubEvent(event)?.extra;
    expect(extra?.dolor).toBe("[redacted]");
    expect(extra?.peso).toBe("[redacted]");
    expect(extra?.medicion).toBe("[redacted]");
    expect(extra?.notas).toBe("[redacted]");
  });

  it("redacts body-measurement field names", () => {
    const event = eventWith({ extra: { thigh: 54, calf: 36, muslo: 54, pantorrilla: 36, cintura: 80 } });

    const extra = scrubEvent(event)!.extra!;
    for (const value of Object.values(extra)) {
      expect(value).toBe("[redacted]");
    }
  });

  it("passes through an event with nothing sensitive, so real crashes still arrive", () => {
    const event = eventWith({
      request: { url: "https://gym.jcvalerio.com/entrenar/abc", headers: { "User-Agent": "iPhone" } },
      breadcrumbs: [{ category: "navigation", data: { from: "/entrenar", to: "/entrenar/abc" } }],
    });

    const scrubbed = scrubEvent(event);
    expect(scrubbed).not.toBeNull();
    expect(scrubbed?.request?.url).toBe("https://gym.jcvalerio.com/entrenar/abc");
    expect(scrubbed?.breadcrumbs?.[0]?.data?.to).toBe("/entrenar/abc");
  });

  it("handles an event with no request, user, breadcrumbs or extra", () => {
    expect(() => scrubEvent(eventWith({}))).not.toThrow();
  });
});
