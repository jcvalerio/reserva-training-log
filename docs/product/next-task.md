# Next Task

## Status: Exercise model redesign, Phase 1 code-complete — deploy and verify, then start Phase 2

The custom plan builder (Phase A: flatten week-block model; Phase B: draft builder UI) shipped, deployed, and was verified end-to-end in production — that feature is done. Real usage of it then surfaced a follow-up need: a 4-phase exercise-model redesign is now underway (edit/duplicate an active plan; fix the meaningless `sideMode` choice; fix the confusing `incrementCategory` taxonomy; add duration-based exercises for cardio warmups/mobility holds where RIR/rep-range don't apply). **Phase 1 (editar/duplicar plan, no migration) is code-complete** — `lint`, `typecheck`, `test` (127 passing), and `build` are all green — but not yet deployed or verified.

**Read `docs/product/implementation-log.md`'s "2026-07-30 — Exercise model redesign: Phase 1 complete (editar/duplicar plan)" entry and the full 4-phase design at `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md` before doing anything else.** This file only summarizes the immediate next steps; those two are the source of truth for the design and exact status.

## Immediate next steps

In order:
1. Commit the Phase 1 changes (conventional commit, e.g. `feat: promote plan editing to first-class, add plan duplication`).
2. Deploy to Vercel production (`vercel deploy --prod --yes`).
3. Manually verify against the real active plan: "Editar mi plan" reverts it to draft, round-trips through the builder unchanged, reactivates correctly with logged history intact; "Duplicar como borrador" creates a new draft from the current plan while leaving the original active and untouched.

Once confirmed, start **Phase 2** (collapse `sideMode`'s 3-value enum, which has zero behavioral difference between its two unilateral options today, to a boolean `isUnilateral`) — one migration, full SQL sequencing already specified in the plan file. Phase 3 (replace `incrementCategory` with `loadMechanism` × `isCompound`, two-step migration rollout) and Phase 4 (duration-based exercises — the largest phase, touches the live `set_log` history table, deliberately sequenced last) follow after Phase 2 is deployed and verified. **Do not skip ahead** — this ordering (small/low-risk first, largest/riskiest last) was explicitly confirmed with the user.

## Constraints that still apply

- No AI plan generation yet.
- Spanish-first UX; English support must not be removed.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- This redesign touches a **live production database with a real active plan and real logged history** — every phase with a schema change has a specific migration approach (backfill mapping, single- vs two-step rollout) already worked out in the plan file. Don't improvise a different migration shape without re-reading the plan's reasoning first.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each phase.

## Deferred candidates (lower priority than finishing the exercise model redesign)

1. **Estimated 1RM and asymmetry-improvement signals** for `/progreso` (4 of 6 "5% improvement" signals from `docs/product/progression-rules.md` are done; these 2 need a formula/methodology choice worth flagging to the user, not picking silently). Note: real independent-per-side unilateral progression tracking (deferred out of Phase 2 of the current redesign) would feed directly into the asymmetry signal if ever built.
2. **Body measurement trends on `/progreso`** — `/mediciones` has the data, not surfaced there yet.
3. **Real-device validation** of the full accumulated flow in one sitting.
4. `docs/architecture/data-model.md` is currently out of sync with `src/db/schema.ts` (documents fields that don't exist, e.g. `ExercisePrescription.exerciseId`/`targetWeightKg`, and omits real ones like `painSensitive`/`incrementCategory`) — worth a cleanup pass, ideally folded into whichever exercise-model redesign phase touches those fields anyway.
