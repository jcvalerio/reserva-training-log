# Next Task

## Status: Exercise model redesign, Phases 1-3 done and deployed — verify Phase 3, then start Phase 4 (final phase)

The custom plan builder (Phase A/B) and the exercise-model redesign's Phases 1 (editar/duplicar plan) and 2 (`sideMode` → `isUnilateral`, plus a real unilateral set-counting bug found and fixed during its verification) are done, deployed, and verified in production. **Phase 3 (replace `incrementCategory` with `loadMechanism` × `isCompound`) is deployed** — `lint`, `typecheck`, `test` (133 passing), and `build` are all green, both migrations (`drizzle/0010_steady_eternals.sql` additive backfill, `drizzle/0011_foamy_brother_voodoo.sql` drop) applied cleanly to production per the build log — but not yet manually verified by the user against real `/entrenar` suggestion behavior.

**Read `docs/product/implementation-log.md`'s "2026-07-30 — Exercise model redesign: Phase 3 complete (incrementCategory → loadMechanism × isCompound)" entry and the full 4-phase design at `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md` before doing anything else.** This file only summarizes the immediate next steps; those two are the source of truth for the design and exact status. Note: that log entry also documents a real bug found and fixed *during Phase 3 implementation itself* (before deploy) — the suggestion-priority order didn't match the plan's own spec for dumbbell-vs-isolation exercises — worth reading if touching `progression-view.ts` again.

## Immediate next steps

1. Manually verify in `/entrenar` against the real active plan: a machine-compound, an isolation, and (if present) a dumbbell exercise each show the correct suggested-weight behavior (machine compound ≈+5%, isolation → "añade una repetición", dumbbell → fixed +2kg).

Once confirmed, start **Phase 4** (duration-based exercises — stair-climber/treadmill warmups, timed mobility holds, where RIR/rep-range don't apply) — the largest and riskiest remaining phase, since it touches the live `set_log` history table, not just plan structure. Full schema/Zod-discriminated-union/UI design already specified in the plan file, including three separate places needing the strength/duration discriminated union (not just one) and the query-boundary fix needed in `improvement.ts` so duration-type sets can't corrupt the `/progreso` improvement signals. This is the last phase of the redesign.

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
4. `docs/architecture/data-model.md` is currently out of sync with `src/db/schema.ts` (documents fields that don't exist, e.g. `ExercisePrescription.exerciseId`/`targetWeightKg`, and omits real ones like `painSensitive`/`loadMechanism`/`isCompound`) — worth a cleanup pass, ideally folded into Phase 4 since that's the last phase touching this table.
