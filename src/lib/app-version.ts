import type { BuildVersion } from "@/config/build-version";

/**
 * The build stamp, read from the values next.config.ts inlined.
 *
 * A plain module rather than a re-export of `resolveBuildVersion`: that
 * function shells out to `git` and must never be pulled into a bundle. These
 * are string literals by the time anything here runs.
 */
export function appVersion(): BuildVersion {
  return {
    commit: process.env.APP_COMMIT || "desconocido",
    ref: process.env.APP_REF || null,
    environment: process.env.APP_ENVIRONMENT || "development",
    builtAt: process.env.APP_BUILT_AT || "",
  };
}

/**
 * "preview · 901eba3" — what to put in front of a human checking whether the
 * fix they were sent is actually the one they are looking at.
 *
 * Production drops the environment, since there is nothing to disambiguate it
 * from and the label would only be noise on the screen everyone else uses.
 */
export function formatAppVersion(version: BuildVersion = appVersion()): string {
  return version.environment === "production" ? version.commit : `${version.environment} · ${version.commit}`;
}
