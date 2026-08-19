import Link from "next/link";

import { getHomeNavItems } from "./home-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";

// Required, not optional: every page must make a deliberate choice rather
// than silently shipping without one. null is reserved for the 5 bottom-nav
// home pages (/, /perfil, /plan, /entrenar, /progreso), where the nav tabs
// themselves are the navigation — every other page is one drill-down deep
// (or more) from one of those and needs an explicit way back up, in one
// consistent place instead of the three different ad-hoc patterns this
// replaced (a top text link, a bottom button, or nothing at all).
export type AppShellBackTo = { href: string; label: string } | null;

export function AppShell({
  activeHref,
  backTo,
  showBrandBar = true,
  children,
}: {
  activeHref: string;
  backTo: AppShellBackTo;
  // The "MVP personal · iPhone Web" / "ES · EN pronto" row is orientation for
  // someone opening the app, and pure cost once they're mid-task. The active
  // session runner turns it off: it's the one screen where vertical space is
  // genuinely scarce (a sticky exercise header now occupies roughly the same
  // height), and nothing in that row is readable as anything but chrome to
  // someone standing at a machine between sets.
  showBrandBar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-zinc-950 text-zinc-50">
      <main className="flex min-h-dvh flex-col px-5 pt-6 pb-[calc(6.5rem+max(1rem,env(safe-area-inset-bottom)))]">
        {showBrandBar ? (
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald-300">MVP personal · iPhone Web</p>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
              ES · EN pronto
            </span>
          </div>
        ) : null}
        {backTo ? (
          <Link
            href={backTo.href}
            className="mb-4 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            ← Volver a {backTo.label}
          </Link>
        ) : null}
        {children}
      </main>
      <MobileBottomNav items={getHomeNavItems()} activeHref={activeHref} />
    </div>
  );
}
