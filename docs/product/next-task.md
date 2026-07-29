# Next Task

## Status: Slices 1-3 complete

- Slice 1: `/plan` lets a tester activate the seeded plan as a real, persisted, active plan.
- Slice 2: `/entrenar` lets a tester pick a session and log real sets — kg, reps, RIR (0-4), pain (0-10), optional notes — one exercise at a time, and mark a session complete.
- Slice 3: `/entrenar/[sessionId]` shows "Última vez" (previous performance) and a progression suggestion (increase/hold/reduce, with a concrete suggested weight) before the first set of a repeated exercise, prefilling the logging form. This is M5 in `docs/product/milestones.md`, minus its "5% improvement signal" acceptance line (see below).

This delivers, and now extends past, the user's original goal: manually create a plan, record training progress using RIR, and get pain-aware guidance on what to lift next. There is no further hard-constrained "next task" queued — the next step is a product decision.

## Candidate next steps (pick one, or something else)

1. **Progress history / `/progreso`.** Currently disabled in the bottom nav ("Disponible después de registrar sesiones."). Real `setLog` history now exists across multiple sessions per exercise. This is also where M5's still-open "5% improvement signal" acceptance criterion belongs — comparing session N to session N-1 on volume, reps-at-load, load-at-reps, pain trend, and asymmetry (`docs/product/progression-rules.md`'s "5% improvement definition" section already specifies the exact comparison rules; only the engine + UI are missing).
2. **Per-category increment accuracy.** Slice 3's weight suggestion is a flat ±5% because `exercisePrescription` doesn't store an equipment/movement category. `docs/product/progression-rules.md` specifies +5-10% for machines/lower body, +2.5-5% for upper compound, smallest jump for isolation. Adding a category field to the plan schema/seeded data would let the suggestion match that guidance more precisely.
3. **Real-device validation.** No physical-iPhone pass has been done on Slice 3's "Última vez"/suggestion card together with the rest of the wizard. Worth a manual walkthrough, especially the case where the suggested weight looks wrong (should always be trivially overridable).
4. **Custom plan builder.** Out of scope so far — activation has only ever offered the single seeded template. A real builder (choosing exercises/sets/weeks) is a materially larger feature with no existing spec.

## Constraints that still apply regardless of which is picked

- No AI plan generation yet.
- Spanish-first UX; English support must not be removed.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- If schema changes are needed, run `npm run db:generate` then `npm run db:migrate` against the configured dev database, and review the generated SQL before applying.
- Update `docs/product/implementation-log.md` with outcome and next step.
