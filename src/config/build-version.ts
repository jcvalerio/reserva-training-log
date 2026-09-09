import { execSync } from "node:child_process";

/**
 * Which commit is actually running, resolved once at BUILD time.
 *
 * This exists because a preview looked stale and there was no way to tell
 * from inside the app. The deploy was fine — `preview.gym.jcvalerio.com` is a
 * manual alias (`BETTER_AUTH_URL` is pinned to it so Google OAuth has a fixed
 * redirect URI), and every push creates a NEW preview URL while the alias keeps
 * pointing at whichever deployment was aliased last. So the athlete signs in,
 * sees the previous build, and reports a fix as not working. Nothing in the UI
 * could distinguish that from a broken deploy.
 *
 * Build time rather than request time on purpose: the commit is a property of
 * the bundle, so reading it per request would be both slower and less honest —
 * a value read at runtime describes the environment, not the code you are
 * looking at.
 */
export type BuildVersion = {
  /** Short SHA, or "desconocido" when nothing could resolve it. */
  commit: string;
  /** Branch or tag. Absent locally when git is unavailable. */
  ref: string | null;
  /** "production" | "preview" | "development" on Vercel; "local" otherwise. */
  environment: string;
  /** ISO 8601, stamped at build. */
  builtAt: string;
};

const UNKNOWN_COMMIT = "desconocido";

/** Only the handful of string keys this reads — not the whole `ProcessEnv`,
 *  whose required `NODE_ENV` forced a cast at every call site. */
type BuildEnv = Record<string, string | undefined>;

/**
 * Vercel's git vars first, then a local `git` call, then a placeholder.
 *
 * Deliberately never throws. A version badge that can break the build is a
 * worse trade than one that occasionally reads "desconocido" — the whole point
 * is to make a deploy easier to trust, not to add a way for it to fail.
 */
export function resolveBuildVersion(env: BuildEnv = process.env): BuildVersion {
  const vercelSha = env.VERCEL_GIT_COMMIT_SHA;
  const commit = vercelSha ? vercelSha.slice(0, 7) : localGitCommit();

  return {
    commit: commit ?? UNKNOWN_COMMIT,
    ref: env.VERCEL_GIT_COMMIT_REF ?? localGitRef(),
    // VERCEL_ENV is the only variable that separates a preview from prod, and
    // NODE_ENV cannot help: a preview IS a production build, so reading
    // NODE_ENV labels every preview "production".
    //
    // Its absence means the build never went through Vercel, so it is local —
    // said plainly rather than reported as "production", which is the same
    // class of confusion this whole stamp exists to remove. `npm run build`
    // on a laptop sets NODE_ENV=production and would otherwise be
    // indistinguishable from the deployed app.
    environment: env.VERCEL_ENV ?? "local",
    builtAt: new Date().toISOString(),
  };
}

function localGitCommit(): string | null {
  return runGit("rev-parse --short=7 HEAD");
}

function localGitRef(): string | null {
  const ref = runGit("rev-parse --abbrev-ref HEAD");
  return ref === "HEAD" ? null : ref;
}

function runGit(args: string): string | null {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim() || null;
  } catch {
    // No git, no repo, or a shallow checkout without one. All fine.
    return null;
  }
}
