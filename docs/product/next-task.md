# Next Task

## Status: mobile UI/UX audit (round 1) deployed, committed, and confirmed working well on a real iPhone by the user. No task in progress.

The most recent completed work: a mobile UI/UX audit against real Playwright screenshots at an iPhone viewport, logged in as the real user. Root-caused the button-contrast complaint to a genuine CSS cascade-layer bug (not a design inconsistency — see the 2026-07-31 "Mobile UI/UX audit" implementation-log entries), trimmed `/plan`'s long scroll into a summary (`/plan`) + full-detail (`/plan/rutina`, paginated by day) split, moved Mediciones out of the bottom nav into a Perfil link, de-emphasized Editar/Duplicar to text links, and fixed the confirmed `grid-cols-7`-for-6-items nav bug. Full detail in the implementation log. Deployed via `npx vercel deploy --prod --yes` (see `docs/architecture/release-workflow.md`'s "How deploys actually happen today" section for the exact steps and gotchas) — live at `https://gym.jcvalerio.com`, and the user has verified it on their actual iPhone.

## Up next: mobile expert critical assessment (round 2)

The user wants a fresh session to do an open-ended critical assessment of the app's mobile UI/UX, going broader than round 1's specific complaints. A full kickoff prompt is saved at `docs/product/mobile-expert-critique-prompt.md` — hand that whole file to a new session to start it. It points out specific areas worth a close look (template preview's still-collapsible day pattern, `/plan/builder`, `/perfil`, `/mediciones`, cross-screen consistency, accessibility, empty/error states) but is explicitly meant to be open-ended, not a fixed checklist.

**The product is not an "AI personal trainer."** Plans are created manually — a small template catalog or a custom day-by-day builder — with no AI generation anywhere in the app. The core loop is: build a plan once, then log every set (weight, reps, RIR, pain) each session, and get RIR-based progression suggestions from that real history. This was a deliberate framing correction made 2026-07-31 (see the implementation log entry of that date) — don't reintroduce "AI"/"generate a plan" language without the user asking for it back.

Everything below is complete, deployed to production, and verified (either by the user directly or against real dev-DB data): the custom plan builder (Phase A/B), all 4 phases of the exercise-model redesign (edit/duplicate plans, `sideMode`→`isUnilateral`, `incrementCategory`→`loadMechanism`×`isCompound`, duration-type exercises), a segundos/minutos toggle for duration inputs, a fix for the session-editor FK-violation crash on plans with logged history, a fix allowing a completed `/entrenar` day to be restarted (plan repeats indefinitely — no week concept), a two-choice "Usar una plantilla / Crear mi propio plan" start fork replacing the auto-expanded seeded plan, a real plan-template catalog (hypertrophy + a fat-loss A/B circuit plan), removal of the "Pesos base" feature and simplification of the pre-plan readiness gate to just "profile exists," a pass surfacing five computed-but-hidden values on `/entrenar`/`/progreso` (set notes, progression risk flag, avg weight/reps deltas, session duration, exercise count per day), a body-measurement trend card on `/progreso`, surfacing the plan/session narrative fields (`notesEs`/`mobilityNotesEs`/`safetySummaryEs`) everywhere a plan is previewed or trained, all 6 of `docs/product/progression-rules.md`'s "5% improvement" signals, a full rewrite of `docs/architecture/data-model.md` against the real schema, session-level notes + RPE (Borg CR10 scale) with a resulting training-load trend on `/progreso`, and removing all "AI Personal Trainer" framing from the README/app copy/planning docs (plus the orphaned `src/ai/provider.ts` and its now-unused dependencies).

Read `docs/product/implementation-log.md` (newest entries first) for full detail on any of the above before touching related code — it's the source of truth for design decisions and known gaps, not this file.

## Other next-phase candidates (unranked)

1. **Real-device validation of the full accumulated flow in one sitting** (profile → template or custom plan → `/entrenar` across a full rotation including a restart → `/progreso`) — the round-1 mobile UI/UX changes specifically have been confirmed on a real iPhone, but this broader end-to-end flow hasn't been walked in one sitting since before this session's changes piled up.
2. **Perfil form simplification** — confirmed every field beyond the profile row's existence is currently unused (was likely meant as an AI-generation context payload, back when AI generation was the plan). Left as-is per the user's explicit choice to preserve it in case that ever changes; revisit only if asked.

## Constraints that still apply

- No AI plan generation — plans are manual only (template catalog + builder). Not a gap to fill; it's the actual product direction now.
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
