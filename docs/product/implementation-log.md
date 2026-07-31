# Implementation Log

Living checkpoint for small iterations. Update this after every task iteration so the project can be paused and resumed with context.

## 2026-07-31 — Deployed and committed the round-2 mobile UX audit

Status: shipped. Committed as `64ad0be` on `main` ("fix: round-2 mobile UX audit — Home stale state, sticky-button overlap, builder gaps, a11y"), then deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, HTTP 200 verified, no migration involved since this round had no schema changes).

Next iteration: a real-device pass on an actual iPhone — this round's changes (especially the Home state fix and the sticky-button removal) haven't been confirmed on-device yet, only via Playwright's emulated viewport. See `docs/product/next-task.md`.

## 2026-07-31 — Round-2 mobile UX audit: fixed all 8 findings

Status: code complete, `lint`/`typecheck`/`test` (195 passing)/`build` all green. No schema/migration involved. Not yet deployed as of this entry. Every fix verified live via Playwright at an iPhone viewport (390×844) against the real dev DB, logged in as the real user — same standard as round 1.

Kicked off from a fresh, independent critical assessment (not just re-checking round 1's fixes) covering the whole app: `/`, `/perfil`, `/mediciones`, `/plan`, `/plan/rutina`, `/plan/templates`, `/plan/templates/[id]`, `/plan/builder` + session editor, `/entrenar`, a mid-session and a completed-session view, and `/progreso`, plus a systematic accessibility pass (contrast, tap targets) and empty/error states. Two real, confirmed bugs surfaced beyond round 1's scope, both found by checking computed styles/DOM geometry rather than trusting source appearance — the same lesson round 1's button-contrast bug taught. All 8 findings were fixed:

1. **Home (`/`) showed stale "choose your plan" onboarding on every visit, even with a real active plan.** `src/app/page.tsx` never checked for an active plan — `src/onboarding/readiness.ts`'s `M1ReadinessInput` gained `hasActivePlan: boolean`; the "plan" step now reports `complete`/"Activo" with a "Ir a Entrenar" primary action when a plan is active, instead of perpetually "Elige tu plan". `src/app/home-shell.tsx` also trims the first-time marketing pitch (heading/description/"Logging obligatorio" pills) for returning users with an active plan, replacing it with a short "Bienvenido de vuelta" — the same "don't repeat onboarding copy on a page you open constantly" fix round 1 applied to `/plan`. `src/app/plan/page.tsx`'s own `getM1Readiness` call also needed the new field (it already had `activePlan` fetched, just wasn't passing it through).
2. **A sticky "Guardar" button on `/perfil` and `/mediciones` covered form fields and blocked taps on them — confirmed with measured DOM rects and `elementFromPoint` hit-testing, not a screenshot artifact.** The `.sticky-submit` CSS (`position: sticky`, `globals.css`) froze at a fixed viewport position almost immediately on scroll and stayed frozen for nearly the entire form, so whatever field scrolled into that band was visually covered and untappable underneath. A scroll sweep on `/perfil` found a different field overlapped at nearly every 100px scroll increment. Fixed by dropping the `sticky-submit` class from both usages (reverting to a plain end-of-form button, the pattern already used everywhere else in the app — builder, session editor) and deleting the now-dead CSS rule.
3. **`/plan/builder`: no way to discard a draft plan.** `createDraftPlan` enforces "one draft at a time" by returning the existing draft — but no action existed to delete a whole draft, only individual day sessions (`deleteDraftSession`). A user who started a custom plan and changed their mind had no way back to a fresh start screen. Added `discardDraftPlan` (`plan-builder-repository.ts`, scoped to `status = 'draft'` so it can never touch an active/archived plan) + `discardDraftPlanAction` + a "Descartar borrador" button on `/plan/builder`.
4. **`/plan/builder`: exercise names are free text with no continuity guard, and progression history is keyed by exact string match.** `workout-repository.ts` matches `exercisePrescription.exerciseNameEs` by exact equality — retyping a name slightly differently on edit silently orphans that exercise's logged history from future suggestions. Added `getKnownExerciseNamesForProfile` (distinct names across all of a profile's plans, any status) and wired it into `session-editor-form.tsx` as a `<datalist>` autocomplete on the exercise-name input — nudges consistency without restricting free text. Verified live: 28 real previously-used exercise names populated the datalist from the real user's plan history.
5. **Template preview (`/plan/templates/[id]`) switched from per-day collapsible accordions to the same day-pagination pattern `/plan/rutina` already shipped in round 1.** Re-evaluated round 1's original reasoning (accordion pattern suits "review everything before committing") per the user's request and concluded it didn't hold up: genuinely reviewing every day means expanding every accordion, which grows the page unboundedly — worse than day-pagination, which bounds scroll to one day regardless of review depth. Extracted the day-pill-nav + single-day-detail + Anterior/Siguiente widget out of `plan-detail-content.tsx` into a new shared `src/app/plan/plan-day-pager.tsx` (`PlanDayPager`), used by both `PlanDetailContent` and `TemplatePreviewContent`. The now-fully-unused `PlanSessionsList` (the old collapsible-list component) was deleted rather than left as dead code.
6. **`/perfil` was a flat, ungrouped 12-field form.** Added three light section headers ("Datos básicos" / "Entrenamiento" / "Contexto adicional") with a divider between groups — pure presentational change, no fields added/removed/reordered.
7. **Weight display showed meaningless trailing zeros** (`40.00kg` in the session runner and progression suggestions, `10.0kg` for `/progreso` averages) — three genuinely different precision levels already existed for good reasons (0dp volume, 1dp averages/1RM, 2dp a single logged set), the bug was whole numbers still showing decimals. Added `formatKg(value, maxDecimals)` to a new `src/lib/format.ts` (rounds then trims trailing zeros/the decimal point) and applied it at the actual display call sites: `session-runner.tsx`'s `LoggedSetRow` and progression-suggestion text, and `progreso-page-content.tsx`'s `ImprovementCard` (Volumen/Peso prom/1RM estimado/Asimetría). Deliberately left `set-log-schema.ts`'s `.toFixed(2)` untouched (that's DB numeric-column serialization, not a display concern) and left the body-measurement trend card's kg/cm lines untouched (mixes units, wasn't part of the confirmed finding). Caught and fixed a real JSX whitespace bug introduced along the way: moving `kg` from a literal text node into the expression's return value collapsed a space that JSX had been implicitly preserving across the old `{expr}kg\n· text` line break (`{expr}` immediately followed by a newline-led text node drops the whitespace entirely, unlike two adjacent text lines which get joined with a single space) — fixed with an explicit `{" "}`.
8. **Accessibility**: `text-zinc-500` measured 4.35:1 against the app's near-black background (canvas-based computed-color contrast calculation, not estimated) — just under WCAG AA's 4.5:1 for normal text, used app-wide for eyebrow labels and timestamps. Swept all 14 non-exempt files (`text-zinc-500` → `text-zinc-400`, now measuring ~7.6:1) — excluded the two legitimate uses in `auth-buttons.tsx` and `mobile-bottom-nav.tsx`, both `disabled:`-state text color, which WCAG explicitly exempts from contrast requirements. Also bumped three sub-44px tap targets to 44px while preserving their de-emphasized visual style: `/plan`'s "Editar mi plan"/"Duplicar como borrador" (32px → 44px) and `/progreso`'s "Ver mediciones" (16px → 44px), via `inline-flex min-h-11 items-center` instead of relying on padding alone.

Two small copy bugs fixed early and separately from the 8 numbered findings (both in `src/app/plan/builder/builder-page-content.tsx`): a header said "al menos un ejercicio" while the real minimum is 3 (`MIN_SESSION_EXERCISES`), and "1 ejercicios" was missing its singular form.

All temporary/throwaway data created during verification (a test draft plan for the discard-action check, a second draft for the autocomplete check) was cleaned up immediately after each check — confirmed via `git diff`/live screenshots that the real active plan ("JuanK", 15 exercises, activated 30-jul) and its logged history were untouched throughout. The `/plan/templates/[id]` active-plan-redirect gate was temporarily bypassed in source (commented out, not a DB change) to screenshot the day-pager fix, then immediately reverted — confirmed clean via `git diff`.

Files touched: `src/onboarding/readiness.ts` (+test), `src/app/page.tsx`, `src/app/home-shell.tsx`, `src/app/plan/page.tsx`, `src/app/globals.css`, `src/app/perfil/page.tsx`, `src/app/mediciones/page.tsx`, `src/plans/plan-builder-repository.ts`, `src/app/plan/builder/actions.ts`, `src/app/plan/builder/page.tsx`, `src/app/plan/builder/builder-page-content.tsx` (+test), `src/app/plan/builder/session/[dayIndex]/page.tsx`, `src/app/plan/builder/session/[dayIndex]/session-editor-form.tsx` (+test), `src/app/plan/plan-day-pager.tsx` (new), `src/app/plan/rutina/plan-detail-content.tsx`, `src/app/plan/plan-page-content.tsx`, `src/app/plan/templates/[templateId]/template-preview-content.tsx`, `src/lib/format.ts` (new, +test), `src/app/entrenar/[sessionId]/session-runner.tsx` (+test), `src/app/progreso/progreso-page-content.tsx` (+test), plus the 12-file `text-zinc-400` contrast sweep (`src/plans/plan-gate.test.ts` also updated for the `hasActivePlan` field).

Next iteration: deploy, then a real-device pass on an actual iPhone (the round-1 changes were confirmed on-device; this round's changes — especially the Home state fix and the sticky-button removal — haven't been, and the sticky-button bug specifically was the kind of thing only visible in real, non-emulated rendering).

## 2026-07-31 — Deployed and committed the mobile UI/UX audit

Status: shipped. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, HTTP 200 verified, migration step ran with zero diff since this was a UI-only change), then committed locally as `79abc58` on `main` ("fix: mobile UI/UX audit — button-contrast bug, /plan scroll, nav cleanup").

Two things worth recording for future sessions, now written up in `docs/architecture/release-workflow.md`'s new "How deploys actually happen today" section:
- **This repo currently has no git remote** (`git remote -v` is empty) — deploys go straight from the local working directory via the Vercel CLI, not through git push/PR/Vercel's git integration. The `.github/workflows/ci.yml` and the branching model documented further down `release-workflow.md` are the intended future state, not current practice.
- **`vercel` must be run via `npx vercel`**, not a bare `vercel` command, after `nvm use v24.18.0` — the Vercel CLI binary on this machine is installed under nvm's v22.11.0, so the bare command isn't on `PATH` once you've switched to v24.18.0 for the project's own Node requirement.
- Left `next-env.d.ts` and `.playwright-mcp/` out of the commit — the former is Next's own auto-generated file that flips between dev/build modes and isn't a real change; the latter is this session's Playwright MCP scratch output (snapshots/console logs), not project code.

Next iteration: the real-device pass on an actual iPhone flagged in every entry below — still the one open item before this audit is fully closed out.

## 2026-07-31 — Mobile UI/UX audit: root-caused the button contrast bug, trimmed /plan, moved Mediciones under Perfil

Status: code complete, `lint`/`typecheck`/`test` (188 passing)/`build` all green. No schema/migration involved. Not yet deployed as of this entry — verified against the real dev DB (Juan Carlos's actual active plan and logged history) via Playwright at an iPhone viewport (390×844), logged in as the real user through the real Google OAuth flow (no bypass, no seeded test session).

Kicked off from `docs/product/ux-mobile-audit-prompt.md`. Took real screenshots before proposing anything, which changed the diagnosis on two of the flagged items:

- **Button contrast — root cause, not a design inconsistency.** The user's read ("some buttons white-on-green, others black-on-green") looked wrong from a source grep (every `bg-emerald-300` button consistently specified `text-zinc-950`). The real screenshots proved the user right anyway: `globals.css` had `a { color: inherit; text-decoration: none; }` declared *outside* any `@layer`, while Tailwind v4's `@import "tailwindcss"` puts all its utilities inside `@layer` blocks. Per the CSS cascade-layer spec, unlayered rules always win over layered ones regardless of specificity — so every primary CTA built as a Next.js `<Link>` (renders `<a>`) silently lost its `text-zinc-950` to the inherited white body text, while CTAs built with `SubmitButton` (a real `<button>`, unaffected by the `a` selector) rendered correctly. Confirmed via `getComputedStyle` before/after (color went from `lab(98.26 0 0)` (white) to `lab(2.5 ...)` (near-black) on the same element) — not just a visual impression. Fix: wrapped the rule in `@layer base` in `src/app/globals.css`. One line, fixes every affected button app-wide instead of patching individual spots. (Needed a full dev-server restart to take effect — Turbopack didn't hot-reload the `@layer` wrapping change.)
- **`/plan` long-scroll — confirmed, plus a real bug found along the way.** Even a light 3-exercises/day custom plan produced a ~3300px-tall page. Worse: the pre-plan "Estado seguro" gate card and "Checklist pre-plan" section (with a `Plan: "Elige tu plan"` checklist item) kept rendering *above* the active-plan summary even once a plan was active — stale onboarding copy telling the user to go pick a plan they'd already picked. Fixed per the user's confirmed choice (asked via `AskUserQuestion` since this is a structural nav change, per this project's "ask before large pivots" convention): `/plan` now hides the gate/checklist entirely once `hasActivePlan`, and `ActivePlanSummary` shows a compact `PlanSessionsOverview` (day name/focus/badges, no nested exercise detail) instead of the full `PlanSessionsList`, with a "Ver plan completo" link to a new `/plan/rutina` route that renders the full day-by-day exercise breakdown (reusing the existing `PlanSessionsList` component unchanged). Brought the summary page down to ~2180px even before accounting for the exercise-detail removal; the reduction is much larger on the fat-loss template's 15-18-exercises/day sessions, which no longer expand inline at all. `/plan/templates/[templateId]` (the pre-activation preview) deliberately keeps full inline detail — that's a "review everything before committing" screen, a different use case from `/plan`'s "ongoing reference for an already-active plan."
- **Mediciones moved from the bottom nav into Perfil.** Its own copy already says "cada 2 semanas, no cada sesión" — a fundamentally different cadence from Plan/Entrenar/Progreso (used every session). Nav dropped from 6 items to 5 (`src/app/home-nav.ts`, `mobile-bottom-nav.tsx` grid updated to `grid-cols-5`); `/mediciones` itself is untouched and still fully reachable via a new link card on `/perfil` and via `/progreso`'s existing "Ver mediciones" link. Updated the two Perfil copy lines that said "...desde la navegación inferior" (now stale) to "...aquí abajo."
- **Confirmed nav bug fixed**: `mobile-bottom-nav.tsx` had `grid-cols-7` for 6 items (stale from before "Pesos base" was removed from the nav) — now `grid-cols-5` (5 items after the Mediciones move made the count change twice in one session).
- **Nav icons/emoji — evaluated, declined.** User agreed with the recommendation to skip: the app has zero icon system today, and emoji risked clashing with the existing minimal zinc/emerald aesthetic. Text-only labels kept; the Mediciones move gives the remaining 5 tabs more breathing room than they had at 6.
- **Session-runner: moved "Completar entrenamiento" below the exercise flow.** It previously sat directly under the header, above the first exercise — a stray tap there before logging any set would end the session early with no confirmation. Now it renders after the Anterior/Siguiente-ejercicio navigation, alongside the collapsed "¿Cómo te sentiste?" section, so it's no longer the first tappable element on the page.

Files touched: `src/app/globals.css`, `src/app/mobile-bottom-nav.tsx` (+ test), `src/app/home-nav.ts` (+ test), `src/app/perfil/page.tsx`, `src/app/plan/plan-page-content.tsx` (+ test), `src/app/plan/rutina/page.tsx` + `plan-detail-content.tsx` (+ test, new route), `src/app/entrenar/[sessionId]/session-runner.tsx`.

Not done from the original audit prompt's scope, deliberately: didn't touch `/plan/templates/[templateId]` or `/plan/builder`'s layout (templates preview's full-detail pattern was judged correct as-is; builder wasn't flagged as broken by the real screenshots, just theoretically similar — no evidence-based reason to change it).

Next iteration: deploy, then a real-device pass on an actual iPhone (not just Playwright's emulated viewport) to confirm the button-contrast fix and the trimmed `/plan` read correctly under real font smoothing/brightness — the original complaint was itself only visible on-device, not from source, so the fix deserves the same standard of verification.

## 2026-07-31 — Second pass on /plan after seeing it live: cut remaining filler, paginate the detail page by day

Status: code complete, `lint`/`typecheck`/`test` (190 passing)/`build` all green. Not yet deployed.

Immediately after the audit above shipped code (still pre-deploy), the user checked the trimmed `/plan` and asked for more: the "Este es tu plan real, guardado y activo..." orientation paragraph, the "Logging futuro por serie" field-name pills, and the "Tu rutina" day-list preview all read as filler now that they'd seen the page live. Agreed with all three — that copy/pill block made sense on a first-time page, not a page you open every week. Also proposed replacing per-day tap-to-expand (`<details>`) on `/plan/rutina` with something that scrolls less, floating a raw left/right swipe gesture between days.

Pushed back on swipe-only navigation specifically: iOS Safari's edge-swipe-from-left is its own "go back" gesture and can conflict with a custom left-swipe, and there's no touch-gesture library in this project — meaningful effort/risk for a reference screen. Recommended instead reusing the exact tap-based prev/next pattern `/entrenar`'s session-runner already has proven out, plus tappable day-number pills to jump directly. Confirmed with the user via `AskUserQuestion` (offered swipe-on-top and single-long-page as alternatives) — went with the recommendation.

Implemented:
- `ActivePlanSummary` (`plan-page-content.tsx`): removed the orientation paragraph and the "Logging futuro por serie" pills block entirely; removed the "Tu rutina" day-list preview and replaced it with a single standalone "Ver plan completo" link. (The field-name pills stay on the template-preview screens, where showing what you'll be asked to log is still a real pre-commit decision input, not filler.)
- Extracted `PlanExerciseCard` (exported) out of `PlanSessionsList`'s inline exercise-mapping JSX, so both the still-collapsible `PlanSessionsList` (used by template preview, unchanged) and the new always-expanded detail page can render the same exercise-card markup without duplicating it. Also exported `formatDurationSeconds`.
- `plan-detail-content.tsx` rewritten as a client component (`"use client"`, mirroring `session-runner.tsx`'s pattern): `useState` for the selected day index, a horizontally-scrollable row of "Día N" pills (`role="tab"`/`aria-selected`) to jump directly, Anterior/Siguiente día buttons at the bottom (same button styling as the session-runner's exercise-nav pair for visual consistency), and the selected day's exercises rendered fully expanded via `PlanExerciseCard` — no `<details>`/tap-to-expand step, since this page's entire purpose is now "show me everything for a day."
- Result: `/plan` went from ~3300px (original) to a page that nearly fits one screen; `/plan/rutina` bounds its scroll to one day's exercises regardless of how many days or exercises-per-day the plan has (matters most for the fat-loss template's 15-18 exercises/day).

Next iteration: same as above — deploy, then a real-device pass on an actual iPhone.

## 2026-07-31 — De-emphasized Editar/Duplicar on /plan to text links

Status: code complete, `lint`/`typecheck`/`test` (190 passing)/`build` all green. Not yet deployed.

User asked whether "Editar mi plan"/"Duplicar como borrador" should move into `/plan/rutina`. Pushed back: they're whole-plan actions (edit opens the builder for every day, duplicate clones the entire plan), while `/plan/rutina` is now specifically a one-day-at-a-time browsing view — putting a whole-plan edit action on a page scoped to "Día 3" risks implying it only edits that day, and `/plan` is already the natural plan-management surface. Offered de-emphasizing them in place instead; user agreed.

`ActivePlanSummary` (`plan-page-content.tsx`): the two `SubmitButton`s went from full-width `rounded-2xl` button blocks (`grid-cols-2` row) to small underlined text links inline with a `·` separator, sitting quietly below "Ver plan completo" (which keeps its full button treatment as the actual primary action here).

Next iteration: same as above — deploy, then a real-device pass on an actual iPhone.

## 2026-07-31 — Removed "AI Personal Trainer" framing; app is manual plan + RIR progression tracking

Status: code complete, `lint`/`typecheck`/`test` (187 passing)/`build` all green. No schema/migration involved.

User's call: AI generation was never built and isn't the roadmap ("we are not doing something related") — the real product is manual plan creation (templates + a custom builder) plus RIR-based progression tracking from logged sets. Asked to remove the AI branding and reinforce that framing everywhere.

- **README.md**: title/description rewritten around the real mechanism (build a plan manually, log every set, get RIR-based suggestions), explicitly states "No AI generation."
- **In-app copy**: every "IA"/"Entrenador Personal IA"/"no-IA" reference removed from `layout.tsx` (page title), `home-shell.tsx` (heading, "Preparación M1" → "Preparación," a few stale sub-lines), `readiness.ts`/`plan-gate.ts` (the pre-plan gate's labels/descriptions — also fixed real staleness found along the way, e.g. "no genera, guarda ni activa un plan" was flatly false once `/plan/builder` and `/plan/templates` shipped), `perfil/page.tsx`, `plan-page-content.tsx` (dropped the pointless "IA: Apagada" status tile and "Sin IA" badge; fixed another stale claim — "todavía no... registra series" — from before `/entrenar` existed), `entrenar-page-content.tsx`, `template-preview-content.tsx`/`plan-preview.ts` (the preview badges said "No activable," which was false — that screen's own button does activate the plan for real; replaced with `["Solo lectura", "Aún no activado"]`).
- **`src/ai/provider.ts` deleted** — zero imports anywhere (confirmed during the earlier onboarding audit). Its only dependencies, `@ai-sdk/google` and `ai`, removed from `package.json`; `GOOGLE_GENERATIVE_AI_API_KEY`/`_MODEL` removed from `src/env.ts` and `.env.example`.
- **Planning docs** (`milestones.md`, `mvp-plan.md`, `docs/specs/generated-plan-contract.md`, `docs/architecture/technical-stack.md`, `docs/specs/first-features.md`, `docs/product/open-questions.md`): added accuracy status notes rather than full rewrites — these are historical planning records, so the original AI-generation design intent is kept, but each now says clearly it was never pursued and points to what shipped instead. `milestones.md`'s M3 marked "Not pursued," M2 updated to reflect the Pesos base removal, M5 updated from "4 of 6 signals" to all 6 (matches the earlier 1RM/asymmetry work). `mvp-plan.md`'s MVP loop rewritten to the real current flow (template-or-builder, not "generate a 4-week plan").

Next iteration: none queued here — see the separate UI/UX mobile-audit kickoff prompt (`docs/product/ux-mobile-audit-prompt.md`) for what's next.

## 2026-07-31 — Session notes + RPE, and a training-load trend on /progreso

Status: code complete, `lint`/`typecheck`/`test` (187 passing)/`build` all green. Migration `drizzle/0013_eminent_betty_brant.sql` (single nullable column, additive) generated and applied to dev DB; confirmed via `information_schema.columns`.

Fixes the real gap found while rewriting `data-model.md`: `workoutSession.notes` existed but was never wired to any UI. While scoping that fix, evaluated whether to also add session-level RPE (user's suggestion, the Borg CR10-style "how did it feel?" scale) — recommended building it since it's a genuinely different axis from per-set RIR (RIR = effort relative to failure on one lift; RPE = systemic fatigue across the whole session) and pairs directly with the session-duration data already surfaced on `/progreso`. Confirmed scope with the user before adding a new column.

Implemented:
- `src/db/schema.ts`: `workoutSession.sessionRpe` (nullable integer, 1-10). No backfill needed (nullable, additive).
- `src/training/rpe.ts`: the 10-point scale + Spanish labels (Extremadamente ligero → Esfuerzo máximo), mirroring `training/rir.ts`'s existing pattern.
- `src/workouts/session-completion-schema.ts`: Zod parsing for the complete-session form (both fields optional — same low-friction philosophy as per-set notes).
- `completeWorkoutSession`/`completeSessionAction`: now accept and persist `{ notes, sessionRpe }`.
- `session-runner.tsx`: the "Completar entrenamiento" form gained a collapsed-by-default `<details>` section ("¿Cómo te sentiste? (opcional)") with an RPE select and a notes textarea — collapsed so it doesn't clutter the page for someone who just wants to tap the button, but present. `CompletedSessionSummary` now shows both back once the session is done — the actual "read back" step, not just another write-only field.
- `src/workouts/session-load.ts`: `computeSessionTrainingLoad` (RPE × duration in minutes — Foster's session-RPE method, a real, established autoregulation metric) and `averageRecentTrainingLoad` (last 5 sessions, skipping ones with no RPE rather than averaging them in as zero). Both cheap to compute since duration was already available from an earlier pass.
- `progreso-page-content.tsx`: each session in the history list shows its training load (when computable) next to date/duration, plus a "Carga promedio (últimas sesiones)" summary line — only rendered when at least one recent session has one, so it doesn't appear as a confusing "0 UA" for users who never fill in RPE.

Next iteration: none queued. This closes out the `WorkoutSession.notes` gap found during the data-model rewrite; no further candidates flagged in `docs/product/next-task.md` beyond the real-device pass and the deferred Perfil simplification.

## 2026-07-31 — Rewrote docs/architecture/data-model.md against the real schema

Status: complete. Documentation-only change — no code, no schema, no migration, nothing to deploy.

The doc had drifted badly: it was still describing the pre-MVP conceptual design from before most of this project was actually built, not the real `src/db/schema.ts`. Concretely wrong or fictional: `ExercisePrescription.exerciseId`/`sideMode`/`targetWeightKg` (none exist — real columns are free-text `exerciseNameEs`, boolean `isUnilateral`, no target weight at all), `ExerciseLog.exerciseId`/`sideMode`/`notes` (the real table has none of these — it's a lean 5-column join record), `SetLog.plannedWeightKg`/`plannedRepsMin`/`plannedRepsMax` (never existed — planned values are read from `ExercisePrescription`, never duplicated per set), a whole `ProgressionSuggestion` table (never built — suggestions are computed live by `src/training/progression.ts` on every render, nothing persisted), `WorkoutPlan.durationWeeks` described as "default 4" (vestigial, always 1 — the plan repeats indefinitely, no fixed week model), and `/baseline` described as an active, in-use flow (removed entirely earlier today).

Rewrote every section against the actual current schema, and — matching this session's running theme of tracing real usage instead of guessing — explicitly called out which tables/fields are live vs. orphaned rather than silently correcting the field lists:
- `Exercise` and `BaselineLift` tables: still in the DB (left in place when "Pesos base" was removed, a deliberate reversible choice), but zero application code touches them now.
- `AthleteProfile`, `Limitation`, `MusclePriority`: every field beyond existence/the row itself is write-only, per the onboarding audit finding from earlier this session — noted here rather than presented as if fully wired up.
- `WorkoutSession.notes`: found during the rewrite — this one's a genuine, non-deliberate gap (never wired to any UI at all, unlike the deliberately-orphaned baseline tables). Added to `docs/product/next-task.md` as a small candidate.

Next iteration: none queued from this pass. See `docs/product/next-task.md` for the remaining candidates (real-device validation, Perfil simplification, the newly-found `WorkoutSession.notes` gap).


## 2026-07-31 — Estimated 1RM + asymmetry-improvement signals on /progreso

Status: code complete, `lint`/`typecheck`/`test` (172 passing)/`build` all green. `db:generate` confirms zero schema diff.

Closes out `docs/product/progression-rules.md`'s "5% improvement definition" — all 6 signals are now implemented (previously 4/6, the remaining 2 were explicitly deferred pending a methodology choice, not silently skipped). Confirmed both choices with the user via `AskUserQuestion` before implementing, per that deferral's own note:

- **1RM formula**: RIR-adjusted Epley — `1RM = weight × (1 + (actualReps + rir) / 30)`, treating RIR as reps-in-the-tank toward failure. Chosen over raw-reps Epley because most sets in this app target RIR 2, not failure, and the rest of the progression engine already reasons in RIR terms.
- **Asymmetry scope**: both variants, per the doc's "left/right measurement **or** performance gap" wording.

Implemented:
- `src/workouts/improvement.ts`: two new `ImprovementSignal`s. `estimated_1rm` — takes the best (highest-estimate) set per instance, excluding sets over 15 reps (Epley reliability ceiling), and only fires when the two instances' rep counts are within 5 of each other ("compatible rep ranges" — instances derived from very different rep counts carry very different estimation error and shouldn't be compared). `asymmetry_performance` — for unilateral exercises only, compares left-vs-right volume-load gap between instances; fires when the gap shrinks ≥5% *and* pain doesn't increase (spec's exact wording, a different pain gate shape than the other signals). `computeExerciseImprovement` gained an `isUnilateral` parameter.
- `src/workouts/workout-repository.ts`: `getRecentExerciseInstancesByName` now also selects `isUnilateral` so `buildExerciseImprovements` can pass it through.
- `src/measurements/measurement-trend.ts`: added `thighGapImproved`/`calfGapImproved` — a *separate* comparison window from the existing "Tendencia corporal" card's oldest-vs-latest deltas. Per the doc, improvement signals compare latest vs. the *immediately preceding* measurement, not first-ever vs. latest, so this reuses `calculateMeasurementGaps` but on `measurements[0]` vs `measurements[1]` specifically. No pain gate here — `bodyMeasurement` has no pain field.
- `src/app/progreso/progreso-page-content.tsx`: new signal badges ("1RM estimado +5%", "Asimetría -5%"), 1RM and asymmetry-gap value lines on `ImprovementCard` (shown only when the underlying values are non-null, i.e. only for eligible sets/unilateral exercises), and a "(mejoró vs. la anterior)" inline note on the body-trend card's gap line when `thighGapImproved`/`calfGapImproved` is true.

Two of my own test fixtures initially landed exactly on a floating-point-sensitive 5% boundary (`112 * 1.05` vs `84 * 1.4` not comparing exactly equal due to binary floating-point rounding) — caught by the test run, not a production bug; fixed by moving the fixtures comfortably off the boundary rather than chasing exact floating-point equality.

Next iteration: none queued. `docs/product/next-task.md`'s remaining candidates are `data-model.md` cleanup, a real-device pass, and (optionally) Perfil form simplification.

## 2026-07-31 — Body measurement trend on /progreso + surfaced plan/session narrative fields

Status: code complete, `lint`/`typecheck`/`test` (160 passing)/`build` all green. `db:generate` confirms zero schema diff.

Picked up two of the "good next-phase candidates" from the previous entry's audit — both additive, no removals.

**Body measurement trend (`/progreso`)**: new `src/measurements/measurement-trend.ts` (`buildBodyMeasurementTrend`) compares the oldest vs. newest of the last 24 `/mediciones` entries — body weight delta, waist delta, and the latest thigh/calf asymmetry gap (reusing `calculateMeasurementGaps`, already used by `/mediciones` itself). Wired into `progreso/page.tsx` and rendered as a new "Tendencia corporal" card above "Mejoras recientes," with a link back to `/mediciones` for the full history. Deltas are shown neutrally (no green/red value judgment) since direction of "good" depends on the user's goal, which isn't tracked meaningfully anywhere (see the Perfil finding from the onboarding audit). A single-measurement state shows a distinct "guarda otra para ver una tendencia" message instead of a meaningless zero delta.

**Plan/session narrative fields**: `notesEs` (exercise), `mobilityNotesEs` (session), `safetySummaryEs` (plan) were captured everywhere but rendered nowhere — flagged in two earlier entries (the fat-loss template's authoring pass, and the entrenar/progreso value audit). Fixed at the source: `plan-preview.ts`'s three summary types (`PlanPreviewExerciseSummary`/`PlanPreviewSessionSummary`/`PlanPreviewSummary`) gained these fields, populated in `getPlanPreviewSummary`/`getSessionPreviewSummary`. That flows into every consumer for free:
- `PlanSessionsList` (shared between `/plan`'s active-plan summary and `/plan/templates/[templateId]`'s preview): exercise notes now always show (previously only a pain-sensitive substitution line existed), and each session card gets its mobility-notes line.
- `ActivePlanSummary` and `TemplatePreviewContent`: both now show `safetySummaryEs` prominently — this is where the fat-loss template's progression guidance (technique-first → +2.5-5kg → shorter rest → +1 round) actually becomes visible for the first time.
- `session-runner.tsx` (`/entrenar`, live training): the exercise's `notesEs` and the session's `mobilityNotesEs` now show as coaching cues while actually training — arguably the highest-value spot for this content, since it's real-time rather than pre-activation review.

No schema or repository changes for the narrative-fields half — every value was already flowing through existing queries.

Next iteration: none queued. See the "next-phase candidates" list in `docs/product/next-task.md` for what's left (1RM/asymmetry signals, `data-model.md` cleanup, a real-device pass).

## 2026-07-31 — Surfaced five computed-but-hidden values on /entrenar and /progreso

Status: code complete, `lint`/`typecheck`/`test` (150 passing)/`build` all green.

Follow-up to the onboarding value audit — evaluated `/entrenar` and `/progreso` the same way (trace usage, don't guess). Unlike onboarding, these are the app's real value loop, so nothing warranted removal — instead found values that were already computed (cheap) but never reached the screen:

- **Per-set notes**: turned out these weren't actually dead — `suggestProgression`'s `hasNegativeNote` check already keyword-matches set notes ("dolor/molestia/técnica/inestable/...") to downgrade a suggestion to "hold, revisar técnica." The note text itself was just never shown back, so that reasoning was invisible. Now shown under every `LoggedSetRow` (active exercise, "Última vez" card, completed-session summary — one shared component, one fix).
- **Progression risk flag** (`pain`/`fatigue`/`technique`/`none`): only the plain-language reason text showed; now a small badge next to the suggestion when it's not `none`.
- **`/progreso` improvement cards**: `latestAvgWeightKg`/`previousAvgWeightKg`/`latestAvgReps`/`previousAvgReps` were already computed internally for the reps/load signals but never displayed — added a line under the volume/pain summary.
- **Session duration**: `completedAt - startedAt` was available but unused — added to `/progreso`'s history list next to the date.
- **Exercise count per day**: `EntrenarSessionItem.exerciseCount` was computed by `buildEntrenarSessions` but never rendered — added to both the "Sugerido para hoy" card and each day's list row on `/entrenar`.

No schema or repository changes — every value here was already flowing through existing queries; this was purely a "show it" pass.

## 2026-07-31 — Removed "Pesos base" (baseline lifts), simplified the pre-plan gate to profile-only

Status: code complete, `lint`/`typecheck`/`test` (149 passing)/`build` all green. `db:generate` confirms zero schema diff — DB tables (`baseline_lift`, `exercise`) are left in place, unused but intact; nothing destructive, fully reversible via git if needed.

User asked to evaluate every feature for whether it's actually adding value, using "Pesos base" as the example (filled it in, but it didn't seem to do anything). Traced every field's actual usage across the codebase rather than guessing:
- **Pesos base**: only ever read as `count > 0` for the M1 readiness gate. Gets fully overwritten on every save (not even a history log, unlike Mediciones). Never feeds a weight suggestion, plan, or session anywhere. Zero downstream value — removed entirely.
- **Mediciones**: same gate-only pattern for its *count*, but the page itself computes real thigh/calf asymmetry gaps and keeps full history — genuine standalone value, especially relevant to the new fat-loss template. Kept the feature, removed it from the gate.
- **Perfil**: turned out to go much further than the original ask — literally every field except the row's mere existence (sex, birth year, training age/frequency, target days/week, session duration, goals, progression aggressiveness, locale, timezone, gym context, pain areas, muscle priorities, even `name`) is write-only, read nowhere outside the profile form itself. Reads like the intended context payload for AI plan generation, which was never wired in (`src/ai/provider.ts` has zero imports anywhere in the app). Asked the user how far to take this via `AskUserQuestion`: keep the form's fields as-is (possible future AI use) and just stop requiring anything beyond the profile existing — confirmed. No Perfil fields were removed this pass.

Implemented:
- `src/onboarding/readiness.ts`: `M1ReadinessInput` now just `{ hasProfile: boolean }`; `foundationReady = hasProfile`. Steps array reduced from 4 (profile/baseline/measurements/plan) to 2 (profile/plan). `getPrimaryAction` lost its now-unreachable baseline/measurements branches.
- `src/plans/plan-gate.ts`, `src/app/home-shell.tsx`, `src/app/perfil/page.tsx`, `src/app/plan/plan-page-content.tsx`: updated copy that referenced "perfil, pesos base y mediciones" as the foundation.
- Every `getM1Readiness` caller (`/`, `/plan`, `/plan/actions.ts`, `/plan/templates`, `/plan/templates/[templateId]`) simplified — dropped the now-pointless baseline/measurement fetches used only to compute a count for the gate. A couple of these callers' own `foundationReady` checks became unreachable dead code (they run after an earlier `if (!profile) redirect(...)` guard, so `hasProfile` is always true by that point) and were removed too.
- Deleted `src/baseline/` and `src/app/baseline/` entirely (repository, schema, page, form, actions, tests) and removed "Pesos base" from the bottom nav (`home-nav.ts`).

Next iteration: deploy, then verify `/plan` and the home screen read correctly with just "Perfil" as the foundation step, and that a profile-only user can reach the template picker and builder without ever having filled in baseline weights.


## 2026-07-31 — Two-choice plan start fork + second template (fat-loss A/B circuit)

Status: code complete, `lint`/`typecheck`/`test` (155 passing)/`build` all green. `db:generate` confirms zero schema diff (the `goal` widening is Zod-only — the DB column is plain `text`, not a Postgres enum). Not yet deployed as of this entry.

User feedback: the seeded hypertrophy plan auto-appeared as a big pre-expanded "Vista previa" card with "Activar este plan" front and center on `/plan`, with "Crear mi propio plan" as a smaller link underneath — implying the seeded plan *is* the plan and custom is an afterthought, which was confusing. Asked for a neutral two-choice fork instead, and offered a second source plan (image: an 8-week, 5-day/week fat-loss circuit alternating "Rutina A"/"Rutina B") to build out an actual template catalog rather than a single hardcoded plan.

Design decisions made along the way, confirmed with the user via `AskUserQuestion` where genuinely ambiguous:
- Rutina A/B become **one** new template (5 days, day1/3/5=A day2/4=B, matching the source's own weekly suggestion LUN:A MAR:B MIÉ:A JUE:B VIE:A) — not two separate templates. They share one objective, one progression scheme, and only make sense together.
- The source's "8 semanas" framing and week-numbered progression (sem1-2 learn technique, sem3-4 +load, sem5-6 shorter rest, sem7-8 +1 round) contradicts this app's indefinite-repeat model (the same thing Phase A already deliberately moved away from, and the same confusion behind the previous "no way to define how many weeks" bug fix). Adapted to ongoing, readiness-based guidance instead of week-indexed milestones — folded into `safetySummaryEs` since nothing else in the UI is better suited.
- The schema has no superset/circuit-grouping concept — each of the source's blocks (Calentamiento, Fuerza principal, Bloque 1, Bloque 2, Acondicionamiento, Cardio opcional) becomes its own set of independent `exercisePrescription` rows, with the block name prefixed onto `exerciseNameEs` (e.g. "Bloque 1 · KB swing") — the only place in the current UI where this grouping is guaranteed to actually be visible (plan preview and `/entrenar` both show the exercise name; neither surfaces `notesEs`, `mobilityNotesEs`, or `safetySummaryEs` today, a pre-existing gap worth revisiting separately).
- This pushed a real session to ~18 distinct exercises (each block's movements are separate rows), busting the existing `MAX_SESSION_EXERCISES = 10` cap — raised to 20; nothing else in the codebase assumed that ceiling.
- `goal` widened from `z.literal("hypertrophy")` to `z.enum(["hypertrophy", "fat_loss"])` in `generated-plan-schema.ts` — the only other usage sites (`profile-schema.ts`'s unrelated `primaryGoal`, the DB `text` column) were unaffected.
- Movements without a clean sets×reps or seconds fit (calorie-target bike sprints, a 500m row, a farmer's carry) went to `prescriptionType: "duration"` with the target explained in `notesEs`, reusing Phase 4's duration-exercise support rather than forcing a rep count onto them.

Implemented:
- `src/plans/fat-loss-plan.ts`: `createFatLossPlan()`, authored with small `strengthEx`/`durationEx` factories (block label → phase mapping, pain-sensitivity heuristic) rather than a flat tuple list like `seeded-plan.ts`, given the volume (36 exercises across both routines).
- `src/plans/plan-templates.ts`: new catalog (`planTemplates`, `getPlanTemplateById`, `isPlanTemplateId`) listing both templates by id/name/objective/description/`build()`.
- `src/plans/plan-repository.ts`: `activateSeededPlanForProfile` now takes a `templateId` and looks it up via the catalog instead of hardcoding `createSeededHypertrophyPlan()`.
- `src/app/plan/actions.ts`: `activatePlanAction` now reads `templateId` from FormData and validates it via `isPlanTemplateId` before activating.
- `src/app/plan/plan-page-content.tsx`: replaced the auto-expanded `SeededPlanPreview` with a neutral `StartPlanFork` (two equal-weight links: "Usar una plantilla" → `/plan/templates`, "Crear mi propio plan" → `/plan/builder`, same as before). Exported `PlanSessionsList`/`StatusTile` for reuse by the new template-preview page instead of duplicating that fairly substantial rendering.
- New routes: `/plan/templates` (list, gated on foundation-ready + no active plan) and `/plan/templates/[templateId]` (full preview + activate form, same gating plus a valid-id check) — both follow this app's existing page.tsx/page-content.tsx split for testability.

Next iteration:
- Deploy, then manually verify: the fork shows neither option pre-expanded, browsing to each template renders the full preview correctly (including the ~18-exercise fat-loss sessions and the block-prefixed exercise names), activating the fat-loss template works end-to-end through a real `/entrenar` session (duration-type exercises log correctly, block-prefixed names look sane in the training UI), and the existing hypertrophy-template path still works unchanged.
- Worth a separate look eventually: `notesEs`, `mobilityNotesEs`, and `safetySummaryEs` are all required, written-to fields that no UI currently displays — the fat-loss template's progression guidance is invisible until that's fixed.

## 2026-07-30 — Fix: no way to start a session again once every day showed "completed"

Status: fixed, `lint`/`typecheck`/`test` (145 passing)/`build` all green.

User hit this after finishing a full pass through all 5 days and asked "how do I define how many weeks the plan is" — the real issue wasn't missing week-count config, it's that the plan is designed to repeat indefinitely (Phase A deliberately removed the fixed-week model; `session-progress.ts`'s `getSuggestedTemplateId` already picks whichever day was trained longest ago, cycling forever with no explicit week bookkeeping — see its doc comment). The backend was already correct. The bug was purely in `entrenar-page-content.tsx`'s `SessionAction`: a `"completed"` status only ever rendered a "Ver resumen" link, with no way to start a new session for that day — including in the emphasized "Sugerido para hoy" card, so once every day had at least one completed session, there was no start action anywhere on the page.

Fix: a completed session's action now renders both an "Empezar de nuevo" button (submits the same `startOrResumeSessionAction`; `startOrResumeWorkoutSession` already creates a fresh `active` `workoutSession` row whenever there's no existing active one for that template, so no repository change was needed) and a smaller "Ver resumen" link to the last summary underneath it.

No "define how many weeks" feature was added — that would contradict the indefinite-repeat model this app deliberately moved to. Worth revisiting only if the user still wants explicit week/cycle tracking after understanding this is by design.

## 2026-07-30 — Fix: session editor save crashed once a session had logged history; React controlled-input warning

Status: fixed, `lint`/`typecheck`/`test` (144 passing)/`build` all green. Fix verified directly against real dev data (see below) before deploying.

Two bugs surfaced by the user testing "Editar mi plan" against the real active-turned-draft plan, immediately after the duration-toggle deploy:

1. **React warning "changing an uncontrolled input to be controlled"** when switching a row's "Tipo de ejercicio" between fuerza/duración in `session-editor-form.tsx`. Root cause: the two conditional branches (`isDuration ? <div>...duration fields...</div> : <div>...strength fields...</div>`) are both plain `div`s at the same JSX position, so React reconciles their children *by index* instead of unmounting/remounting the subtree — the "Duración" input (controlled, `value=`) and "Reps mín." input (uncontrolled, `defaultValue=`) landed at the same child slot and got treated as the same DOM node with a flip-flopping `value` prop. Fixed by giving each branch's wrapper `div` a distinct `key` ("duration-fields" / "strength-fields"), forcing React to treat them as genuinely different elements.

2. **500 on save: `update or delete on table "exercise_prescription" violates RESTRICT setting of foreign key constraint` on `exercise_log`.** `saveDraftSession` (`plan-builder-repository.ts`) used a delete-all-then-reinsert "replace-all" pattern for a session's `exercisePrescription` rows, mirrored from `saveBaselineLiftsForProfile`. That pattern silently assumed a session's exercise rows never have dependents — true for baseline lifts, false here: `exerciseLog.exercisePrescriptionId` references `exercisePrescription.id` with `onDelete: "restrict"` (deliberate, so historical logs never dangle). The moment a plan is edited via "Editar mi plan" (Phase 1) after any set has been logged against it, saving the session tries to delete a still-referenced row and Postgres rejects it — this is exactly the scenario Phase 1 exists for, so it broke the primary use case, not an edge case. Reproduced against the user's real dev-DB template (`5ad9a6aa-...`, all 3 exercises had logged sets) before fixing.
   - Fix: `saveDraftSession` now updates existing `exercisePrescription` rows **in place by position** (same row id, new field values) instead of delete+insert. Only inserts rows beyond the previous count (session grew) and only deletes rows beyond the new count (session shrank) — and that trailing delete is wrapped in a try/catch that raises a clear Spanish message naming the exercise(s) if a to-be-removed row still has logged sets, instead of letting the raw Postgres/Drizzle error surface as an unhandled 500.
   - Verified directly against the dev DB with a throwaway script calling `saveDraftSession` against the real template with 3 logged-against exercises, unchanged data (the user's exact "just refresh and press save" repro): succeeded, same row ids preserved, zero orphaned `exercise_log` rows afterward.
   - Known residual gap, intentionally not solved here: this action isn't wired through `useActionState`, so the friendly error message still surfaces via Next's generic error boundary rather than inline in the form — acceptable for how rare the shrink-a-logged-exercise case is, but worth revisiting if it comes up again.

## 2026-07-30 — Duration input UX: segundos/minutos toggle

Status: code complete, `lint`/`typecheck`/`test` (144 passing)/`build` all green locally. Deployed to production.

User feedback right after Phase 4 shipped: entering a 10-minute cardio warmup as "600 segundos" is bad UX (and a 30-second mobility hold as "0.5 minutos" would be equally bad the other way) — asked for a unit toggle instead of a single fixed unit.

Implemented: new shared pure-function module `src/training/duration.ts` (`secondsToDurationInput`, `convertDurationValue`, `durationInputToSeconds` — mirrors the existing `training/rir.ts` pattern for small cross-form training-domain helpers) with its own test file. `durationSeconds`/`actualDurationSeconds` are still stored and submitted in seconds on the wire — no schema or Zod change — only the input widget changed:
- `session-editor-form.tsx` (builder): the "Duración (segundos)" field became a "Duración" number input + "Unidad" (Segundos/Minutos) select, with a hidden `${prefix}:durationSeconds` field carrying the converted value. Switching units converts the displayed number (e.g. 5 min → 300s → back to 5 min), rather than resetting it.
- `session-runner.tsx` (`/entrenar` logging): extracted a `DurationSetInput` subcomponent with the same toggle, relying on the existing `key={exercise.id:setNumber}` on the parent `<form>` to reset the subcomponent's local state on every new set/exercise (no extra reset code needed).
- Smart default: `secondsToDurationInput` shows minutes when the stored value is an exact multiple of 60 (typical for cardio warmups), seconds otherwise (typical for holds) — so a freshly-created duration row (60s default) initially shows "1 minuto", and prefilled values pick whichever unit round-trips cleanly.

Next iteration: manual verification of the full Phase 4 flow (see entry below) still pending — this UX fix landed before that verification happened, so both should be checked together.

## 2026-07-30 — Exercise model redesign: Phase 4 complete, deployed

Status: code complete, `lint`/`typecheck`/`test` (134 passing)/`build` all green locally. Migration `drizzle/0012_hesitant_marauders.sql` generated cleanly in one step (the `prescriptionType` column uses a DB-level `DEFAULT 'strength'`, so no backfill was needed — every existing row is unambiguously strength-type). Deployed to production; manual verification pending (see the duration-input UX entry above for a same-day follow-up shipped before that verification happened).

Implemented (Phase 4 of 4, per `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md`, the final phase of this redesign):
- `src/db/schema.ts`: new `exercisePrescriptionTypeEnum` (`strength | duration`). `exercisePrescription` gains `prescriptionType` (NOT NULL, default `strength`) and nullable `durationSeconds`; `targetRepMin`/`targetRepMax`/`targetRir` made nullable. `setLog` gains nullable `actualDurationSeconds`; `actualWeightKg`/`actualReps`/`rir` made nullable.
- Three separate Zod discriminated unions on `prescriptionType` (`generated-plan-schema.ts`, `plan-builder-schema.ts`, `set-log-schema.ts`), each with a `.refine()` for the repMin≤repMax check that only applies to the strength branch.
- `workout-repository.ts`: `PreviousExercisePerformance`/`SaveSetInput` are now discriminated unions; added `toStrengthSetLog()` helper (throws rather than silently defaulting nulls to 0) used by `improvement.ts` and `progression-view.ts`; `getRecentExerciseInstancesByName` now filters `prescriptionType = 'strength'` — the safety boundary keeping duration-type sets out of improvement/progression math entirely, at the query level rather than patched into individual helpers (the plan's stress-test pass had flagged a vacuous-true bug in the pain-signal gate if this were only patched downstream).
- `session-runner.tsx`: duration-type exercises get a single "Duración real (segundos)" input instead of weight/reps/RIR, and no progression suggestion (previous-performance display is strength-only).
- `session-editor-form.tsx`: new "Tipo de ejercicio" select (the one genuinely controlled field in an otherwise uncontrolled form, since it drives conditional rendering) toggling between strength fields and duration fields (rondas + segundos).
- `plan-repository.ts`/`plan-builder-repository.ts`: discriminated-union-aware branching when writing DB rows from the flat generated/input types; flat pass-through confirmed safe (via `tsx` smoke test) when reading DB rows back into the Zod schemas.
- `seeded-plan.ts`: added explicit `prescriptionType: "strength"` to all 20 exercises (this was wrongly marked "no changes required" in the plan — wrong, because `.parse()` now requires the discriminant literal even though every seeded exercise stays strength-type).
- Test fixtures updated across all touched files; two `toEqual()` assertions (`plan-builder-schema.test.ts`, `set-log-schema.test.ts`) were silently stale on the missing `prescriptionType` key until caught by `npm run test` — same class of issue flagged in the Phase 3 entry below.

Next iteration:
- Deploy (migration runs automatically via `vercel.json`'s build command), then manually verify per the plan's checklist: add a duration-type warmup exercise to the real active plan via "Editar mi plan," log a session against it in `/entrenar` confirming no weight/RIR fields appear and duration logs correctly, confirm `/progreso` shows no nonsensical signal for it, confirm a mixed strength+duration plan still activates and renders on `/plan`.
- This closes out the full exercise-model redesign once verified.

## 2026-07-30 — Exercise model redesign: Phase 3 complete, deployed, verified

Status: completed. Deployed and manually verified by the user: the new "Mecanismo de carga"/"Tipo de movimiento" fields work correctly in the builder, and a reclassified exercise's suggested weight in `/entrenar` reflects the new matrix as expected. Phase 3 is fully closed out.

Correction found and fixed during implementation, before this was ever deployed: it claimed `isCompound=false` (isolation) "routes to the same 'add a rep' suggestion regardless of `loadMechanism`'s value." That was wrong as first implemented — `suggestNextWeightKg`/`isRepsFirstIncrease` checked `isCompound === false` *before* checking `loadMechanism === "dumbbell"`, so a dumbbell+isolation exercise (e.g. a dumbbell lateral raise) would have incorrectly gotten a "add a rep" suggestion instead of the fixed +2kg step. Caught by a test written against the plan's own stated priority (dumbbell always wins, isCompound is "irrelevant to that branch") failing against the actual implementation. Fixed by reordering both functions to check `loadMechanism === "dumbbell"` first. No real-world impact — the seeded plan and the user's current data have no dumbbell+isolation exercises — but worth flagging since it means step A's "zero behavioral impact either way" reasoning was itself resting on a bug that's now fixed.

Implemented (Phase 3 step B of 4, cutover + cleanup):
- `src/workouts/progression-view.ts`: replaced `IncrementCategory`/`INCREASE_RATIO_BY_CATEGORY` with `LoadMechanism`/`INCREASE_RATIO_BY_MECHANISM`. New suggestion matrix in `suggestNextWeightKg`/`isRepsFirstIncrease`, in priority order: `dumbbell` → fixed +2kg regardless of `isCompound`; else `bodyweight` or `isCompound === false` → unchanged weight (reps-first); else `machine`+compound → +5%, `barbell`+compound → +2.5%; else (unclassified) → flat ±5% fallback.
- `src/db/schema.ts`: dropped `incrementCategory`/`exerciseIncrementCategoryEnum` entirely. `drizzle/0011_foamy_brother_voodoo.sql`: `DROP COLUMN` + `DROP TYPE`, verified against dev DB (`information_schema.columns` confirms `increment_category` gone, `load_mechanism`/`is_compound` present).
- App-code cutover across the same file list as Phase 2's pattern: `generated-plan-schema.ts`, `plan-builder-schema.ts` (new `loadMechanism` select + `isCompound` tri-state select — `Sin especificar` / `Compuesto` / `Aislamiento`, since a checkbox can't represent "unclassified"), `plan-repository.ts`, `plan-builder-repository.ts`, `seeded-plan.ts` (all 20 exercises reclassified using the exact same mapping as the migration's backfill — `machine_or_lower_body`→`(machine, true)`, `upper_compound`→`(barbell, true)`, `dumbbell`→`(dumbbell, true)`, `isolation`→`(machine, false)`), the builder session page, `session-runner.tsx`.
- `session-editor-form.tsx`: replaced the single "Categoría de incremento" dropdown with two selects (mecanismo de carga / tipo de movimiento) plus an inline explanation sentence directly addressing the user's original confusion — this field doesn't classify the exercise, it only drives the weight-suggestion math.
- Fixtures updated in every touched test file. Two were silently testing stale behavior (`toEqual` comparisons where the expected object's `incrementCategory` key just didn't match the new output shape) rather than failing to compile — `plan-builder-schema.test.ts` was actually asserting on the wrong resulting object until this pass caught it via `npm run test`, not `typecheck` (a reminder that schema-shape changes need a full test run, not just a clean typecheck, to catch stale runtime assertions on loosely-typed FormData-parsing tests).

Next iteration:
- Phase 4 (duration-based exercises — the largest, riskiest phase, touches the live `set_log` history table, deliberately sequenced last, and the final phase of this redesign).

## 2026-07-30 — Exercise model redesign: Phase 3 step A complete (loadMechanism/isCompound added, additive only)

Status: code complete, `lint`/`typecheck`/`test` (131 passing)/`build` all green. Migration generated and its logic verified; not yet deployed to production as of this entry.

Implemented (Phase 3 step A of 4, per `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md`):
- `src/db/schema.ts`: added `exerciseLoadMechanismEnum` (`bodyweight | dumbbell | machine | barbell`) and two new nullable columns on `exercisePrescription` — `loadMechanism` and `isCompound`. `incrementCategory` stays in place, untouched by app code — this step is purely additive, no behavior change.
- `drizzle/0010_steady_eternals.sql`: `CREATE TYPE` + two `ADD COLUMN` (drizzle-kit generated) followed by a hand-inserted `UPDATE...CASE` backfill (`machine_or_lower_body`→`machine`/`true`, `upper_compound`→`barbell`/`true`, `dumbbell`→`dumbbell`/`true`, `isolation`→`machine`/`false`, `NULL`→`NULL`/`NULL`), matching the plan file's mapping exactly.
- Verification approach adapted from the plan: the dev DB turned out to have **zero** non-null `increment_category` rows (95 rows, all null — the dev DB's data is the user's own custom-built plan, which defaults every exercise's category to "Sin especificar" unless explicitly set; the seeded plan's classified exercises were never actually present there), so there was nothing real to backfill-diff against. Verified the `CASE` mapping logic directly instead — ran it as a read-only `SELECT ... FROM unnest(enum_range(NULL::exercise_increment_category))`, touching no table data, confirming all 4 possible category values map exactly per the plan's table. Given this, and that `isCompound=false` (the isolation case, the one with any real judgment call) routes to the same "add a rep" suggestion regardless of `loadMechanism`'s value in the new suggestion matrix, the residual risk flagged in the plan (a user-edited dumbbell-isolation row defaulting to `machine`) has zero behavioral impact even in the worst case — proceeding without a separate prod spot-check.
- Test fixtures in `session-runner.test.tsx`, `plan-repository.test.ts`, `session-progress.test.ts` updated with the new nullable fields (TypeScript now requires them on any full `ExercisePrescription`-shaped object literal, even though no app logic reads them yet).

Next iteration:
- Deploy step A, confirm the build's `db:migrate` succeeds against production (additive-only, no app behavior changes to verify manually).
- Then Phase 3 step B: cut the app over to read/write `loadMechanism`/`isCompound` everywhere `incrementCategory` was used, then drop the old column/enum in the same migration.

## 2026-07-30 — Exercise model redesign: Phase 2 complete, deployed; found and fixed a real unilateral set-counting bug

Status: completed. Deployed and manually verified by the user: `/plan` and `/entrenar` both work correctly against the real active plan post-migration.

Bug found during that verification, unrelated to the sideMode migration itself but surfaced by testing a unilateral exercise afterward: a unilateral exercise's `targetSets` was being checked against the *total* logged sets across both sides combined (`session-runner.tsx`), not per side — so "3 sets" completed after any 3 sets regardless of left/right split (e.g. left/right/left), never actually asking for 3 on each side. This was pre-existing behavior, not something the sideMode→isUnilateral change introduced (confirmed: the old sideMode-based code had the identical bug, just never surfaced because the user hadn't tested a unilateral exercise until now). Fixed and deployed same day:
- `session-runner.tsx`: exercise completion now requires `targetSets` on *each* side independently for unilateral exercises (`leftCount >= targetSets && rightCount >= targetSets`), not `loggedSets.length >= targetSets`. The side radio for whichever side already hit its target is now disabled, so the alternating left/right flow can't be broken by manually re-selecting the completed side. Target display now shows "por lado" for unilateral exercises to make the per-side expectation explicit.
- Found and fixed the same bug class one layer deeper: `progression-view.ts`'s `buildProgressionSuggestion` used the same `sets.length >= targetSets` check to decide `allPlannedSetsCompleted` (which gates the "Sube carga" suggestion) — a lopsided previous session (e.g. 3 sets all on one side) could incorrectly read as "all sets completed" and suggest increasing load. Added an `isUnilateral` parameter and threaded `isUnilateral` through `PreviousExercisePerformance` (`workout-repository.ts`) so this check is side-aware too.
- New tests cover both the exact reported scenario (3 total sets, uneven split, exercise must not read as complete) and the fixed progression-suggestion path. No DB migration needed — pure app logic. `lint`/`typecheck`/`test` (131 passing)/`build` all green.
- User re-verified: unilateral exercises now correctly ask for the full per-side set count in `/entrenar`. Phase 2, including this bugfix, is fully closed out.

Implemented (Phase 2 of 4, per `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md`):
- `src/db/schema.ts`: dropped `exerciseSideModeEnum`/`sideMode` (bilateral | unilateral_separate | unilateral_matched), replaced with `isUnilateral boolean NOT NULL`. Shipped as two migration files rather than one, for a mechanical reason discovered while running `db:generate`, not a change to the plan's risk posture: `drizzle-kit generate` needs a way to resolve a brand-new `NOT NULL` column against existing rows, so a single generate call from "has sideMode" straight to "has isUnilateral NOT NULL" would hit an interactive default-value prompt this non-interactive workflow can't answer. Split into `drizzle/0008_mean_the_leader.sql` (add `is_unilateral` nullable, hand-inserted `UPDATE` backfill from `side_mode != 'bilateral'`) and `drizzle/0009_mature_paper_doll.sql` (`SET NOT NULL`, `DROP COLUMN side_mode`, `DROP TYPE`) — both apply automatically in the same `db:migrate` run, so it's still one deploy, one verification checkpoint, matching the plan's intent.
- Backfill correctness verified directly against the dev Neon DB (not assumed): queried every row's `side_mode`/`is_unilateral` pair post-migration — every `bilateral` row mapped to `false`, every `unilateral_matched` row mapped to `true`, zero mismatches, zero `unilateral_separate` rows existed in real data.
- App-code cutover across every call site found in the earlier full-codebase inventory: `generated-plan-schema.ts`, `plan-builder-schema.ts` (checkbox-style boolean, same `on`/`true` preprocess pattern as `painSensitive`), `plan-preview.ts` (renamed `sideModeLabelEs` → `sideLabelEs`, now just `"unilateral"`/`"bilateral"`), `plan-repository.ts`, `plan-builder-repository.ts`, `seeded-plan.ts` (positional tuple slot swapped to boolean), `session-runner.tsx`, `plan-page-content.tsx`, the builder session page + `session-editor-form.tsx` (replaced the "Modo" 3-option select with a single "¿Es unilateral?" checkbox; also fixed a pre-existing type-drift bug flagged during planning — this file was hand-duplicating `IncrementCategory` as a local type instead of importing the canonical one from `progression-view.ts`, now imports it).
- Fixtures updated in every touched test file. `npm run typecheck` came back clean on the first pass after the full cutover — no missed call sites.

Next iteration:
- Phase 3 (replace `incrementCategory` with `loadMechanism` × `isCompound`, two-step rollout with a manual verification checkpoint before the irreversible cutover).

## 2026-07-30 — Exercise model redesign: Phase 1 complete, deployed, verified

Status: completed. Deployed and manually verified by the user against the real active plan: "Editar mi plan" and "Duplicar como borrador" both work correctly.

Follow-up fix shipped in the same phase, found during verification: the builder only let you set the plan's name/daysPerWeek at creation time — once a draft existed there was no way to rename it or change its day count, even though every session/exercise inside it was editable. Added a collapsed "Editar nombre y días del plan" section to the builder overview (`updateDraftPlanDetails` repository function + `updatePlanDetailsAction`), deployed and confirmed working.

Context:
- After the plan builder shipped and the user built + activated a real custom plan, real usage friction surfaced: no way to edit an active plan or reuse it as a base for a new one; `sideMode`'s "Unilateral separado" vs "Unilateral pareado" choice turned out to have zero behavioral difference in the app (confirmed via full-codebase grep — `session-runner.tsx` treats both identically); `incrementCategory` ("Categoría de incremento") was being used by the user as an exercise taxonomy when it only ever existed to drive the weight-suggestion percentage, and its "Máquina o tren inferior" option conflates equipment type with body region (a known judgment call, per `seeded-plan.ts`'s own code comment); and there was no way to model duration-based exercises (stair-climber/treadmill warmups, timed mobility holds) since every exercise is forced into sets × rep-range × RIR.
- Full 4-phase redesign worked out in plan mode: Phase 1 (no migration) promotes plan-editing to a first-class feature and adds plan duplication; Phase 2 (one migration) collapses `sideMode` to a boolean `isUnilateral`; Phase 3 (one migration, two-step rollout) replaces `incrementCategory` with a `loadMechanism` × `isCompound` pair; Phase 4 (largest, one migration) adds a `strength`/`duration` prescription-type axis so RIR/rep-range stop being forced onto cardio warmups and mobility holds. Full design, exact migration SQL sequencing, and file-by-file detail in `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md` — **read that file first when resuming**, this log entry is a status summary, not a replacement for it.
- The plan was independently stress-tested by a Plan agent that read the actual `drizzle-kit`/`drizzle-orm` source (not docs) before any phase was finalized — key finding: `npm run db:migrate` in this repo uses `@neondatabase/serverless`'s websocket driver via `drizzle-kit`'s own auto-detection (not the HTTP driver the app uses at runtime), and wraps each migration file in one real transaction, so crashes/SQL errors roll back cleanly. It does not protect against a backfill `UPDATE...CASE` that commits successfully but maps values wrong — that's why Phase 3's incrementCategory backfill ships as two separate deploys with a manual verification checkpoint in between, rather than one shot.
- Ordering (small/low-risk cleanups before the largest/riskiest change) was explicitly confirmed with the user via a direct question before finalizing the plan, since the original off-the-cuff sequencing proposed earlier in conversation had duration-based exercises coming second, not last — worth remembering if a future session's memory of "the plan" conflicts with what's actually in the plan file.

Implemented (Phase 1 of 4):
- `src/plans/plan-builder-repository.ts`: added `cloneWorkoutPlanToDraft(athleteProfileId, sourcePlanId)` — copies a plan's sessions/exercises into a fresh `draft`-status plan, leaving the source untouched; filters to `weekNumber === 1` (same backward-compat handling as `toGeneratedWorkoutPlan`) so cloning an old legacy 4-week plan doesn't duplicate 20 templates.
- `src/app/plan/actions.ts`: added `cloneActivePlanAction`, mirroring `editActivePlanAction`'s shape.
- `src/app/plan/plan-page-content.tsx`: `ActivePlanSummary` now always renders "Editar mi plan" and "Duplicar como borrador" buttons — the same `editActivePlanAction` that previously only appeared as crash-recovery (`ActivePlanErrorNotice`) is now a normal, always-available action, not framed as an error state.
- Tests: `plan-page-content.test.tsx` extended with a case asserting both buttons render on the active-plan view.

Next iteration:
- Phase 2 (collapse `sideMode` to `isUnilateral` boolean) — see `/Users/jcvalerio/.claude/plans/snazzy-waddling-mountain.md`.

## 2026-07-30 — Custom plan builder: Phase B (draft plan builder) implemented

Status: code complete, `lint`/`typecheck`/`test` (123 passing)/`build` all green. Not yet committed/deployed/verified as of writing this entry — that's the immediate next step.

Context:
- Direct continuation of Phase A (see the entry below). Full design was already worked out in `/Users/jcvalerio/.claude/plans/can-you-check-the-mutable-hollerith.md`'s "Phase B" section before Phase A even started; this iteration implemented it largely as specified, with a couple of small additions the design left implicit (see below).

Implemented:
- `src/plans/plan-builder-schema.ts` (new) — mirrors `src/baseline/baseline-schema.ts`'s `z.preprocess`-based style. `planBuilderSetupInputSchema`/`parsePlanBuilderSetupFormData` for the draft-creation form (`nameEs`, `daysPerWeek`). `planBuilderSessionInfoInputSchema`/`parsePlanBuilderSessionInfoFormData` — not explicitly named in the design doc, but needed since `planSessionTemplate` has its own required fields (`nameEs`, `focus`, `estimatedDurationMinutes`, `mobilityNotesEs`) separate from the exercise list; added as its own small schema rather than overloading the exercise one. `planBuilderExerciseInputSchema`/`parsePlanBuilderSessionFormData` — per-exercise-row schema with the defaults the design specified (`phase="main"`, `sideMode="bilateral"`, `restSeconds=90`, `notesEs="Ajusta la carga y conserva técnica."`, `painSensitive=false`, `substitutionOptionsEs=[]`, `incrementCategory=null`), parsing a dynamic number of rows via a hidden `rowCount` field and skipping entirely-blank rows (so an unused "+ Agregar ejercicio" row doesn't force a validation error).
- `src/plans/plan-builder-repository.ts` (new) — `getDraftPlanForProfile`, `createDraftPlan` (one draft at a time, app-level check only, per design), `saveDraftSession` (find-or-create the `planSessionTemplate` row, then delete-then-bulk-insert its `exercisePrescription` rows — mirrors `saveBaselineLiftsForProfile`'s exact replace-all pattern), `deleteDraftSession`, `activateDraftPlan` (archives any current active plan first, then activates the draft — required ordering because of the partial unique index on `status='active'`; the second update is wrapped so a failure surfaces as a thrown error the caller redirects on, leaving the draft row untouched).
- `src/app/plan/builder/actions.ts`, `page.tsx`, `builder-page-content.tsx` (+ test) — overview page: draft-creation form when there's no draft; once a draft exists, a day-by-day list (1..daysPerWeek) showing each day as either defined (name, exercise count, Editar/Eliminar) or "Sin definir" (+ Agregar link), and an "Activar este plan" button that only renders once every day has ≥1 exercise (`activateDraftPlanAction` independently re-validates this server-side before calling the repository, redirecting to `?error=incomplete` otherwise — the button being hidden client-side isn't trusted as the only guard).
- `src/app/plan/builder/session/[dayIndex]/page.tsx` + `session-editor-form.tsx` (client, + test) — one flat form per session mirroring `baseline-intake-form.tsx`'s add/remove-row pattern: session name/focus fields plus a dynamic list of exercise rows (name, phase, side mode, sets, rep range, RIR, rest, increment category, substitutions, notes, pain-sensitive checkbox), "+ Agregar ejercicio" to append a blank row client-side, "Eliminar" per row (always keeps at least one). Row `key`s are generated from a `useRef` counter seeded from the initial row count rather than `crypto.randomUUID()`, specifically to avoid a hydration mismatch between server and client render passes.
- `src/app/plan/plan-page-content.tsx` — added a "¿Prefieres tu propia rutina?" / "Crear mi propio plan" card linking to `/plan/builder`, shown whenever there's no active plan (alongside the existing seeded-plan quick-start when foundations are ready, or alone when they aren't — building a custom routine doesn't depend on baseline lifts/measurements the way the non-AI seeded-plan review gate does).

Verification:
- `nvm use v24.18.0`, then `npm run lint`, `npm run typecheck`, `npm run test` (26 files, 123 tests, all passing — added `plan-builder-schema.test.ts`, `builder-page-content.test.tsx`, `session-editor-form.test.tsx`), `npm run build` (confirms `/plan/builder` and `/plan/builder/session/[dayIndex]` compile as dynamic routes) — all green.
- Not yet done: commit, deploy, and a real end-to-end pass by the user (create draft → add each day's exercises → activate → confirm it replaces the seeded/prior plan as active, old history stays visible in `/progreso`, and session logging/previous-performance/progression suggestions keep working against the new plan).

Next iteration:
- Commit, deploy to Vercel production, and have the user build a real routine end-to-end against production to close out this feature.

## 2026-07-30 — Custom plan builder: Phase A complete, deployed, verified

Status: completed. Committed (`b8b2fd4`), deployed to Vercel production, and manually verified by the user against the real production DB's existing 4-week activated plan: `/plan` shows 5 sessions (not 20), `/entrenar` shows a flat list with a real suggestion and no "Semana" headers, `/progreso` session-history cards show "Día N" not "Semana 1 · Día N," nothing crashed. Also cleared the separate loose end from the prior session while 1Password was cooperating: committed the previously-staged Vercel deployment-config changes (`c6471e3`) — no functional change, git history now matches what was already live.

Context:
- User wants each person using the app (three separate people — each with their own login, already supported by the existing per-`athleteProfile` multi-tenancy) to define their own real training routine, instead of everyone getting the same hardcoded example plan from `src/plans/seeded-plan.ts`.
- Full design worked out in plan mode and independently reviewed by a Plan agent against the actual codebase before implementation started. Three decisions confirmed with the user: (1) a plan is one routine (K training days) that **repeats indefinitely** — no fixed week count, matching how the seeded plan already behaved (identical content every week; progression happens via logged weights, not different weekly content); (2) **free-text exercise entry**, matching the existing design; (3) **draft-first flow** — build incrementally, review, explicit "Activar" (reusing the `workoutPlan.status` `draft`/`archived` enum values that existed but were never used by any code path).
- **No DB migration needed anywhere in this plan.** The live production DB (with the user's real activated plan + logged workout history from real-device testing) keeps its existing columns — `planSessionTemplate.weekNumber` and `workoutPlan.durationWeeks` become vestigial (always hardcoded to `1` for all plans going forward) rather than being dropped/altered. This was a deliberate choice to avoid any migration risk against live prod data.
- Full design rationale, the two-phase split, and exact file-by-file plan are written out in `/Users/jcvalerio/.claude/plans/can-you-check-the-mutable-hollerith.md` — read that file for anything not covered here.
- This entry replaces the prior "Phase A in progress (paused)" checkpoint from earlier the same day — that entry's TODO list is exactly what this iteration finished.

Phase A ("flatten the week-block model into one repeating routine") — **done**:
- `src/plans/generated-plan-schema.ts`, `src/plans/seeded-plan.ts`, `src/plans/plan-repository.ts`, `src/plans/plan-preview.ts`, `src/app/plan/plan-page-content.tsx`, `src/workouts/session-progress.ts` — all flattened as described in the paused checkpoint (see plan file for detail); these were already done and green before this iteration started.
- Finished this iteration: `src/app/entrenar/entrenar-page-content.tsx` (+ test) now consumes flat `EntrenarSessionItem[]` from `buildEntrenarSessions` directly — no week grouping/headers, and the now-unreachable "completaste todas las sesiones" empty state was removed (the suggestion is never `null` for a non-empty plan). `src/app/entrenar/page.tsx` calls the renamed `buildEntrenarSessions`. `src/workouts/session-progress.test.ts` was fully rewritten against the new `getSuggestedTemplateId(templateIdsInOrder, latestByTemplateId: Map<string, WorkoutSession>)` signature — covers in-progress-always-wins, recency-based rotation, lowest-`dayIndex` tie-breaks (both for in-progress ties and "brand new plan" never-trained ties), and that it never returns `null` for a non-empty plan. `src/app/entrenar/[sessionId]/session-runner.tsx` and `src/app/progreso/progreso-page-content.tsx` both changed "Semana {weekNumber} · Día {dayIndex}" to just "Día {dayIndex}" (session-runner in both the active wizard header and `CompletedSessionSummary`; progreso on the session-history cards). Updated `entrenar-page-content.test.tsx` and `progreso-page-content.test.tsx` accordingly. `plan-page-content.test.tsx` needed no changes — it exercises `getPlanPreviewSummary`/`createSeededHypertrophyPlan` directly rather than hardcoding the renamed `PlanPreviewSummary` fields, so it was already compatible with the earlier flattening work.

Phase B (the actual draft plan builder UI: `plan-builder-schema.ts`, `plan-builder-repository.ts`, `/app/plan/builder/*` routes and actions, tests) — **not started**. Full design already worked out in the plan file; start there once Phase A is deployed and verified.

Separate, unrelated loose end also still open: the previous session's Vercel deployment-config commit (`vercel.json`, `package.json` engines fix, `.gitignore` entry) is **still only staged, never actually committed** — it hit the same intermittent `1Password: failed to fill whole buffer` git-signing error twice and was never retried after the conversation moved on to OAuth troubleshooting. It's already deployed and working in production regardless (Vercel doesn't need the commit to have already built from that working tree), but git history doesn't reflect it yet. Deliberately left staged-but-uncommitted again this iteration (kept out of the Phase A commit, since it's unrelated) — commit it whenever 1Password cooperates.

Verification:
- `nvm use v24.18.0`, then `npm run lint`, `npm run typecheck`, `npm run test` (23 files, 105 tests, all passing), `npm run build` — all green.

Next iteration:
- Start Phase B (the actual draft plan builder: `plan-builder-schema.ts`, `plan-builder-repository.ts`, `/app/plan/builder/*` routes and actions, tests). Full design already worked out in `/Users/jcvalerio/.claude/plans/can-you-check-the-mutable-hollerith.md`.

## 2026-07-29 — First production deploy on Vercel

Status: completed.

Context:
- User wants to test the accumulated Slices 1-6 work on a real iPhone. Vercel deployment solves this more reliably than LAN dev-server tunneling (past iterations struggled with iPhone-reachable dev origins and OAuth redirect matching).
- The existing Vercel project (`my-ai-personal-trainer`, custom domain `trainer.jcvalerio.com`) turned out to have unrelated content live on it (Clerk auth, `/en` redirect — doesn't match this app's Better Auth / no-locale-prefix setup). Confirmed with the user before touching anything; created a fresh project (`ai-personal-trainer-mvp`) instead of overwriting it.
- Per `docs/architecture/release-workflow.md`'s already-documented environment model, production uses a separate Neon database from the dev database this session's testing has been using — the user created it and added `DATABASE_URL` directly via the Vercel dashboard as a **Sensitive** env var (write-only; not retrievable via `vercel env pull` or CLI by design).

Implemented:
- Linked a new Vercel project via `vercel link`; set `BETTER_AUTH_SECRET` (freshly generated), `BETTER_AUTH_URL` (`https://ai-personal-trainer-mvp.vercel.app`), and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (reused from local dev — same OAuth client, redirect URI added for the new domain) as production env vars via `vercel env add`.
- Since `DATABASE_URL` is Sensitive and can't be pulled locally, added `vercel.json` with `"buildCommand": "npm run db:migrate && npm run build"` so migrations run as part of Vercel's own build (where the env var is available) instead of needing the secret locally. This also matches the release workflow doc's existing intent ("apply the same migration to production during/after the main deployment") — now automated. Migrations are idempotent (drizzle tracks applied ones), so this is safe on every future deploy too.
- Fixed `package.json`'s `engines.node` from an exact patch pin (`"24.18.0"`) to `"24.x"` — Vercel's build environment rejects exact patch versions and only accepts major/range specifiers.
- Deployed to production: `https://ai-personal-trainer-mvp.vercel.app`. Verified the homepage renders correctly (Spanish title, correct app shell) and migrations applied successfully during the build log.

Verification:
- Local `npm run lint` and `npm run typecheck` pass after the `package.json`/`vercel.json` changes.
- Vercel build log shows migrations applying successfully against production, then `next build` completing with all expected routes.
- `curl` confirms the deployed homepage returns 200 with correct content.
- Did not verify Google sign-in end-to-end (needs the user to actually click through) — that plus real iPhone testing is the immediate next manual step.

Next iteration:
- User to test sign-in and the full flow (plan activation → session logging → progress) on a real iPhone against the production URL, and confirm the Google OAuth redirect URI was added correctly in Google Cloud Console.
- Otherwise continuing per `docs/product/next-task.md`'s candidate list.

## 2026-07-29 — Per-category weight-increment accuracy (Slice 6)

Status: completed.

Context:
- Continuation of Slice 5, chosen autonomously as flagged in the prior entry: Slice 3's suggested weight was a flat ±5% because `exercisePrescription` had no equipment/movement category. `docs/product/progression-rules.md` specifies different increase ranges per category (machines/lower body +5-10%, upper compound +2.5-5%, isolation "smallest jump or add reps first," dumbbell "follow available increments").
- Real risk considered before implementing: the user's dev database already had a real, previously-activated `exercisePrescription` row set from testing Slices 1-5. A NOT NULL category column would have required a backfill migration touching that live test data. Chose a **nullable** column with no default instead — zero backfill needed, old rows just read as "no category" and fall back to the pre-Slice-6 flat ±5% behavior, new activations always get a real category from the (now-updated) seeded plan. This traded a small amount of correctness (very old rows stay uncategorized forever unless someone deactivates/reactivates) for zero risk to existing data.
- Classification of the 20 seeded exercises into machine_or_lower_body/upper_compound/isolation/dumbbell is a judgment call — the source doc's taxonomy isn't a clean partition (e.g., "machines" bucket spans upper and lower body). Documented the rationale directly in `seeded-plan.ts` and flagged it in `next-task.md` as worth a second look by the user, who knows the actual gym equipment.

Implemented:
- `src/db/schema.ts`: added `exerciseIncrementCategoryEnum` and a nullable `incrementCategory` column on `exercisePrescription`. Migration `drizzle/0007_jittery_tomorrow_man.sql` — a single `CREATE TYPE` + `ADD COLUMN`, no data changes.
- `src/plans/generated-plan-schema.ts`: added `incrementCategory` as `.optional()` (not required) — this is what makes the nullable-DB/no-backfill approach safe, since `toGeneratedWorkoutPlan`'s round-trip re-validation (used to render `/plan`) would otherwise reject old rows with a missing category.
- `src/plans/seeded-plan.ts`: classified all 20 exercises; `activateSeededPlanForProfile` now persists the category on every new activation.
- `src/workouts/progression-view.ts`: `suggestNextWeightKg` takes an optional category — machine/lower body +5%, upper compound +2.5%, dumbbell +2kg fixed step, isolation unchanged weight (paired with a new `isRepsFirstIncrease()` helper the UI uses to show "Añade una repetición" instead of a weight arrow), missing category falls back to the original flat ±5%. Reduce stays flat -5% regardless of category, matching the docs (only the increase side is categorized).
- `src/app/entrenar/[sessionId]/session-runner.tsx`: passes `currentExercise.incrementCategory` through; isolation exercises show "Añade una repetición" with an explanatory line instead of a weight-jump suggestion.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 23 files, 99 tests (extended `progression-view.test.ts` with 8 category cases, `session-runner.test.tsx` with isolation/upper_compound cases; updated fixtures across `plan-repository.test.ts` and `session-progress.test.ts` for the new field).
- `npm run build` passes.
- `npm run db:generate` produced a single clean migration (one enum, one nullable column); reviewed before applying. `npm run db:migrate` applied successfully against dev, confirmed non-destructive to the existing activated plan.

Next iteration:
- Continuing autonomously. See `docs/product/next-task.md`. Next candidate under consideration: estimated 1RM / asymmetry signals, but flagged for a methodology check rather than a silent implementation given both need a real choice (1RM formula, asymmetry data join) that's easy to get subtly wrong.

## 2026-07-29 — Remaining 5% improvement signals (Slice 5)

Status: completed.

Context:
- Continuation of Slice 4, chosen autonomously per the user's standing "keep going" instruction: of the 4 remaining signals from `docs/product/progression-rules.md`'s "5% improvement definition," 2 were cleanly implementable with existing data (reps-at-same-load, load-at-same-reps) and 2 were not (estimated 1RM needs a formula choice; asymmetry needs a `baselineLift` join not modeled at the instance-comparison level) — implemented the clean 2, left the other 2 explicitly documented rather than rushed.
- Note: the Slice 4 commit initially failed twice with `1Password: failed to fill whole buffer` (SSH commit signing via `op-ssh-sign` unavailable). Did not bypass signing; work stayed staged until the user returned and asked to retry, at which point the commit succeeded normally.

Implemented:
- `src/workouts/improvement.ts`: extended `computeExerciseImprovement` with `reps_at_load` (reps up >=5% at unchanged load, defined as average weight within 1% tolerance, with average RIR drift <=1) and `load_at_reps` (load up >=5% at same-or-higher reps, average RIR drift <=1). `ExerciseImprovement` now also carries `latestAvgWeightKg`/`previousAvgWeightKg`/`latestAvgReps`/`previousAvgReps` for display.
- `src/app/progreso/progreso-page-content.tsx`: added Spanish labels for the two new signal chips.
- Updated `docs/product/milestones.md` (M5 acceptance line now "mostly done," 4 of 6 signals) and `docs/product/next-task.md`.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 23 files, 90 tests (extended `improvement.test.ts` with 5 new cases; updated `progreso-page-content.test.tsx` fixtures for the new `ExerciseImprovement` fields).
- `npm run build` passes. No schema/migration changes.

Next iteration:
- Continuing autonomously. See `docs/product/next-task.md`; next candidate under consideration is per-category weight-increment accuracy (Slice 3's flat ±5% suggestion), since it's a self-contained, well-scoped follow-up with a clear existing spec (`docs/product/progression-rules.md`'s category table) — estimated 1RM and asymmetry are flagged as needing an explicit methodology choice rather than a silent pick.

## 2026-07-28 — Progress history page (Slice 4)

Status: completed.

Context:
- Direct continuation of Slice 3. User asked to keep going autonomously with `/progreso` and explicitly delegated ongoing scope/task decisions ("I will be away so after each task do an assessment and decide the best next task and continue the implementation") — so this and subsequent slices are implemented without interactive plan-mode approval gates, since that would block on a user who isn't there to approve. Decisions below were made directly and documented rather than asked.
- `docs/product/mvp-plan.md`'s acceptance criteria include "At least one 5% improvement signal is visible for each tester where appropriate" and "Previous performance is visible before each exercise" (the latter already done in Slice 3). `docs/product/progression-rules.md`'s "5% improvement definition" section lists 6 possible signals; implementing all 6 in one pass was judged disproportionate (some need rep-matching logic, an estimated-1RM formula choice, or asymmetry data not yet modeled) — implemented 2 (total volume load, pain improvement), documented the other 4 as deferred rather than silently skipped.

Implemented:
- `src/workouts/improvement.ts` (new, pure, unit-tested): `computeExerciseImprovement(latest, previous)` — flags `volume_load` (total reps×kg up >=5% while max pain stays <=2) and `pain` (max pain down >=2 points at a maintained-or-higher workload); `buildExerciseImprovements()` turns a per-exercise instance map into a sorted (improved-first) view-model, skipping exercises with fewer than 2 completed instances.
- `src/workouts/workout-repository.ts`: added `getCompletedWorkoutSessionsForProfile` (joined with `planSessionTemplate` for display) and `getRecentExerciseInstancesByName` (the 2 most recent completed instances per distinct exercise name, across the whole history — reuses the same cross-week name-matching approach as Slice 3's "Última vez").
- `/progreso` (`src/app/progreso/page.tsx` + `progreso-page-content.tsx`): "Mejoras recientes" cards per exercise (improved/neutral badge, volume/pain before-after, matched signal chips) plus a full completed-session history list; each history row links to `/entrenar/[sessionId]`, reusing the read-only `CompletedSessionSummary` view Slice 2 already built there — no new detail page needed. Empty state (no completed sessions yet) links to `/entrenar`.
- Turned "Progreso" from a disabled nav stub into a real link (`src/app/home-nav.ts`) — the bottom nav now has zero disabled destinations.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 23 files, 85 tests (added `improvement.test.ts`, `progreso-page-content.test.tsx`; updated `home-nav.test.ts` and `mobile-bottom-nav.test.tsx` for the nav change).
- `npm run build` passes; `/progreso` compiles as a dynamic route.
- No schema/migration changes this slice.
- Did not perform an end-to-end browser click-through against the real tester account — left as a manual step, same as prior slices.

Next iteration:
- Continuing autonomously per the user's instruction. See `docs/product/next-task.md` for the candidate list; picking the next one directly rather than waiting for confirmation.

## 2026-07-28 — Previous performance and progression suggestions (Slice 3)

Status: completed.

Context:
- Direct continuation of Slice 2, confirmed working by the user in real usage (logged real sets with RIR/pain via `/entrenar`). User asked to continue with "progression suggestions" — `docs/product/milestones.md` M5.
- The suggestion engine (`suggestProgression()` in `src/training/progression.ts`) already existed, fully tested, but nothing called it and nothing looked up previous performance. `docs/product/session-logging-ux.md`'s documented "Primary screen" already listed "Previous performance" as a UI element Slice 2 didn't implement.
- Discussed weight-suggestion approach with the user before implementing: they want a concrete suggested weight (not just a qualitative label) to avoid doing percentage math mid-workout, while keeping it a fully overridable default rather than a rule. Agreed on a flat +5% (increase) / -5% (reduce_or_modify), rounded to the nearest 0.5kg, since `exercisePrescription` doesn't store an equipment/movement category needed for `progression-rules.md`'s per-category increment ranges — documented as a known simplification, not silently assumed.

Implemented:
- `src/workouts/workout-repository.ts`: added `getPreviousExercisePerformance(athleteProfileId, exerciseNameEs, excludeWorkoutSessionId)` — matches "last time" across weeks by exercise name (each week has its own `exercisePrescription` row for the same exercise), not by prescription id. Wired into `getSessionRunDetails` so every exercise in a session carries its previous instance's sets, if any.
- `src/workouts/progression-view.ts` (new, pure, unit-tested): `buildProgressionSuggestion()` maps `setLog` rows to the engine's input shape and delegates to `suggestProgression()`; `suggestNextWeightKg()` computes the flat ±5% suggested weight with half-kilo rounding.
- `src/app/entrenar/[sessionId]/session-runner.tsx`: added an "Última vez" card (previous sets + suggestion label/reason/suggested weight) shown before the first set of a repeated exercise; extended the weight/reps default-value precedence to fall back to the suggestion/previous reps when there's no set logged yet this session (this-session last set still wins once one exists, unchanged from Slice 2).
- Updated `docs/product/progression-rules.md` and `docs/product/milestones.md` (M5 deliverables marked done, "5% improvement signal" acceptance line explicitly left open as a different, future feature).

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 21 files, 74 tests (added `progression-view.test.ts`; extended `session-runner.test.tsx` with previous-performance-shown/hidden cases).
- `npm run build` passes. No schema/migration changes this slice.
- Did not perform an end-to-end browser click-through against the real tester account in this iteration — left as the user's manual step, same as Slices 1-2.

Next iteration:
- See `docs/product/next-task.md`: candidate next steps are a `/progreso` history page (also where M5's still-open "5% improvement signal" belongs), per-category increment accuracy (needs an equipment/movement category field), real-device validation of the new suggestion card, or a custom plan builder — presented as an open decision, not assumed.

## 2026-07-28 — Today's-session UI and per-set RIR/pain logging (Slice 2)

Status: completed.

Context:
- Direct continuation of Slice 1, confirmed working by the user in real usage (activated the seeded plan via `/plan`, saw "Tu plan activo"). This slice delivers the actual stated goal: recording training progress using RIR.
- Two UX decisions were confirmed with the user via mockup previews before implementation: (1) `/entrenar` highlights the next incomplete session as a suggestion but also lists every session manually-pickable, since the plan has no calendar dates; (2) the logging screen is a one-exercise-at-a-time wizard (matching `docs/product/session-logging-ux.md`'s documented ideal), not an all-exercises-on-one-page form.

Implemented:
- Added a unique index on `exercise_log(workout_session_id, exercise_prescription_id)` (migration `drizzle/0006_easy_thena.sql`) so first-set-of-an-exercise creation can use the same `onConflictDoNothing` race-closing pattern proven in Slice 1's plan activation.
- Added `src/workouts/`: `workout-repository.ts` (session start/resume, ownership-scoped fetch, run-details loader joining exercise/set logs, server-authoritative set-number computation, session completion), `set-log-schema.ts` (Zod validation mirroring `baseline-schema.ts`'s style), `session-progress.ts` (pure, unit-tested: session status derivation, suggested-session selection, week-grouped view-model builder for the picker).
- Added `/entrenar` (`src/app/entrenar/page.tsx` + `entrenar-page-content.tsx`): suggested-session card plus full week-by-week list with status badges (No iniciada / En progreso / Completada); an empty state links to `/plan` when there's no active plan yet.
- Added `/entrenar/[sessionId]` (`session-runner.tsx`, a client wizard): one exercise at a time, "Anterior"/"Siguiente ejercicio" navigation, per-set form (weight/reps default from the exercise's last logged set or target rep max, RIR defaults to the exercise's target RIR, pain defaults to 0, side toggle only for unilateral exercises defaulting to whichever side has fewer logged sets), inline save confirmation, and a pain->=7 warning banner. A completed session renders a read-only summary instead of forms.
- Departed from this app's usual redirect-per-save form convention for `saveSetAction`: it uses React 19's `useActionState` (validate, persist, `revalidatePath`, return a result — no redirect) since a tester logs many sets per sitting and a full navigation per set would be jarring. `startOrResumeSessionAction` and `completeSessionAction` keep the existing redirect convention since those are one-shot, page-leaving actions.
- Every entry point taking a client-supplied `workoutSessionId` re-verifies it belongs to the current user's profile via a `WHERE id = ? AND athleteProfileId = ?` query (no separate assertion helper needed — `src/lib/ownership.ts` is typed for resources with a literal `userId` field, which none of the domain tables have).
- Turned "Entrenar" from a disabled nav stub into a real link (`src/app/home-nav.ts`).
- Updated `docs/product/session-logging-ux.md` with an "Implemented" note and known deviations (no rest timer, no exercise-swap action yet, weight has no plan-level target to default from).

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 20 files, 64 tests (added `session-progress.test.ts`, `set-log-schema.test.ts`, `entrenar-page-content.test.tsx`, `session-runner.test.tsx`; updated `home-nav.test.ts` and `mobile-bottom-nav.test.tsx` for the nav change).
- `npm run build` passes; `/entrenar` and `/entrenar/[sessionId]` compile as dynamic routes.
- `npm run db:generate` produced one clean single-statement migration (the new unique index only); reviewed before applying. `npm run db:migrate` applied successfully against dev.
- Did not perform an end-to-end browser click-through against the real tester account in this iteration — left as the user's manual step, same as Slice 1.

Next iteration:
- See `docs/product/next-task.md` for candidate next steps (progression-suggestion UI, progress history, real-device validation, or a custom plan builder) — no single one was assumed; it's presented as an open decision.

## 2026-07-28 — Persist and activate the seeded plan (Slice 1)

Status: completed.

Context:
- User goal: reach a point where they can manually create a training plan and start recording progress with an RIR approach. Clarified "manually create" to mean activating the existing seeded hypertrophy template as-is (no custom exercise-picker builder yet), scoped as two slices. This is Slice 1: persistence + activation only. Slice 2 (today's-session UI + per-set RIR/pain logging) is the next task.
- This intentionally supersedes the prior guardrail that said not to add activate/workout-session/exercise-log/set-log behavior — that guardrail was protecting scope while onboarding foundations were being built.

Implemented:
- Added 4 new enums and 6 tables to `src/db/schema.ts`: `workoutPlan`, `planSessionTemplate`, `exercisePrescription` (used by this slice), plus `workoutSession`, `exerciseLog`, `setLog` (schema only, no application code reads/writes them yet — prep for Slice 2 so it doesn't need another migration).
- Added a partial unique index (`workout_plan_active_per_profile_idx`) enforcing at most one active plan per athlete profile, used both as a DB constraint and as the `onConflictDoNothing` arbiter that closes an activation race condition without needing multi-statement transactions (the `neon-http` driver in use doesn't support `db.transaction()`).
- Added `src/plans/plan-repository.ts`: `getActivePlanForProfile`, `activateSeededPlanForProfile` (idempotent — a second activation returns the existing plan instead of duplicating), and `toGeneratedWorkoutPlan` (a pure mapper that reconstructs the exact `GeneratedWorkoutPlan` Zod shape from relational rows and re-validates it, so the existing `getPlanPreviewSummary()` renderer could be reused unchanged for a persisted active plan).
- Added `src/app/plan/actions.ts` (`activatePlanAction`), mirroring the existing baseline/perfil/mediciones server-action pattern, with a server-side foundation-readiness re-check as defense in depth.
- Updated `/plan` to load the active plan (if any) and render it as "Tu plan activo" instead of the unsaved preview, with a `?saved=1` success banner. When no plan is active yet, the seeded preview keeps its existing read-only copy but now has an "Activar este plan" button beneath it.
- Generated and applied migration `drizzle/0005_tough_daredevil.sql` against the configured Neon development database.
- Updated `docs/specs/generated-plan-contract.md` to describe activation as implemented instead of future/out-of-scope.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 16 files, 38 tests (added `src/plans/plan-repository.test.ts` for the mapper round-trip/sort-order/null-coalescing behavior; extended `plan-page-content.test.tsx` with an active-plan render-path case).
- `npm run build` passes.
- `npm run db:generate` produced a single clean migration for all 6 tables + 4 enums; reviewed the SQL before applying. `npm run db:migrate` applied successfully.
- Did not perform an end-to-end browser/device activation click-through against the real tester account in this iteration — that write against the user's real dev-DB profile was left as their manual step rather than performed autonomously.

Next iteration:
- Slice 2 per `docs/product/next-task.md`: today's-session UI and per-set RIR/pain logging against the now-activated plan, using the already-created `workout_session`/`exercise_log`/`set_log` tables.
- Before that, it would help to have the user do the one manual pass this iteration deferred: sign in, complete foundations if needed, click "Activar este plan" on `/plan`, and confirm it shows "Tu plan activo" without duplicating on reload.

## 2026-07-19 — Mobile shell and baseline progress polish

Status: completed.

Implemented:
- Added a shared iPhone-first `AppShell` with persistent bottom navigation across Inicio, Perfil, Pesos base, Mediciones, and Plan.
- Replaced touch-hostile disabled nav spans with tappable/focusable disabled controls that show visible Spanish reasons for Entrenar and Progreso.
- Clarified the non-functional locale pill as `ES · EN pronto`.
- Added safe-area-aware sticky submit positioning and pending/disabled submit states for Perfil, Pesos base, and Mediciones.
- Added success/error banners after form actions using `?saved=1` and `?error=validation`, with server-action validation catches to avoid generic error pages for expected validation misses.
- Added a live Baseline progress card showing completed exercises/rows, a jump-to-pending link, and exercise anchors for the long optional scroll.

Verification:
- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm run test` passes: 15 files, 34 tests.
- `npm run build` passes.

Next iteration:
- Manually validate the shared bottom nav, form save feedback, safe-area sticky buttons, and Baseline progress anchors on a real iPhone with tester data. If this passes, continue with the remaining low-risk iPhone Web polish such as PWA manifest/home-screen install support.

## 2026-07-18 — Seeded preview validation harness

Status: completed.

Validation outcome:
- Working tree was clean at iteration start; `next-env.d.ts` was not dirty.
- Actual iPhone hardware was not available in the agent environment, so the real-device checklist in `docs/product/next-task.md` remains the required manual validation step.
- Added automated coverage for the iPhone-sized review intent without calling AI, persisting a plan, accepting/editing a draft, activating a plan, or creating workout/log/progression data.

Implemented:
- Extracted `/plan` UI into a pure `PlanPageContent` component so complete/incomplete review states can be tested deterministically.
- Added component coverage for complete-state read-only seeded preview copy, IA-off/Plan-sin-crear status, boundary badges, future set-log fields, exercise accordion expansion, exercise target details, and absence of accept/edit/activate/generate links.
- Added component coverage that the seeded preview remains hidden until Perfil, Pesos base, and Mediciones are complete.
- Switched remaining visible Spanish UX labels from AI/no-AI to IA/no-IA in plan readiness/home/profile copy.
- Updated `docs/product/next-task.md` to note the automated supplement while keeping real-iPhone validation as the next required step.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 13 files, 30 tests.
- `npm run build` passes.

Next iteration:
- Run the manual real-iPhone `/plan` complete-state validation with tester data using `docs/product/next-task.md`. If it passes, the next implementation task can design non-AI draft acceptance boundaries without persisting or activating a plan yet.

## 2026-07-18 — Next task documented

Status: completed.

Validation outcome:
- Working tree was clean at iteration start; `next-env.d.ts` was not dirty.
- No product code changed and no AI/plan persistence behavior was added.

Implemented:
- Added `docs/product/next-task.md` with an actionable real-iPhone `/plan` seeded-preview validation task.
- Captured setup, hard constraints, review checklist, pass criteria, allowed follow-up changes, required verification commands, and conventional commit guidance.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 12 files, 28 tests.
- `npm run build` passes.

Next iteration:
- Execute `docs/product/next-task.md`: validate the complete-state `/plan` seeded preview on an actual iPhone with tester data. Do not start AI plan generation or persist/activate a plan.

## 2026-07-18 — Seeded preview mobile boundary polish

Status: completed.

Validation outcome:
- Working tree was clean at iteration start; `next-env.d.ts` was not dirty.
- Real-device iPhone validation was not available in the agent environment, so the `/plan` complete-state preview was reviewed statically for iPhone-sized touch targets and copy.
- The screen remains read-only and non-AI: no AI call, no plan persistence, no draft acceptance, and no activation.

Implemented:
- Switched remaining visible `/plan` AI labels to Spanish-first IA copy.
- Added deterministic seeded-preview boundary badges: Solo lectura, Sin IA, No guardado, and No activable.
- Improved the expandable exercise summary tap target and hint copy for mobile review.
- Documented non-AI draft persistence boundaries before any future accept/edit/activate work.

Verification:
- `npm run test` passes: 12 files, 28 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Validate `/plan` complete-state seeded preview on a real iPhone with tester data. If clear, the next small step can add an explicit non-AI draft acceptance design only; do not start AI plan generation or persist/activate a plan yet.

## 2026-07-18 — Seeded preview exercise details

Status: completed.

Implemented:
- Expanded the deterministic plan preview summary to include week-1 exercise-level targets: order, phase, side mode, sets, rep range, numeric RIR, rest, pain-sensitive flag, and substitutions.
- Updated `/plan` with iPhone-friendly expandable session details so complete onboarding users can inspect the seeded preview without persistence or activation.
- Added explicit future set-log field badges: kg, reps, RIR, dolor, and notas opcionales.
- Documented the current non-AI preview scaffold in `docs/specs/generated-plan-contract.md`.
- Updated unit coverage for preview exercise targets and required set-log fields.

Verification:
- `npm run test` passes: 12 files, 28 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Real-device sanity check of expandable seeded preview details on iPhone. If clear, the next small step can define non-AI draft persistence boundaries before implementing any accept/edit action. Do not start AI plan generation yet.

## 2026-07-18 — Seeded plan preview scaffold

Status: completed.

Implemented:
- Added a deterministic seeded-plan preview summary helper for non-persisted plan review scaffolding.
- Updated `/plan` to show a compact “Vista previa no guardada” section only when Perfil, Pesos base, and Mediciones are complete.
- The preview uses the existing seeded hypertrophy plan, shows week-1 session summaries and safety badges, and explicitly says it is not AI-generated, not persisted, and not activatable yet.
- Added unit coverage for seeded preview summary counts.

Verification:
- `npm run test` passes: 12 files, 28 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Real-device sanity check of the complete-state `/plan` preview on iPhone, then decide whether to add manual edit/accept scaffolding or keep validating onboarding data. Do not start AI plan generation yet.

## 2026-07-18 — Non-AI plan readiness polish

Status: completed.

Validation outcome:
- Confirmed the working tree was clean after reverting the generated `next-env.d.ts` dev-types rewrite.
- Reviewed `/plan` implementation and deterministic readiness states for iPhone-sized use with incomplete foundation state and complete Perfil + Pesos base + Mediciones state.
- The screen remains a non-AI readiness gate only: no AI call, no generated-plan persistence, and no plan activation.

Implemented:
- Clarified `/plan` copy so CTA actions are explicitly safe and only open pending onboarding steps or return to Inicio.
- Improved pending/ready state labels: Plan waits for bases when incomplete and becomes “Revisión no-AI” only after the foundations are complete.
- Added compact mobile status tiles for Bases, AI, and Plan state, plus slightly tighter small-width padding and clearer checklist pill styling.
- Updated deterministic readiness/gate tests for the safer CTA and state copy.

Verification:
- `npm run test` passes: 11 files, 27 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Real-device sanity check of the polished `/plan` copy on iPhone after tester data entry, then continue with non-AI plan review scaffolding only if prioritized. Do not start AI plan generation yet.

## 2026-07-18 — iPhone dev-origin configuration

Status: completed.

Issue:
- iPhone local-network testing against `http://192.168.68.69:3000` hit Next.js dev-resource cross-origin blocking for `__nextjs_font/geist-latin.woff2` and HMR websocket retries.
- Login from a phone also requires the auth base URL and Google OAuth redirect URL to match the host used on the phone.

Implemented:
- Added `NEXT_ALLOWED_DEV_ORIGINS` parsing for `next.config.ts` so local LAN hosts can be allowed without hardcoding environment-specific IPs in source.
- Documented iPhone local-network testing in `README.md`, including `npm run dev -- --hostname 0.0.0.0` and the OAuth host/redirect requirement.
- Added `.env.example` guidance for `NEXT_ALLOWED_DEV_ORIGINS`.
- Added deterministic coverage for parsing comma-separated dev origins.

Verification:
- `npm run test` passes: 11 files, 27 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Restart local dev with `NEXT_ALLOWED_DEV_ORIGINS="192.168.68.69"` in `.env.local` and validate iPhone page load.
- For iPhone Google login, set `BETTER_AUTH_URL` to the same reachable host and add the matching Google OAuth redirect URL, or use a stable HTTPS preview/tunnel if Google rejects private LAN IP callbacks.

## 2026-07-18 — Non-AI plan readiness screen

Status: completed.

Manual validation note:
- Login and logout workflows were tested successfully before this iteration.

Implemented:
- Added authenticated `/plan` page as a non-AI readiness/review gate.
- The plan screen summarizes Perfil, Pesos base, Mediciones, and Plan state without generating or persisting any plan.
- Added deterministic plan gate helper that always keeps `canGenerateAi=false` and guides incomplete users back to the next onboarding step.
- Updated home navigation so Plan is now a real link to the readiness screen, while Entrenar and Progreso remain disabled until a plan/session flow exists.
- Included pain-aware progression reminder on the plan readiness screen.

Verification:
- `npm run test` passes: 10 files, 25 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Manually validate `/plan` on an iPhone-sized viewport with both incomplete and complete onboarding states.
- If `/plan` copy is clear, the next small vertical slice can be non-AI plan persistence/review scaffolding or seeded fallback review only; do not call AI generation yet.

## 2026-07-18 — Home navigation availability polish

Status: completed.

Implemented:
- Made the signed-in/signed-out home navigation explicit about which destinations are available now versus future MVP areas.
- Kept Inicio, Perfil, Pesos base, and Mediciones as navigable onboarding routes.
- Marked Plan, Entrenar, and Progreso as disabled guidance with Spanish reasons instead of making them look like working links.
- Added deterministic coverage for implemented versus disabled home navigation items.

Verification:
- `npm run test` passes: 9 files, 23 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Manual validation step: sign in on an iPhone-sized viewport, confirm the home readiness CTA and disabled nav labels are clear, then walk `/perfil` → `/baseline` → `/mediciones` with tester data.
- If validation passes, document tester notes and only then consider non-AI plan-review scaffolding. Do not start AI plan generation yet.

## 2026-07-17 — Authenticated onboarding polish

Status: completed.

Implemented:
- Added a deterministic primary CTA to the M1 readiness helper so signed-in home guides the next safe onboarding step without starting AI plan generation.
- Polished signed-in readiness cards for small iPhone widths with clearer wrapping, touch targets, and focus rings.
- Clarified `/perfil`, `/baseline`, and `/mediciones` copy around profile-first navigation, replacement/history behavior, partial data, and the fact that AI plan generation is not triggered yet.
- Added an explicit empty/pending state for missing baseline weights.

Verification:
- `npm run test` passes: 8 files, 21 tests.
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run build` passes.

Next iteration:
- Validate the polished flows on a real iPhone-sized browser with authenticated tester data.
- Continue non-AI onboarding foundations or plan-review scaffolding only when prioritized; do not start AI plan generation yet.

## 2026-07-17 — Onboarding readiness guidance

Status: completed.

Implemented:
- Added signed-in home guidance for M1 readiness: Perfil, Pesos base, Mediciones, and Plan.
- Used authenticated profile, baseline, and measurement data to mark foundation steps as ready, pending, or blocked.
- Kept the Plan step explicitly `No iniciado` and did not start AI plan generation.
- Added deterministic readiness helper coverage for blocked, complete, and partial onboarding states.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 8 files, 21 tests.
- `npm run build` passes.

Next iteration:
- Manually validate the signed-in home, `/perfil`, `/baseline`, and `/mediciones` flows on an iPhone-sized viewport.
- Continue non-AI foundations; do not start AI plan generation yet.

## 2026-07-06 — Body measurement tracking

Status: completed.

Implemented:
- Added `body_measurement` Drizzle table and migration for historical body measurements tied to an athlete profile.
- Added authenticated `/mediciones` page linked from the home shell.
- Added Spanish-first iPhone-friendly measurement form with optional date/time, weight, waist, left/right thigh, calf, arm, and notes.
- Preserved history by inserting a new measurement row on every save; previous rows are never overwritten.
- Allowed partial measurement saves while requiring at least one numeric measurement.
- Displayed recent measurement history plus derived left-minus-right thigh and calf gaps.
- Added recommended cadence copy: cada 2 semanas.
- Added unit coverage for measurement validation and gap calculation.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 7 files, 18 tests.
- `npm run build` passes.
- `npm run db:generate` created `drizzle/0004_old_spiral.sql`.
- `npm run db:migrate` applied `drizzle/0004_old_spiral.sql` successfully against the configured Neon development database.

Next iteration:
- Validate `/mediciones` manually on iPhone-sized viewport with a tester profile.
- Continue with non-AI progress foundations; do not start AI plan generation yet.

## 2026-07-06 — Stack decision locked

Status: completed.

Decisions:
- Hosting: Vercel.
- App: Next.js App Router, React, TypeScript strict, Tailwind.
- Database: Neon Postgres.
- ORM/migrations: Drizzle ORM + Drizzle Kit.
- Auth: Better Auth, starting with Google OAuth only for the tester group.
- AI: Vercel AI SDK with a Gemini Flash-class model behind an adapter.
- Validation/guardrails: Zod plus deterministic server-side validation before persistence.

Rationale:
- Prioritizes free/low-cost personal use over fastest SaaS setup.
- Keeps data and auth tables in owned Postgres.
- Avoids Supabase platform features until storage/realtime/Auth are actually needed.
- Favors explicit TypeScript/SQL-shaped code that coding agents can modify safely.

Next iteration:
- Bootstrap the Next.js app in the repository.
- Add initial dependencies and scripts.
- Verify local build/lint/test where possible.

## 2026-07-06 — Next.js app bootstrapped

Status: completed.

Implemented:
- Bootstrapped Next.js 16.2 App Router with React 19, TypeScript strict, Tailwind CSS 4, and ESLint.
- Added stack dependencies: Drizzle ORM/Kit, Neon serverless driver, Better Auth, next-intl, Vercel AI SDK, Google AI SDK, and Zod.
- Added test tooling: Vitest, React Testing Library, jsdom, and Playwright configured for iPhone 14 Pro Max.
- Added Spanish-first mobile landing page at `/` with MVP navigation labels and every-set logging fields.
- Added locale constants and a unit test preserving Spanish default plus English support.
- Added Better Auth route scaffold at `/api/auth/[...all]` with Google OAuth enabled only when env vars are present.
- Added Drizzle schema for Better Auth core tables plus initial `athlete_profile` table.
- Generated initial Drizzle migration in `drizzle/0000_thankful_the_call.sql`.
- Added `.env.example` for local/Vercel environment setup without secrets.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes.
- `npm run build` passes.
- `npm run db:generate` created the initial migration.

Notes:
- `npm install` reports moderate transitive vulnerability audit warnings from the current dependency tree; no production code secrets were added.
- Playwright browsers were not installed or executed in this iteration.
- Real auth/database runtime requires Neon `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and Google OAuth env vars.

Next iteration:
- Create Neon project and Google OAuth credentials, then configure Vercel/local env vars.
- Run `npm run db:migrate` against Neon.
- Implement real Google sign-in UI and authenticated ownership helpers.

## 2026-07-06 — MVP release workflow selected

Status: completed.

Decision:
- Do not add a long-lived `develop` branch for the MVP.
- Use `main` as the always-releasable production branch.
- Use short-lived `feature/*` and `fix/*` branches for implementation work.
- Keep production and development data separate with distinct Neon database URLs.
- Vercel production env points to production resources; local and preview envs point to development resources.

Rationale:
- Reduces branch and release overhead for a personal-use-first MVP.
- Preserves the important safety boundary: no feature branch should use the production database.
- Keeps release simple: pass checks, merge to `main`, deploy to production.

Docs updated:
- Added `docs/architecture/release-workflow.md`.
- Linked the workflow from `README.md`.
- Updated deployment notes in `docs/architecture/technical-stack.md`.

Next iteration:
- Configure Neon production/development database URLs in Vercel and local `.env.local`.
- Confirm Google OAuth redirect URLs for localhost and production.
- Run the initial migration against the development database first.

## 2026-07-06 — Node version pinned

Status: completed.

Implemented:
- Added `.nvmrc` with Node `v24.18.0` to keep local agent/developer runtime consistent with the current project bootstrap.
- Updated local development instructions to run `nvm use` before installing or starting the app.

Notes:
- `next-env.d.ts` can be rewritten by `next dev` between `.next/dev/types` and `.next/types`; this generated change was reverted and should not be treated as a feature change.

Next iteration:
- Configure Neon production/development database URLs in Vercel and local `.env.local`.
- Confirm Google OAuth redirect URLs for localhost and production.
- Run the initial migration against the development database first.

## 2026-07-06 — Gap analysis corrective pass

Status: completed.

Validated and addressed the correctness-blocking documentation review before continuing M1/M3 work.

Implemented:
- Locked RIR as numeric `0 | 1 | 2 | 3 | 4`, where `4` displays as `4+` in the UI.
- Made pain thresholds authoritative: `pain >2` blocks aggressive progression, `pain >3` reduces/modifies/swaps, and `pain >=7` stops/avoids with professional-guidance copy if persistent.
- Added generated plan contract docs and runtime Zod schema in `src/plans/generated-plan-schema.ts`.
- Added seeded fallback plan in `src/plans/seeded-plan.ts` so AI failure does not block field testing.
- Added rule-based progression engine skeleton with tests for increase, pain hold, pain reduce/modify, and sharp rep drop.
- Added runtime environment parsing in `src/env.ts` and wired auth/db/AI provider config through it.
- Added Drizzle `$onUpdateFn` for `updatedAt` columns.
- Added athlete profile `timezone`, defaulting to `America/Costa_Rica`.
- Added Node/npm `engines` to `package.json`.
- Added GitHub Actions CI for lint, typecheck, unit tests, and build.
- Added Drizzle migration `drizzle/0001_safe_speed.sql` for the timezone column.

Docs updated:
- `docs/architecture/data-model.md`
- `docs/architecture/technical-stack.md`
- `docs/product/milestones.md`
- `docs/product/open-questions.md`
- `docs/product/progression-rules.md`
- `docs/product/session-logging-ux.md`
- `docs/specs/first-features.md`
- `docs/specs/generated-plan-contract.md`

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 3 files, 6 tests.
- `npm run build` passes.

Next iteration:
- Run `npm run db:migrate` against the development Neon database first.
- Confirm Better Auth Google callback locally.
- Implement real sign-in UI and authenticated ownership helpers.

## 2026-07-06 — Drizzle local env loading fixed

Status: completed.

Issue:
- `npm run db:migrate` failed because `drizzle.config.ts` read `process.env.DATABASE_URL` directly, while Next.js-style `.env.local` files are not loaded automatically by Drizzle Kit.

Implemented:
- Updated `drizzle.config.ts` to load `.env.local` or `.env` with Node `process.loadEnvFile()` before reading `DATABASE_URL`.
- Added a clear error if `DATABASE_URL` is still missing.
- Updated README migration instructions to note that `.env.local` is used.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run db:migrate` applied migrations successfully against the configured Neon database.

Next iteration:
- Confirm Better Auth Google callback locally.
- Implement real sign-in UI and authenticated ownership helpers.

## 2026-07-06 — Google sign-in UI and ownership helpers

Status: completed.

Implemented:
- Added server auth helpers for Better Auth session lookup, required-user redirects, and Google OAuth configuration checks.
- Replaced the placeholder landing CTA with a working Google sign-in client button.
- Added signed-in/signed-out home shell behavior with active-session copy and sign-out support.
- Added privacy-preserving ownership helpers to assert/filter user-owned resources before future profile queries.
- Added unit coverage for ownership helper behavior.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 4 files, 9 tests.
- `npm run build` passes.

Next iteration:
- Confirm Better Auth Google callback locally with the configured Google OAuth credentials.
- Start the athlete profile foundation behind authenticated ownership checks.

## 2026-07-06 — Authenticated athlete profile foundation

Status: completed.

Implemented:
- Added authenticated `/perfil` onboarding page for the core athlete context fields.
- Added server action to validate and save the current user's athlete profile.
- Added profile repository helpers that query by authenticated owner and assert ownership before returning/updating records.
- Added Spanish-first profile validation defaults for 5 days/week, 60-minute sessions, hypertrophy, mobility/fat-loss secondary goals, aggressive pain-aware progression, and Costa Rica timezone.
- Linked the home shell Perfil nav item to the authenticated profile route.
- Added unit coverage for profile parsing defaults and temporary note composition for limitations/priorities until dedicated tables exist.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 5 files, 11 tests.
- `npm run build` passes.

Next iteration:
- Confirm Google OAuth end-to-end locally and create/update a tester profile through `/perfil`.
- Add dedicated persistence for limitations and muscle priorities, or continue with baseline working-weight intake if the profile flow is sufficient for M1 testing.

## 2026-07-06 — Dedicated profile details persistence

Status: completed.

Implemented:
- Added Drizzle tables and migration for `limitation` and `muscle_priority` records tied to `athlete_profile` with cascade deletes and profile indexes.
- Updated `/perfil` to load and preserve existing limitations/priorities from dedicated rows instead of folding them into general notes.
- Updated profile save logic to replace the current profile's limitations/priorities from one-item-per-line text areas.
- Kept conservative MVP defaults for structured fields: unknown limitation side/body region, moderate severity, pain tracking required, high muscle priority, and no side focus.
- Updated data model docs with the MVP line-based input behavior.
- Added unit coverage for multiline normalization.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 5 files, 11 tests.
- `npm run build` passes.
- `npm run db:migrate` applied `drizzle/0002_simple_wolf_cub.sql` successfully against the configured Neon development database.

Next iteration:
- Confirm Google OAuth end-to-end locally and create/update a tester profile through `/perfil`.
- Start baseline working-weight intake with kg, reps, sets, RIR, pain score, notes, and unilateral left/right support.

## 2026-07-06 — Baseline working-weight intake

Status: completed.

Implemented:
- Added `exercise` and `baseline_lift` Drizzle tables with a migration for the MVP baseline catalog and onboarding working weights.
- Added authenticated `/baseline` page linked from the home shell.
- Added Spanish-first baseline form for the suggested key exercises with bilateral and unilateral left/right rows.
- Added server action/repository logic to require an athlete profile, lazily upsert the suggested exercise catalog, and replace the tester's current baseline entries.
- Added deterministic validation requiring at least one completed baseline row while allowing individual exercises to be skipped.
- Enforced complete baseline rows: kg, reps, sets, numeric RIR 0-4, pain score 0-10, side, and optional notes.
- Added unit coverage for baseline parsing, required pain/RIR, skipped exercises, and unilateral left/right data preservation.
- Updated data model docs with the MVP exercise catalog and baseline intake behavior.

Verification:
- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test` passes: 6 files, 14 tests.
- `npm run build` passes.
- `npm run db:migrate` applied `drizzle/0003_silky_stark_industries.sql` successfully against the configured Neon development database.

Next iteration:
- Confirm Google OAuth end-to-end locally and create/update tester profile + baseline through `/perfil` and `/baseline`.
- Add body measurement tracking with left/right thigh/calf gaps and history preservation.
