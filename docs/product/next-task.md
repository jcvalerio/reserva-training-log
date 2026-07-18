# Next Task

## Real iPhone `/plan` seeded preview validation

Latest known commit before this task:
- `182f673 fix: polish seeded preview mobile boundaries`

Objective:
- Validate the complete-state `/plan` seeded preview on an actual iPhone-sized device with tester data, then record whether the read-only review UX is clear enough to proceed toward a future non-AI draft acceptance design.

Hard constraints:
- Do not call AI.
- Do not persist a generated or seeded plan.
- Do not add accept, edit, activate, workout-session, exercise-log, set-log, or progression-suggestion behavior.
- Keep Spanish-first UX; English support must not be removed.
- Preserve pain-aware progression rules and the future every-set logging contract: kg, reps, numeric RIR, pain score, optional notes.

Suggested validation setup:
1. Start local dev reachable from the phone, e.g. `npm run dev -- --hostname 0.0.0.0`.
2. Use the configured LAN/preview host already allowed by `NEXT_ALLOWED_DEV_ORIGINS`.
3. Sign in with a tester account.
4. Ensure Perfil, Pesos base, and Mediciones each have saved data so `/plan` reaches the complete state.
5. Open `/plan` on the iPhone.

Review checklist:
- The top state says IA is off and Plan is not created.
- The seeded preview appears only after all foundations are complete.
- Boundary badges are visible and understandable: Solo lectura, Sin IA, No guardado, No activable.
- Week 1 sessions are readable without horizontal scrolling.
- Exercise detail accordions are easy to tap with one hand.
- Expanded details show phase, side mode, sets, rep range, numeric RIR, rest seconds, pain-sensitive substitutions, and future set-log fields.
- Pain-aware progression reminder is visible and not contradicted by any preview copy.

Pass criteria:
- A tester can understand that this is only a review preview and cannot be saved or started yet.
- No UI element implies plan generation, persistence, acceptance, or activation is available.
- No mobile layout issue blocks reviewing week-1 sessions and exercise details.

If changes are needed:
- Keep them deterministic and small.
- Prefer copy/layout polish or docs updates only.
- Add/update tests for helper output or behavior changes.
- Update `docs/product/implementation-log.md` with validation outcome and the next step.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Commit with a conventional commit, e.g. `fix: polish seeded preview iphone review` or `docs: document seeded preview validation`.
