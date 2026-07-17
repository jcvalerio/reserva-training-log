import { getBaselineLiftsForProfile } from "@/baseline/baseline-repository";
import { isGoogleSignInConfigured, getCurrentSession } from "@/lib/auth-server";
import { getRecentBodyMeasurementsForProfile } from "@/measurements/measurement-repository";
import { getM1Readiness } from "@/onboarding/readiness";
import { getAthleteProfileForUser } from "@/profile/profile-repository";

import { HomeShell } from "./home-shell";

export default async function Home() {
  const session = await getCurrentSession();
  const profile = session?.user ? await getAthleteProfileForUser(session.user.id) : null;

  const [baselineLifts, bodyMeasurements] = profile
    ? await Promise.all([
        getBaselineLiftsForProfile(profile.id),
        getRecentBodyMeasurementsForProfile(profile.id, 1),
      ])
    : [[], []];

  const readiness = session?.user
    ? getM1Readiness({
        hasProfile: Boolean(profile),
        baselineLiftCount: baselineLifts.length,
        bodyMeasurementCount: bodyMeasurements.length,
      })
    : null;

  return (
    <HomeShell
      user={session?.user ?? null}
      googleSignInEnabled={isGoogleSignInConfigured()}
      readiness={readiness}
    />
  );
}
