# Next Task

## Status: exercise-model redesign done and deployed; onboarding + entrenar/progreso value audits done and deployed. No task in progress.

Everything below is complete, deployed to production, and verified (either by the user directly or against real dev-DB data): the custom plan builder (Phase A/B), all 4 phases of the exercise-model redesign (edit/duplicate plans, `sideMode`→`isUnilateral`, `incrementCategory`→`loadMechanism`×`isCompound`, duration-type exercises), a segundos/minutos toggle for duration inputs, a fix for the session-editor FK-violation crash on plans with logged history, a fix allowing a completed `/entrenar` day to be restarted (plan repeats indefinitely — no week concept), a two-choice "Usar una plantilla / Crear mi propio plan" start fork replacing the auto-expanded seeded plan, a real plan-template catalog (hypertrophy + a new fat-loss A/B circuit plan), removal of the "Pesos base" feature and simplification of the pre-plan readiness gate to just "profile exists," and a pass surfacing five computed-but-hidden values on `/entrenar`/`/progreso` (set notes, progression risk flag, avg weight/reps deltas, session duration, exercise count per day).

Read `docs/product/implementation-log.md` (newest entries first) for full detail on any of the above before touching related code — it's the source of truth for design decisions and known gaps, not this file.

## Good next-phase candidates (unranked — pick one, or suggest something else)

1. **Body measurement trends on `/progreso`.** `/mediciones` already computes thigh/calf asymmetry gaps and keeps full history, but none of it surfaces on `/progreso` alongside exercise improvement. A body-weight trend line would pair naturally with the new fat-loss template's whole premise.
2. **Estimated 1RM and asymmetry-improvement signals** for `/progreso` — 4 of 6 "5% improvement" signals from `docs/product/progression-rules.md` are implemented; these 2 were deferred because they need a methodology choice (1RM formula; asymmetry needs real per-side progression tracking, not just instance comparison) that shouldn't be picked silently.
3. **Surface the plan/session narrative fields that are currently write-only**: `notesEs` (per exercise), `mobilityNotesEs` (per session), `safetySummaryEs` (per plan) are all required, carefully authored (especially for the new fat-loss template's progression guidance), and never rendered anywhere in the UI. Same class of gap as the onboarding/entrenar audits already fixed, just not yet done for the plan-preview surface.
4. **`docs/architecture/data-model.md` cleanup** — out of sync with `src/db/schema.ts` (documents fields that don't exist, omits real ones like `painSensitive`/`loadMechanism`/`isCompound`/`prescriptionType`). Pure documentation debt.
5. **Real-device validation** of the full accumulated flow in one sitting (profile → template or custom plan → `/entrenar` across a full rotation including a restart → `/progreso`) — hasn't been done end-to-end on an actual phone since before this session's changes piled up.
6. **Perfil form simplification** — confirmed this session that every field beyond the profile row's existence is currently unused (was likely meant as an AI-generation context payload). Left as-is per the user's explicit choice to preserve it for potential future AI use; revisit only if that changes.

## Constraints that still apply

- No AI plan generation yet (`src/ai/provider.ts` has zero imports anywhere in the app — this is still fully off).
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
