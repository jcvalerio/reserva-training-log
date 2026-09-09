import { NextResponse } from "next/server";

import { appVersion } from "@/lib/app-version";

/**
 * Which commit is serving this URL, as JSON, without signing in.
 *
 * Unauthenticated by this app on purpose. The case it exists for is an athlete
 * on a phone saying "this still looks like the old version", and a signed-out
 * check is the only way to tell a stale ALIAS from a stale session.
 *
 * "Public" is bounded by Vercel rather than by us: raw `*.vercel.app` preview
 * URLs sit behind Vercel's deployment protection and answer with an SSO
 * redirect, so this is directly reachable on production and on the aliased
 * preview hostname — which are the two places anyone is actually testing.
 *
 * The commit SHA of a public repository is not a secret; the branch name and
 * build time are the two other things you need to tell two previews apart.
 *
 * Static, and that is not a caching compromise — it is the correctness
 * argument. The values are build-time constants, so the response is a property
 * of one deployment. Every deployment serves its own copy, which is exactly
 * what makes a stale alias detectable: the alias resolves to some deployment,
 * and that deployment answers with its own commit and cannot answer with
 * another's.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(appVersion());
}
