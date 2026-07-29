# Next Task

## Real iPhone mobile-shell validation

Automated supplement:
- `src/app/mobile-bottom-nav.test.tsx` covers persistent bottom navigation links and visible disabled-area feedback.
- `src/app/baseline/baseline-intake-form.test.tsx` covers Baseline progress copy, jump anchors, and live row-completion updates.
- `src/app/plan/plan-page-content.test.tsx` still covers deterministic complete/incomplete `/plan` seeded preview states.

Objective:
- Validate the current iPhone web foundation on an actual device with tester data: persistent bottom navigation, form save feedback, safe-area sticky submit buttons, and the long Baseline progress/jump UX.

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
4. Walk through `/perfil`, `/baseline`, `/mediciones`, and `/plan` from the bottom nav.

Review checklist:
- Bottom nav is visible on every implemented route and does not collide with the iPhone home indicator.
- Tapping Entrenar or Progreso shows a visible reason instead of doing nothing.
- The `ES · EN pronto` pill does not read as a working locale switcher.
- Sticky submit buttons remain above the bottom nav/home indicator.
- Submit buttons show a pending state on save.
- Successful saves show a clear banner.
- Invalid Perfil/Baseline/Mediciones inputs return to the form with an inline error banner, not a generic error page.
- Baseline progress shows completed exercise/row counts while editing.
- `Ir a pendiente` and exercise anchors make the long Baseline form easier to navigate.
- `/plan` still clearly says IA is off, Plan is not created, and the seeded preview is read-only/non-persisted when foundations are complete.

Pass criteria:
- A tester can move between foundation screens without bouncing through Inicio.
- A tester can tell whether a save worked or failed.
- No mobile layout issue blocks completing at least one Baseline row or reviewing `/plan`.
- No UI element implies plan generation, persistence, acceptance, or activation is available.

If changes are needed:
- Keep them deterministic and small.
- Prefer copy/layout polish or docs updates only.
- Add/update tests for helper output or behavior changes.
- Update `docs/product/implementation-log.md` with validation outcome and the next step.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Commit with a conventional commit, e.g. `fix: polish iphone foundation nav` or `docs: document iphone foundation validation`.
