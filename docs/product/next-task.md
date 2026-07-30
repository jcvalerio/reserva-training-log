# Next Task

## Status: Slices 1-6 complete

- Slice 1: `/plan` lets a tester activate the seeded plan as a real, persisted, active plan.
- Slice 2: `/entrenar` lets a tester pick a session and log real sets — kg, reps, RIR (0-4), pain (0-10), optional notes — one exercise at a time, and mark a session complete.
- Slice 3: `/entrenar/[sessionId]` shows "Última vez" (previous performance) and a progression suggestion before the first set of a repeated exercise, prefilling the logging form.
- Slice 4: `/progreso` shows session-over-session improvement per exercise plus a full completed-session history linking back into the read-only session view. "Progreso" is now a real nav link (no more disabled destinations in the bottom nav).
- Slice 5: `/progreso` now checks 4 of the 6 "5% improvement" signals from `docs/product/progression-rules.md` — added reps-at-same-load and load-at-same-reps (both RIR-gated) alongside Slice 4's volume load and pain signals.
- Slice 6: weight suggestions in `/entrenar/[sessionId]` now vary by exercise category (`exercisePrescription.incrementCategory`, nullable, added via migration `0007`) instead of a flat ±5% — machines/lower body +5%, upper compound +2.5%, isolation suggests adding a rep instead of weight, dumbbell adds a fixed +2kg step. All 20 seeded exercises hand-classified in `src/plans/seeded-plan.ts`.

This covers the full loop from `docs/product/mvp-plan.md`'s "user journey": create a plan, execute sessions, log every set with RIR/pain, see previous performance and suggestions, and see improvement signals. There is no further hard-constrained "next task" queued — the next step is a product decision. Work has continued autonomously across Slices 4-6 per the user's standing instruction to keep assessing and implementing without waiting for check-ins.

## Candidate next steps (pick one, or something else)

1. **Estimated 1RM and asymmetry-improvement signals.** The last 2 of 6 signals from `docs/product/progression-rules.md`'s "5% improvement definition." 1RM needs a formula choice (Epley/Brzycki or similar) — a genuinely new "made-up number" the user would need to trust, worth flagging explicitly rather than quietly picking one. Asymmetry needs a left/right comparison joined against `baselineLift`, a materially different data shape than the current instance-level `setLog` comparison.
2. **Body measurement trends on `/progreso`.** `/mediciones` already shows recent history and left/right gaps; `/progreso` doesn't currently surface measurement trends alongside workout progress — could be pulled in for a single "everything that's improving" view.
3. **Real-device validation.** No physical-iPhone pass has been done on `/progreso`, the category-aware weight suggestions, or the accumulated Slice 1-6 flow together in one sitting.
4. **Custom plan builder.** Out of scope so far — activation has only ever offered the single seeded template. A real builder (choosing exercises/sets/weeks) is a materially larger feature with no existing spec.
5. **Revisit the seeded-plan exercise classification.** Slice 6's `incrementCategory` assignments in `seeded-plan.ts` are a defensible but subjective judgment call (see the rationale comment there and in `docs/product/progression-rules.md`) — worth a second pass by the user, who knows their actual gym equipment better than the classification heuristic does.

## Constraints that still apply regardless of which is picked

- No AI plan generation yet.
- Spanish-first UX; English support must not be removed.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- If schema changes are needed, run `npm run db:generate` then `npm run db:migrate` against the configured dev database, and review the generated SQL before applying.
- Update `docs/product/implementation-log.md` with outcome and next step.
