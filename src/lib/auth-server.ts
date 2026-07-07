import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { env } from "@/env";

export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export type CurrentSession = NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;
export type CurrentUser = CurrentSession["user"];

export async function requireCurrentUser(): Promise<CurrentUser> {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/");
  }

  return session.user;
}

export function isGoogleSignInConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
