# Next Task

## Status: exercise substitution + the bigger reading type scale — shipped, deployed and committed (`ffe3197`).

Both live at `https://gym.jcvalerio.com`. Migration `0017` (two nullable columns on `exercise_prescription`) verified applied in production, and the new type scale confirmed in the production CSS with headings untouched. Deployed while your Día 4 session was active — that's normally the stop condition here, but you confirmed you were on `localhost:3000`, which a production deploy can't interrupt, and the migration was additive with no backfill.

**Four of the five feedback items are now done.** Only item 5 (the `/progreso` dashboard) is left, and it's still waiting on data — see below.

Worth doing on-device: check the new default text sizes on your real iPhone, since the original complaint was about on-device readability. The ± stepper values are worth a glance in the same pass.

## Prior status: set correction (edit + delete) and the iOS text-zoom fix — shipped, deployed and committed (`a7c27a9`).

Two of the five user-feedback items: correcting a logged set (feedback items 1 and 2) and the small-font/accessibility fix (item 4). `lint`/`typecheck`/`test` (331 passing)/`build` all green. Migration `drizzle/0016_sharp_screwball.sql` (one additive, nullable `set_log.updated_at` column) is applied — verified present in the DB after deploy, not assumed. Both fixes confirmed live in production: the served HTML emits `width=device-width, initial-scale=1` with no `maximum-scale`, and the production CSS carries the `.input-stepper` fix.

You've already used this for real — the two sets edited on "Press de pecho en máquina" during the Día 2 session are yours, not test data.

You can now tap "Editar" on any logged set — in the live session *and* in the completed-session summary — to correct weight/reps/RIR/pain/notes in place, or delete it behind a confirm step. A corrected set shows a subtle "· editado" marker. "Logged it against the wrong exercise" is fixed by deleting it and re-logging under the right one, using the runner's existing Anterior/Siguiente navigation.

See the 2026-08-09 implementation-log entry for the full reasoning, including: the trainer/physio verdict that the *inability* to edit was itself the safety defect; a real duplicate-`setNumber` bug the delete path would have introduced (caught and fixed with `renumberSets` before any UI existed); and **a genuine pre-existing bug found during live verification** — the ± stepper fields have been clipping their own values since they shipped, so the main logging form was rendering "40" as a sliver of "4", fixed here for both forms.

**Follow-up in progress (not yet deployed or committed): bigger reading text by default.** You confirmed pinch-zoom works on the iPhone but pointed out you wanted defaults that are easier to read at 47+, not just the ability to zoom — correct, and the zoom fix alone didn't deliver that. Coaching notes went 12px → **14px**, body copy and lead paragraphs 14px → **16px**, `text-base` 16px → 17px, via a single `@theme` override in `globals.css`. Exercise names and page titles are **unchanged**, per your call that they already read fine. This also surfaced and fixed a regression it would otherwise have caused: at 16px the weight field started clipping at "62.5" — the exact half-kilo values `suggestNextWeightKg` produces — traced to the browser reserving ~23px for a native number spinner that's redundant next to the app's own ± buttons. All gates green; verified live. Still to consider separately: the bottom-nav tabs and a few uppercase labels use hardcoded ~10.4–10.9px sizes a theme override can't reach.

**One thing still open — only you can do it:** a real-iPhone check for item 4. Turn up Settings → Accessibility → Display & Text Size → Larger Text and confirm the app's text actually enlarges, that pinch-zoom works, and that the fixed bottom nav doesn't break while zoomed. The production HTML now emits `content="width=device-width, initial-scale=1"` with no `maximum-scale`, and Tailwind's utilities are already `rem`-based — but Playwright can't observe iOS's own text-scaling behavior. Worth checking the ± stepper fix on-device in the same pass, since the numbers were previously clipped there too.

## Also done: item 3 — substituting an exercise

Tap "Cambiar ejercicio" on any exercise you haven't finished, pick a reason (máquina ocupada / dañada / no me sentí bien / otra), then either reuse an alternative you've used before, type the machine you actually used, or pick something already in your plan. The replacement inherits the original's whole prescription — same sets, reps, RIR, rest, and classification — so it tracks progression properly from its first set, and the app lands you on it straight away.

Two things worth knowing about the design: your day **doesn't grow** — alternatives stay linked to the exercise they replace and only appear in the session you actually chose them in (`/entrenar` still says "6 ejercicios" for Día 5, and `/plan/rutina` doesn't show them at all) — and swapping to the same machine again **reuses** the same exercise, so its history stays continuous rather than fragmenting.

A finding changed the scope mid-way and is worth remembering: all 28 exercises on your plan carry the same placeholder `["Máquina equivalente", "Cable equivalente"]`, so the "curated options" idea was hollow — and would actively have corrupted history, since progression is matched by exercise *name* across your whole profile. See the 2026-08-09 implementation-log entry.

The plan picker inside the swap panel is a collapsed list of your own exercises, not a native dropdown — the native one rendered an unstyleable full-height popup over the panel on desktop, and worse, it reset itself to its placeholder after every pick so the tap looked like it had done nothing.

Not done deliberately: plan previews omit alternatives rather than listing them under their original, and the templates' generic placeholder lists are untouched (rewriting them with real per-exercise alternatives is a content pass you declined for now).

## Up next: the last feedback item

- **Item 5 — a better `/progreso` dashboard** (its own session, and worth waiting on). Deferred on evidence, not size: **zero exercises currently have 2+ completed instances**, and a progression line needs 2 points, so a grouped/combined dashboard would render essentially empty today and couldn't be verified against real data. Two of the three candidate grouping axes also don't hold up — grouping by day template isn't a partition ("Core" appears in all 5 days, "Extensión de tríceps" in 2, while `toExerciseSeriesGroups` groups by name across all history), and `loadMechanism` is `machine` for all 28 exercises on the real plan, collapsing that axis to compound-vs-isolation. Grouping "by muscle group" as literally asked would reopen the taxonomy decision this project has explicitly declined before — your call, not a quiet schema addition.

The full kickoff prompt with all five items is still at `docs/product/user-feedback-kickoff-prompt.md`.

## Prior status: "Ver técnica en YouTube" tap target — shipped, deployed and committed (`8459052`).

A minimalistic YouTube search-handoff icon next to every exercise name (session-runner's live and completed views, all plan-preview pages, the builder). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` and `/guia` HTTP 200, `/entrenar` and `/plan/rutina` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do). No active workout session at deploy time (confirmed via a direct DB check).

See the 2026-08-05 implementation-log entry for the full placement/scope/query-content design decisions (all confirmed via `AskUserQuestion`) and verification detail, including a real methodological mistake caught and fixed mid-session (a stale commented-out `DATABASE_URL` line in `.env.local` was silently winning over the active one in every `export $(grep ... | xargs)` DB check used in prior sessions too — worth using `grep '^DATABASE_URL='` instead going forward).

User confirmed on a real iPhone that the universal-link handoff to the installed YouTube app works as expected — nothing left open on this feature.

## How the user-feedback batch was originally framed (items 1–4 are now done — see the top; only item 5 remains)

Five separate pieces of feedback from real training sessions: no way to correct a logged set's weight/reps after saving it, no way to fix a set logged against the wrong exercise, no way to swap to a different exercise mid-session (broken/busy machine, not feeling it) or add an ad-hoc one, small fonts that don't respect the phone's accessibility text-size settings, and a `/progreso` dashboard that only shows one exercise's chart at a time via a dropdown instead of a combined or grouped view. A full kickoff prompt is saved at `docs/product/user-feedback-kickoff-prompt.md` — hand that whole file to a new session to start it. It already contains real grounded findings from a codebase investigation (not just the raw feedback): logging is genuinely insert-only today (no update/delete path exists anywhere), `substitutionOptionsEs` already exists in the schema but is barely used, the small-font complaint traces to a concrete one-line cause (`maximumScale: 1` in `layout.tsx` blocking pinch-zoom and Safari's per-site text-size control), and the "group by muscle group" dashboard ask directly reopens a muscle-group-taxonomy decision this project has explicitly declined before — with real zero-new-schema alternatives already identified. Structured as four reconciled role passes (personal-trainer/physiotherapist judgment first, then mobile UX, then principal engineering) with real forks flagged for `AskUserQuestion`, and explicitly scoped to ship incrementally rather than all five in one sitting.

## Prior status: bonus-set logging + the `/guia` RIR/AMRAP/progression-math page — shipped, deployed and committed (`f039f89`).

Both pieces from this session bundled into one commit per this project's established pattern for stacked undeployed work. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` and the new `/guia` HTTP 200, `/entrenar` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do). No active workout session at deploy time (confirmed via a direct DB check — the account's only recent session was already `completed`).

See the two 2026-08-03 implementation-log entries below for full detail on what shipped: a real strength-coaching judgment on letting a set exceed the plan (yes, with the progression math no longer letting a bonus set contaminate the planned-set signal), and a `/guia` reference page explaining RIR, AMRAP-to-failure, and that same math — linked from a persistent Home card and contextually from `/entrenar`'s progression suggestion.

Flagged, not acted on: mid-session, the real account's "Prensa unilateral" exercise picked up 7 real sets and its session moved to `completed` — reads as the user's own concurrent real workout, left entirely untouched.

## Prior status: a single standard back-navigation pattern across the whole app — shipped, deployed and committed (`9c2c550`).

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
