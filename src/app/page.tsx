import { isGoogleSignInConfigured, getCurrentSession } from "@/lib/auth-server";
import { getM1Readiness } from "@/onboarding/readiness";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { HomeShell } from "./home-shell";

export default async function Home() {
  const session = await getCurrentSession();
  const profile = session?.user ? await getAthleteProfileForUser(session.user.id) : null;

  const readiness = session?.user ? getM1Readiness({ hasProfile: Boolean(profile) }) : null;

  return (
    <HomeShell
      user={session?.user ?? null}
      googleSignInEnabled={isGoogleSignInConfigured()}
      readiness={readiness}
    />
  );
}
