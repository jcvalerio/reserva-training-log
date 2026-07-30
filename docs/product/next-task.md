# Next Task

## Status: Slices 1-4 complete

- Slice 1: `/plan` lets a tester activate the seeded plan as a real, persisted, active plan.
- Slice 2: `/entrenar` lets a tester pick a session and log real sets — kg, reps, RIR (0-4), pain (0-10), optional notes — one exercise at a time, and mark a session complete.
- Slice 3: `/entrenar/[sessionId]` shows "Última vez" (previous performance) and a progression suggestion before the first set of a repeated exercise, prefilling the logging form.
- Slice 4: `/progreso` shows session-over-session improvement per exercise (volume load +5%, pain -2, per `docs/product/progression-rules.md`'s "5% improvement definition" — 2 of 6 signals implemented) plus a full completed-session history linking back into the read-only session view. "Progreso" is now a real nav link (no more disabled destinations in the bottom nav).

This covers the full loop from `docs/product/mvp-plan.md`'s "user journey": create a plan, execute sessions, log every set with RIR/pain, see previous performance and suggestions, and see improvement signals. There is no further hard-constrained "next task" queued — the next step is a product decision.

## Candidate next steps (pick one, or something else)

1. **Fill out the remaining "5% improvement" signals.** `/progreso` currently only checks volume load and pain. `docs/product/progression-rules.md` also defines reps-at-same-load, load-at-same-reps, estimated-1RM, and asymmetry-improvement signals — all computable from existing `setLog` data, just not implemented (reps/load-at-X need per-set matching logic, 1RM needs a formula choice, asymmetry needs a left/right comparison across `baselineLift`/`setLog`).
2. **Per-category weight-increment accuracy.** Slice 3's suggested weight is a flat ±5% because `exercisePrescription` doesn't store an equipment/movement category. `docs/product/progression-rules.md` specifies +5-10% for machines/lower body, +2.5-5% for upper compound, smallest jump for isolation.
3. **Body measurement trends on `/progreso`.** `/mediciones` already shows recent history and left/right gaps; `/progreso` doesn't currently surface measurement trends alongside workout progress — could be pulled in for a single "everything that's improving" view.
4. **Real-device validation.** No physical-iPhone pass has been done on `/progreso` or the accumulated Slice 1-4 flow together in one sitting.
5. **Custom plan builder.** Out of scope so far — activation has only ever offered the single seeded template. A real builder (choosing exercises/sets/weeks) is a materially larger feature with no existing spec.

## Constraints that still apply regardless of which is picked

- No AI plan generation yet.
- Spanish-first UX; English support must not be removed.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- If schema changes are needed, run `npm run db:generate` then `npm run db:migrate` against the configured dev database, and review the generated SQL before applying.
- Update `docs/product/implementation-log.md` with outcome and next step.
