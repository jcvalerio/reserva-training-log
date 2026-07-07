import { isGoogleSignInConfigured, getCurrentSession } from "@/lib/auth-server";

import { HomeShell } from "./home-shell";

export default async function Home() {
  const session = await getCurrentSession();

  return <HomeShell user={session?.user ?? null} googleSignInEnabled={isGoogleSignInConfigured()} />;
}
