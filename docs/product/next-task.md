# Next Task

## Status: Slices 1 and 2 complete

- Slice 1: `/plan` lets a tester activate the seeded plan as a real, persisted, active plan.
- Slice 2: `/entrenar` lets a tester pick (or take the suggested) session from their active plan and log real sets — kg, reps, RIR (0-4), pain (0-10), optional notes — one exercise at a time, and mark a session complete.

This delivers the user's original goal: manually create a plan and record training progress using RIR. There is no further hard-constrained "next task" queued — the next step is a product decision.

## Candidate next steps (pick one, or something else)

1. **Progression suggestions.** `src/training/progression.ts` already has a pure, tested `suggestProgression()` rule engine (increase/hold/reduce_or_modify based on completed sets, RIR, pain, rep-drop). Nothing in the UI surfaces it yet. Wiring it into `/entrenar` (e.g. "Sugerencia para la próxima sesión" shown after completing an exercise or session) would close the loop from "log sets" to "get pain-aware guidance," per `docs/product/milestones.md` M5.
2. **Progress history / `/progreso`.** Currently disabled in the bottom nav ("Disponible después de registrar sesiones."). Now that real `setLog` history exists, a read-only history view (weight/rep/RIR trends per exercise, session history) could be built.
3. **Real-device validation.** No physical-iPhone pass has been done on the Slice 1 (`/plan` activation — already manually confirmed working by the user) or Slice 2 (`/entrenar` wizard) flows together in one sitting. Worth a manual walkthrough given how interactive the Slice 2 wizard is (radio-button RIR/side selectors, `useActionState` no-redirect saves).
4. **Custom plan builder.** Out of scope so far — activation has only ever offered the single seeded template. A real builder (choosing exercises/sets/weeks) is a materially larger feature with no existing spec.

## Constraints that still apply regardless of which is picked

- No AI plan generation yet.
- Spanish-first UX; English support must not be removed.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (use `nvm use v24.18.0` — the ambient shell may default to a Node version that breaks Vitest's config loader).
- If schema changes are needed, run `npm run db:generate` then `npm run db:migrate` against the configured dev database, and review the generated SQL before applying.
- Update `docs/product/implementation-log.md` with outcome and next step.
