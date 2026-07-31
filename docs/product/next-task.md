# Next Task

## Status: exercise-model redesign, onboarding audit, entrenar/progreso value work, and an AI-branding removal pass all done and deployed. No task in progress.

**The product is not an "AI personal trainer."** Plans are created manually — a small template catalog or a custom day-by-day builder — with no AI generation anywhere in the app. The core loop is: build a plan once, then log every set (weight, reps, RIR, pain) each session, and get RIR-based progression suggestions from that real history. This was a deliberate framing correction made 2026-07-31 (see the implementation log entry of that date) — don't reintroduce "AI"/"generate a plan" language without the user asking for it back.

Everything below is complete, deployed to production, and verified (either by the user directly or against real dev-DB data): the custom plan builder (Phase A/B), all 4 phases of the exercise-model redesign (edit/duplicate plans, `sideMode`→`isUnilateral`, `incrementCategory`→`loadMechanism`×`isCompound`, duration-type exercises), a segundos/minutos toggle for duration inputs, a fix for the session-editor FK-violation crash on plans with logged history, a fix allowing a completed `/entrenar` day to be restarted (plan repeats indefinitely — no week concept), a two-choice "Usar una plantilla / Crear mi propio plan" start fork replacing the auto-expanded seeded plan, a real plan-template catalog (hypertrophy + a fat-loss A/B circuit plan), removal of the "Pesos base" feature and simplification of the pre-plan readiness gate to just "profile exists," a pass surfacing five computed-but-hidden values on `/entrenar`/`/progreso` (set notes, progression risk flag, avg weight/reps deltas, session duration, exercise count per day), a body-measurement trend card on `/progreso`, surfacing the plan/session narrative fields (`notesEs`/`mobilityNotesEs`/`safetySummaryEs`) everywhere a plan is previewed or trained, all 6 of `docs/product/progression-rules.md`'s "5% improvement" signals, a full rewrite of `docs/architecture/data-model.md` against the real schema, session-level notes + RPE (Borg CR10 scale) with a resulting training-load trend on `/progreso`, and removing all "AI Personal Trainer" framing from the README/app copy/planning docs (plus the orphaned `src/ai/provider.ts` and its now-unused dependencies).

Read `docs/product/implementation-log.md` (newest entries first) for full detail on any of the above before touching related code — it's the source of truth for design decisions and known gaps, not this file.

## Up next: UI/UX mobile audit

The user wants a fresh session to challenge the mobile UI/UX specifically. A full kickoff prompt for that is saved at `docs/product/ux-mobile-audit-prompt.md` — hand that whole file to a new session to start it. Rough scope: `/plan`'s long-scroll active-plan+routine+exercises layout, inconsistent button text-color contrast (white-on-green vs. black-on-green), whether nav icons/emoji would help, and whether `/mediciones` should move under `/perfil` instead of being a top-level nav item.

## Other next-phase candidates (unranked)

1. **Real-device validation** of the full accumulated flow in one sitting (profile → template or custom plan → `/entrenar` across a full rotation including a restart → `/progreso`) — hasn't been done end-to-end on an actual phone since before this session's changes piled up.
2. **Perfil form simplification** — confirmed every field beyond the profile row's existence is currently unused (was likely meant as an AI-generation context payload, back when AI generation was the plan). Left as-is per the user's explicit choice to preserve it in case that ever changes; revisit only if asked.

## Constraints that still apply

- No AI plan generation — plans are manual only (template catalog + builder). Not a gap to fill; it's the actual product direction now.
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
