import { describe, expect, it } from "vitest";

import { resolveBuildVersion } from "./build-version";
import { formatAppVersion } from "@/lib/app-version";

describe("resolveBuildVersion", () => {
  it("prefers Vercel's commit, shortened the way git logs it", () => {
    const version = resolveBuildVersion({
      VERCEL_GIT_COMMIT_SHA: "901eba3f1c2d4e5a6b7c8d9e0f1a2b3c4d5e6f70",
      VERCEL_GIT_COMMIT_REF: "feat/plate-load-assistant",
      VERCEL_ENV: "preview",
    });

    expect(version.commit).toBe("901eba3");
    expect(version.ref).toBe("feat/plate-load-assistant");
    expect(version.environment).toBe("preview");
  });

  /**
   * VERCEL_ENV is the only variable that separates a preview from production —
   * NODE_ENV cannot, because a preview IS a production build. Getting this
   * backwards would label every preview "production", which is precisely the
   * confusion the badge exists to remove.
   */
  it("distinguishes preview from production, which NODE_ENV cannot", () => {
    const preview = resolveBuildVersion({
      VERCEL_GIT_COMMIT_SHA: "abc1234",
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    });
    const local = resolveBuildVersion({ NODE_ENV: "production" });
    const prod = resolveBuildVersion({
      VERCEL_GIT_COMMIT_SHA: "abc1234",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    });

    expect(preview.environment).toBe("preview");
    expect(prod.environment).toBe("production");
    // A laptop build sets NODE_ENV=production too. Reporting it as
    // "production" would be the same lie in a different place.
    expect(local.environment).toBe("local");
  });

  it("falls back to the local checkout when Vercel's vars are absent", () => {
    // Runs inside this repo, so git resolves. Asserted by shape rather than
    // value: pinning a SHA would make the test fail on every commit.
    const version = resolveBuildVersion({});

    expect(version.commit).toMatch(/^[0-9a-f]{7}$/);
    expect(version.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  /**
   * A version badge must never be able to break a build. A shallow CI checkout
   * without git history, or a container without the binary, has to degrade to
   * a placeholder rather than throw during `next build`.
   */
  it("never throws when nothing can resolve the commit", () => {
    const version = resolveBuildVersion({ PATH: "/nonexistent" });

    expect(version.commit).toMatch(/^([0-9a-f]{7}|desconocido)$/);
    expect(version.environment).toBe("local");
  });
});

describe("formatAppVersion", () => {
  it("names the environment whenever it is not production", () => {
    expect(
      formatAppVersion({ commit: "901eba3", ref: "feat/x", environment: "preview", builtAt: "" }),
    ).toBe("preview · 901eba3");
  });

  it("drops the label on production, where there is nothing to disambiguate", () => {
    expect(
      formatAppVersion({ commit: "901eba3", ref: "main", environment: "production", builtAt: "" }),
    ).toBe("901eba3");
  });
});
