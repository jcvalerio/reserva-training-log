import { getHomeNavItems } from "./home-nav";
import { MobileBottomNav } from "./mobile-bottom-nav";

export function AppShell({
  activeHref,
  children,
}: {
  activeHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-zinc-950 text-zinc-50">
      <main className="flex min-h-dvh flex-col px-5 pt-6 pb-[calc(6.5rem+max(1rem,env(safe-area-inset-bottom)))]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-emerald-300">MVP personal · iPhone Web</p>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
            ES · EN pronto
          </span>
        </div>
        {children}
      </main>
      <MobileBottomNav items={getHomeNavItems()} activeHref={activeHref} />
    </div>
  );
}
