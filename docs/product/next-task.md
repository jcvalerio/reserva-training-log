# Next Task

## Status: a single standard back-navigation pattern across the whole app — shipped, deployed and committed (`9c2c550`). No task in progress.

User feedback with concrete examples (template detail has a back link, but `/plan/templates`, `/plan/historial`, `/plan/builder`, session editor, and `/mediciones` didn't). Audited all 17 routes before touching anything and found three different back-navigation treatments already coexisting (a top text link, a bottom button, and nothing at all) — consolidated onto one: `AppShell` gained a required `backTo: { href, label } | null` prop, rendered once, consistently, at the top of every page. See the 2026-08-02 implementation-log entries for the full route-by-route mapping and why the prop is required rather than optional (TypeScript then forces every one of the 29 call sites to make a real decision). Verified live against the real active account (read-only) across 4 pages spanning every category of the fix.

## Prior status: "Readaptación" template shipped — deployed and committed (`344237a`).

Transcribed a 4-week return-to-training infographic into `src/plans/readaptation-plan.ts`: 5 days (Lun-Vie), one "ejercicio estrella" per day that progresses in load while the rest complement the work, plus a Wednesday active-recovery day (cardio/mobility/core, no lifting). See the 2026-08-02 implementation-log entries for the adaptation calls (no RIR in the source → 2/3 split by star status, the 4-week %-progression folded into ongoing guidance, a probable Viernes/Jueves star-label slip in the source, timed holds modeled as duration-type). Verified live (read-only preview) using the same temporary-bypass-then-revert pattern this project has used before to view template previews while a plan is active — the account's real active plan (leg-priority, from the previous entry) was untouched throughout, confirmed via `git diff` on the bypassed files after reverting.

The account still has the leg-priority plan active — activating this new template instead (which would replace it) is the user's call, not done as part of shipping this.

## Prior status: leg-priority template + measurement-based unilateral side default shipped — deployed and committed (`2469330`).

Two pieces shipped together: a third plan template ("Hipertrofia con prioridad en piernas," transcribed from a user-supplied PDF — 5-day, all-machine, unilateral-leg-priority protocol) added to `/plan/templates`, and a real bug fix found while reviewing that template against the user's actual measurements — the session-runner's unilateral side-selector always defaulted to Izquierda regardless of which leg is actually thinner. `determineSmallerSide` (`measurement-schema.ts`) now derives the correct default from the profile's latest measurement, falling back to left when there's no measurement data. See the 2026-08-02 implementation-log entries for full detail, including why the user's shared measurement data (a raw SQL INSERT, for context) was never actually written to the real DB — this was verified against their exact real numbers in tests, not end-to-end against a live account. The user has since activated this template for real, so the account now has a real active plan (was zero plans post-reset before that).

## Status: the account's real plans/sessions/measurements were reset for real (the "Zona de peligro" feature from `7de478e` was actually used) — confirmed via a direct DB query showing zero `workout_plan` rows. No further action needed here.

## Prior status: pecho/caderas shipped — deployed and committed (`0305f98`).

User feedback: mediciones was missing chest and hips. Added both as single circumference values (like `waistCm`, not left/right-paired like thigh/calf/arm) end to end — form, storage, historial display, and a `/progreso` trend line — following the exact pattern `waistCm` already used. Migration `drizzle/0015_moaning_warbird.sql` applied. See the 2026-08-02 implementation-log entries for full detail, including the deliberate choice not to extend the `/progreso` chart's Peso/Cintura toggle to a 4-way toggle (bigger scope than asked).

Same-day follow-up: body measurements are now excluded from the wipe by default (a checkbox, checked by default, lets you opt into deleting them too) — plans/sessions are training-experiment data, but weight/measurement history is real physical tracking that shouldn't be forced out just because you're resetting your training setup.

**One decision still pending, the user's to make**: whether to actually click through the real confirmation on their real account (it would delete their real 2 plans / 11 sessions — measurements kept by default unless unchecked — confirmed live, not executed).

## Status: competitor UX benchmark shipped — deployed and committed (`a66474a`) alongside plan sharing + "Tus planes" history.

The most recent completed work: a Principal-Product-Designer competitive UX benchmark (`docs/product/competitor-ux-benchmark-kickoff-prompt.md`) against MyFitCoach/Hevy/Strong, covering only the two flows this app already does — routine definition and session recording, explicitly not a new-feature hunt. Grounded in real screenshots of the current app before researching competitors; presented a prioritized shortlist via `AskUserQuestion`, confirmed item-by-item, then built the 6 confirmed items:

- **Session recording** (`session-runner.tsx`): a rest timer that auto-starts after each logged set (using the previously-unused `restSeconds` field), a trimmed weight-input default (no more "40.00"), a previous-performance reference that now tracks whichever set you're on (matched by position/side) for the whole exercise instead of vanishing after set 1, and ± stepper buttons beside weight/reps for one-thumb adjustment.
- **Routine definition** (`session-editor-form.tsx`): typing a known exercise name now prefills sets/reps/RIR/rest from that name's most recent prescription elsewhere in your history (skips silently for unknown names or an unchanged name, so it never clobbers an existing row), plus ↑/↓ buttons to reorder exercise rows within a session.
- **Deferred, not built**: the exercise-name `<datalist>` autocomplete's iOS Safari reliability — needs a real on-device check before deciding whether to replace it with a custom filtered list. A plate-math calculator and superset/circuit grouping were flagged as genuinely structural (schema/data-model changes), not small — explicitly not proposed this pass.

See the 2026-08-02 implementation-log entry for full detail, including a real active-plan → draft state change discovered mid-session (confirmed by the user as their own concurrent edit, not something this work caused or needed to fix).

Next: verify the datalist autocomplete on a real iPhone, then decide on that deferred item.

## Prior completed work

Three same-day pieces from 2026-08-01:

1. **Plan sharing** — send an independent, editable copy of your active plan to another account via a single-use, email-bound link, so nobody has to retype a shared routine (and risk the typos/order-mismatches that would silently break progression continuity). Kicked off as an explicit Principal-Engineer-plus-Principal-Designer planning pass (user asked to "be critic... a possible plan is don't do it") before any code — see the 2026-08-01 "Plan sharing" implementation-log entry for the full reasoning: reused this codebase's existing copy-on-write precedent (`cloneWorkoutPlanToDraft`) instead of building live cross-account data sharing, added forward-looking (but currently unused) `sharePlanGroupId`/`lineageKey` schema fields so a *future* cross-account comparison feature (explicitly out of scope this pass, and explicitly scoped to training performance only — never pain or body measurements, if/when built) won't have to reconstruct history. Verified thoroughly given this is a new cross-account, auth-gated data path: a throwaway (written-run-deleted, never committed) vitest file exercised the full repository surface against the real dev DB with a real-but-fake second account, confirmed clean afterward.
2. **"Tus planes" history list** (`/plan/historial`) — evaluated against real data before building (found an archived plan with 4 real logged sessions that was completely invisible in the UI, plus a stray draft), then built a read-only list of every plan a profile has ever had, sorted active → draft → archived/completed. Deliberately scoped out reactivating/deleting archived plans as a separate future decision.
3. **Per-plan detail view** (`/plan/historial/[planId]`) — the user confirmed the stray draft was real (their own "Duplicar como borrador" tap) and asked to see it discarded plus richer detail/stats for archived plans. Discarded the draft through the app's real UI, not a DB delete. Added a detail page reusing the exact same preview pipeline `/plan/rutina` already uses (`getPlanPreviewSummary` + `PlanDayPager`), so legacy multi-week plan data collapses to its real day count here too, plus session-count/first-last-session stats.

Migration `drizzle/0014_flowery_stone_men.sql` applied to dev DB (additive only, covers plan sharing's 2 columns + 1 table; neither history feature needed a schema change). `lint`/`typecheck`/`test` (265 passing)/`build` all green; all three verified live via Playwright against the real dev DB. The real account now has exactly 2 plans (1 active, 1 archived) — the stray draft is gone.

Shipped alongside the competitor UX benchmark work above — see the 2026-08-02 "Deployed and committed" implementation-log entry.

## Up next

The deferred `/progreso` training-load/pain-trend charts are still explicit candidates once real RPE/pain data exists in the account. A future plan-comparison feature is a real candidate once the sharing flow above has actually been used for real (not before) — the schema groundwork is already in place. The deferred datalist-autocomplete item from the competitor UX benchmark (see Status above) needs a real-iPhone check next time the user is on-device.

**The product is not an "AI personal trainer."** Plans are created manually — a small template catalog or a custom day-by-day builder — with no AI generation anywhere in the app. The core loop is: build a plan once, then log every set (weight, reps, RIR, pain) each session, and get RIR-based progression suggestions from that real history. This was a deliberate framing correction made 2026-07-31 (see the implementation log entry of that date) — don't reintroduce "AI"/"generate a plan" language without the user asking for it back.

Everything below is complete, deployed to production, and verified (either by the user directly or against real dev-DB data): the custom plan builder (Phase A/B), all 4 phases of the exercise-model redesign (edit/duplicate plans, `sideMode`→`isUnilateral`, `incrementCategory`→`loadMechanism`×`isCompound`, duration-type exercises), a segundos/minutos toggle for duration inputs, a fix for the session-editor FK-violation crash on plans with logged history, a fix allowing a completed `/entrenar` day to be restarted (plan repeats indefinitely — no week concept), a two-choice "Usar una plantilla / Crear mi propio plan" start fork replacing the auto-expanded seeded plan, a real plan-template catalog (hypertrophy + a fat-loss A/B circuit plan), removal of the "Pesos base" feature and simplification of the pre-plan readiness gate to just "profile exists," a pass surfacing five computed-but-hidden values on `/entrenar`/`/progreso` (set notes, progression risk flag, avg weight/reps deltas, session duration, exercise count per day), a body-measurement trend card on `/progreso`, surfacing the plan/session narrative fields (`notesEs`/`mobilityNotesEs`/`safetySummaryEs`) everywhere a plan is previewed or trained, all 6 of `docs/product/progression-rules.md`'s "5% improvement" signals, a full rewrite of `docs/architecture/data-model.md` against the real schema, session-level notes + RPE (Borg CR10 scale) with a resulting training-load trend on `/progreso`, removing all "AI Personal Trainer" framing from the README/app copy/planning docs (plus the orphaned `src/ai/provider.ts` and its now-unused dependencies), and a base set of `/progreso` charts/KPIs (weekly consistency, per-exercise weight/volume progression with a left/right split and an effort-gap chart for unilateral exercises, body-measurement series) built as hand-rolled inline SVG.

Read `docs/product/implementation-log.md` (newest entries first) for full detail on any of the above before touching related code — it's the source of truth for design decisions and known gaps, not this file.

## Other next-phase candidates (unranked)

1. **Real-device validation of the full accumulated flow in one sitting** (profile → template or custom plan → `/entrenar` across a full rotation including a restart → `/progreso`) — round 1's changes have been confirmed on a real iPhone; round 2's haven't yet (deploy first — see Status above). Worth walking the full flow in one sitting rather than spot-checking individual screens, especially the sticky-button removal and the Home state fix, both classes of bug that were only visible in real rendering, not source.
2. **Perfil form simplification** — confirmed every field beyond the profile row's existence is currently unused (was likely meant as an AI-generation context payload, back when AI generation was the plan). Left as-is per the user's explicit choice to preserve it in case that ever changes; revisit only if asked.

## Constraints that still apply

- No AI plan generation — plans are manual only (template catalog + builder). Not a gap to fill; it's the actual product direction now.
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
