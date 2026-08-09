import type { Viewport } from "next";

/**
 * The app's root viewport, kept in its own module so it stays unit-testable —
 * importing layout.tsx directly pulls in next/font/google, which doesn't load
 * under vitest.
 *
 * No maximumScale/userScalable here, deliberately: `maximumScale: 1` used to
 * block both pinch-to-zoom and Safari's per-site "aA" text-size control on
 * iOS — the only two ways a user can enlarge an under-sized web page, since
 * mobile Safari does not apply the OS "Larger Text" accessibility setting to
 * arbitrary page CSS. That made the app hard to read for a real user with the
 * system text size turned up (WCAG 1.4.4 / 1.4.10). Leaving both unset means
 * Next omits `user-scalable` entirely and zoom stays available.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
