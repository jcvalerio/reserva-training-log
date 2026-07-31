"use client";

import Link from "next/link";
import { useState } from "react";

import type { HomeNavItem } from "./home-nav";

export function MobileBottomNav({
  items,
  activeHref,
}: {
  items: HomeNavItem[];
  activeHref: string;
}) {
  const firstDisabledReason = items.find((item) => !item.href)?.disabledReasonEs ?? null;
  const [visibleReason, setVisibleReason] = useState<string | null>(null);
  const disabledReason = visibleReason ?? firstDisabledReason;

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-zinc-800 bg-zinc-950/95 px-2 pt-2 shadow-2xl shadow-black/50 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          if (!("disabledReasonEs" in item)) {
            return (
              <Link
                key={item.labelEs}
                href={item.href}
                aria-label={item.labelEs}
                aria-current={item.href === activeHref ? "page" : undefined}
                className={`min-h-12 rounded-2xl px-1 py-2 text-center text-[0.68rem] font-semibold leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                  item.href === activeHref
                    ? "bg-emerald-300 text-zinc-950"
                    : "bg-zinc-900 text-zinc-300 ring-1 ring-zinc-800"
                }`}
              >
                {item.shortLabelEs ?? item.labelEs}
              </Link>
            );
          }

          const reason = item.disabledReasonEs ?? "Esta sección todavía no está disponible.";

          return (
            <button
              key={item.labelEs}
              type="button"
              aria-label={item.labelEs}
              aria-disabled="true"
              aria-describedby="disabled-nav-reason"
              onClick={() => setVisibleReason(reason)}
              onFocus={() => setVisibleReason(reason)}
              className="min-h-12 rounded-2xl bg-zinc-950 px-1 py-2 text-center text-[0.68rem] font-semibold leading-tight text-zinc-500 ring-1 ring-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              {item.shortLabelEs ?? item.labelEs}
            </button>
          );
        })}
      </div>
      {disabledReason ? (
        <p id="disabled-nav-reason" className="min-h-6 px-2 py-1 text-center text-xs leading-5 text-amber-200">
          {disabledReason}
        </p>
      ) : null}
    </nav>
  );
}
