# Next Task

## Status: Phase A and Phase B both code-complete — commit, deploy, and verify Phase B end-to-end

Slices 1-6 (see `docs/product/implementation-log.md` for their history) shipped and are live in production. Since then, work has been underway on letting each person (the user, Athlete B, Athlete C — separate logins already supported) define their own real routine instead of everyone sharing the one hardcoded seeded plan. **Phase A (flatten the week-block model) is done, deployed, and verified.** **Phase B (the actual draft plan builder) is now code-complete** — `lint`, `typecheck`, `test` (123 passing), and `build` are all green — but not yet committed, deployed, or verified end-to-end.

**Read `docs/product/implementation-log.md`'s "2026-07-30 — Custom plan builder: Phase B (draft plan builder) implemented" entry and the full design plan at `/Users/jcvalerio/.claude/plans/can-you-check-the-mutable-hollerith.md` before doing anything else.** This file only summarizes the immediate next steps; those two are the source of truth for the design and exact status.

## Immediate next steps

In order:
1. Commit the Phase B changes (conventional commit, e.g. `feat: add draft plan builder`).
2. Deploy to Vercel production (`vercel deploy --prod --yes`).
3. Have the user build a real routine end-to-end against production: create a draft, add exercises for each day, activate it, and confirm it replaces the prior active plan, old logged history stays visible in `/progreso`, and session logging/previous-performance/progression suggestions keep working unchanged against the new plan.

Once that's confirmed, the custom plan builder feature is done. No further phases are planned for it; see the "Deferred candidates" list below for what's next.

## Separate loose end (unrelated to the plan builder, also still open)

The prior session's Vercel deployment-config commit (`vercel.json`, `package.json` engines fix, `.gitignore` entry) is **still only staged, never committed** — hit `1Password: failed to fill whole buffer` twice and was never retried. It's already deployed and working in production regardless, but git history doesn't reflect it. Worth committing (retry once 1Password is unlocked) whenever convenient, independently of the plan-builder work — don't let it block Phase A/B.

## Constraints that still apply

- No AI plan generation yet.
- Spanish-first UX; English support must not be removed.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- No DB migration needed for the plan-builder work (confirmed during design review) — if you find yourself reaching for `npm run db:generate`, stop and re-check the plan file, that wasn't the design.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step.

## Deferred candidates (from before the plan-builder work started, still valid, lower priority than finishing this)

1. **Estimated 1RM and asymmetry-improvement signals** for `/progreso` (4 of 6 "5% improvement" signals from `docs/product/progression-rules.md` are done; these 2 need a formula/methodology choice worth flagging to the user, not picking silently).
2. **Body measurement trends on `/progreso`** — `/mediciones` has the data, not surfaced there yet.
3. **Real-device validation** of the full accumulated flow in one sitting.
4. **Revisit the seeded-plan exercise classification** (`incrementCategory` assignments in `seeded-plan.ts`) — a defensible but subjective judgment call the user may want to correct with real gym knowledge. Less relevant once Phase B ships, since the user's own custom plan will replace the seeded one as their active plan anyway.
