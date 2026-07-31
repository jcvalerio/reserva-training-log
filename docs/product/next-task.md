# Next Task

## Status: exercise-model redesign, onboarding audit, and entrenar/progreso value work all done and deployed. No task in progress.

Everything below is complete, deployed to production, and verified (either by the user directly or against real dev-DB data): the custom plan builder (Phase A/B), all 4 phases of the exercise-model redesign (edit/duplicate plans, `sideMode`→`isUnilateral`, `incrementCategory`→`loadMechanism`×`isCompound`, duration-type exercises), a segundos/minutos toggle for duration inputs, a fix for the session-editor FK-violation crash on plans with logged history, a fix allowing a completed `/entrenar` day to be restarted (plan repeats indefinitely — no week concept), a two-choice "Usar una plantilla / Crear mi propio plan" start fork replacing the auto-expanded seeded plan, a real plan-template catalog (hypertrophy + a fat-loss A/B circuit plan), removal of the "Pesos base" feature and simplification of the pre-plan readiness gate to just "profile exists," a pass surfacing five computed-but-hidden values on `/entrenar`/`/progreso` (set notes, progression risk flag, avg weight/reps deltas, session duration, exercise count per day), a body-measurement trend card on `/progreso`, surfacing the plan/session narrative fields (`notesEs`/`mobilityNotesEs`/`safetySummaryEs`) everywhere a plan is previewed or trained, the last 2 of `docs/product/progression-rules.md`'s 6 "5% improvement" signals (estimated 1RM, asymmetry improvement) — all 6 are now implemented — and a full rewrite of `docs/architecture/data-model.md` against the real current `src/db/schema.ts` (it had drifted back to describing pre-MVP conceptual design: fictional `exerciseId`/`sideMode`/`targetWeightKg` fields, a `ProgressionSuggestion` table that was never built, `/baseline` described as live when it was removed this session, etc.).

Read `docs/product/implementation-log.md` (newest entries first) for full detail on any of the above before touching related code — it's the source of truth for design decisions and known gaps, not this file.

## Good next-phase candidates (unranked — pick one, or suggest something else)

1. **Real-device validation** of the full accumulated flow in one sitting (profile → template or custom plan → `/entrenar` across a full rotation including a restart → `/progreso`) — hasn't been done end-to-end on an actual phone since before this session's changes piled up.
2. **Perfil form simplification** — confirmed every field beyond the profile row's existence is currently unused (was likely meant as an AI-generation context payload). Left as-is per the user's explicit choice to preserve it for potential future AI use; revisit only if that changes.
3. **`WorkoutSession.notes`** — a real (not deliberate) gap found while rewriting the data-model doc: the column exists, nothing reads or writes it. Unlike `Exercise`/`BaselineLift` (deliberately orphaned when "Pesos base" was removed), this one was never wired up in the first place. Small: either add a session-level notes field to the `/entrenar` complete-session flow, or drop the column.

## Constraints that still apply

- No AI plan generation yet (`src/ai/provider.ts` has zero imports anywhere in the app — this is still fully off).
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
