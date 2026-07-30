# Next Task

## Status: Phase A code complete — deploy and verify, then start Phase B

Slices 1-6 (see `docs/product/implementation-log.md` for their history) shipped and are live in production. Since then, work has been underway on letting each person (the user, Athlete B, Athlete C — separate logins already supported) define their own real routine instead of everyone sharing the one hardcoded seeded plan. **Phase A (flatten the week-block model into one indefinitely-repeating routine) is now code-complete**: `lint`, `typecheck`, `test` (105 passing), and `build` are all green, but the changes are not yet committed, deployed, or verified against real production data.

**Read `docs/product/implementation-log.md`'s "2026-07-30 — Custom plan builder: Phase A complete" entry and the full design plan at `/Users/jcvalerio/.claude/plans/can-you-check-the-mutable-hollerith.md` before doing anything else.** This file only summarizes the immediate next steps; those two are the source of truth for the design and exact status.

## Immediate next steps

In order:
1. Commit the Phase A changes (conventional commit, e.g. `refactor: flatten plan schema to indefinite-repeat model`) — keep it separate from the unrelated, already-staged deployment-config commit (see below).
2. Deploy to Vercel production (`vercel deploy --prod --yes`).
3. Manually verify `/plan`, `/entrenar`, `/progreso` against the real production DB's existing 4-week activated plan: plan overview shows 5 sessions (not 20), `/entrenar` shows a flat list with a real suggestion (never a dead "you're done" state), progress history cards show "Día N" not "Semana 1 · Día N," nothing crashes.

Only after that: **Phase B** — the actual draft plan builder (`plan-builder-schema.ts`, `plan-builder-repository.ts`, `/app/plan/builder/*` routes and actions, tests) — not started yet. Full design already worked out in the plan file.

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
