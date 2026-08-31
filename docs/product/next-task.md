# Next Task

Short and rolling: what is immediately next. **For where the project is and what constrains a new feature, read `docs/product/project-status.md` first.** For how any past decision was reached, `docs/product/implementation-log.md` is the source of truth.

## Status: an athlete can now correct their own mis-filed history (#10 closed), and there is a privacy page. Deployed `95iza6p83`.

**Reassign / swap a logged exercise**, on a completed session. Confirmed working by the athlete on real data. Move it onto an exercise with nothing logged, or **swap** with one that already has sets — the two trade their work, which is how a whole day's mis-filed values get corrected pair by pair. Repeated swaps reach any arrangement.

Shipped once wrong, and real use corrected it: the first version refused any target that already had sets, and every candidate she saw was refused, because the reorder bug had shifted a whole day one position so nothing was ever empty. Worth remembering as a pattern — the guard was solving the right problem (double-counting) the wrong way.

**Privacy page** at `/privacidad`, static and readable without signing in.

**Adding a missing set to a finished session** also shipped, closing the gap the swap exposed: after a swap an exercise can end with no sets, and she hit that on "Fondos en máquina". Editing and deleting were already allowed on a completed session, so adding was the missing third. Prefilled from the plan's targets, since the case is an exercise with nothing to copy from, and the set lands in the session's own week rather than today's — `/progreso` buckets by `session.completedAt`, not the set's timestamp.

**Athlete B can now fully repair her own history**: swap the mis-filed pairs, then add whatever a swap leaves empty. The only thing still beyond reach is work whose exercise no longer exists in her plan.

**Still unverified in a real browser:** the finish screen, the reassign panel and the privacy page have all shipped without a 390px pass. jsdom does not measure geometry and this repo has been caught by that twice.

**Open issues:** #1–#8 are the physiotherapy review (pain prompting, limb symmetry index, RIR calibration, increment quantization, mobility outcome measures, weekly load guardrail, bursitis re-entry). #9 is English.

**Known data issue, unchanged:** Athlete B's pre-2026-08-30 history is still corrupted and she chose to keep it and correct it by hand — which is now possible for anything a swap can fix. Sets whose original exercise no longer exists in her plan (Plancha lateral, the day-1 finisher) still have nowhere to go until those exercises are added back. Inventory and unrun repair SQL live in `~/jcvalerio/dev/github/reserva-data-notes/`, outside this public repo.

## Prior status: the plan-reorder data bug is fixed, Sentry is live, and the finish screen shipped (`fde3810`, deployed `4aos44tco`).

Three things landed together, and two of them were the same bug.

**A user could not open a session** — `/entrenar` → Continuar died with "This page couldn't load". **Root cause:** `saveDraftSession` matched existing `exercisePrescription` rows **by position**, so reordering exercises in the builder rewrote a row in place while its `exerciseLog` history stayed pointed at it. `getPreviousPerformance` filters on `exerciseNameEs`, so one exercise's history answered to another's name — and when a strength and a duration exercise swapped, a row typed `"strength"` ended up owning sets with null weight/reps/RIR, which threw inside a client component and blanked the page. The form now round-trips each row's `prescriptionId` (`planPrescriptionWrites`, pure, 10 tests); reordering changes only `orderIndex`.

**Sentry is live**, with source maps — it turned `at ad (0zsaoe4nar2uk.js:40:55721)` into `workout-repository.ts:41`. Health data is scrubbed in three layers and verified against a real captured payload, which caught a leak the config alone did not: the navigation breadcrumb was carrying the query string under `{ from, to }`. Cost measured: **+63.4 KB brotli**, on every page. Deliberately not lazy-loaded — deferring init past hydration would have missed this exact crash.

**The finish screen** (`/entrenar/[sessionId]/finalizar`) — see the newest implementation-log entry.

**Now worth checking on your phone**, in this order:

1. **The finish screen has never been opened in a real browser.** jsdom does not measure geometry and this repo has been caught twice. Check tap targets, the unfinished list with a long exercise name, and horizontal overflow at 390px, then Cancelar → confirm you land back on the exercise you left.
2. **Reorder two exercises in the plan builder** and confirm the definitions move with the names — sets, reps and RIR should follow the exercise, not stay at the position.
3. Open `/progreso`. Athlete B has five prescription rows carrying misattributed sets; the guards mean these are skipped, not thrown on, but the charts will have gaps.

**Known data issue, deliberately left in place.** Athlete B's pre-2026-08-30 history is corrupted by the reorder bug — 18 structurally-detectable sets, plus an unknown number of strength-to-strength swaps that **no query can find** (she confirmed Fondos recorded at 5–7.5 kg when she pressed 40). She chose to keep the records and correct them by hand. Full inventory, the 18 set ids, and the unrun repair SQL are in `~/jcvalerio/dev/github/reserva-data-notes/` — deliberately outside this public repo, since it is one athlete's real training data.

**That plan depends on a feature that does not exist yet.** There is no in-app way to reassign a logged exercise; today the only option is deleting each set and re-entering it. Filed as **issue #10**, and it is the highest-value next build: the operation is a single `exercise_log.exercise_prescription_id` update (the sets hang off the log and travel with it), it makes this whole class of mistake self-serviceable, and a real person is currently blocked on it.

**Open issues:** #1–#8 are the physiotherapy review (pain prompting, limb symmetry index, RIR calibration, increment quantization, mobility outcome measures, weekly load guardrail, bursitis re-entry). #9 is English. #10 is the reassign feature above.

## Prior status: two `/entrenar` fixes are shipped and deployed (`7b56686`) — scroll-on-exercise-change, and an end-of-session action that can't be hit by accident (plus `Reabrir sesión`).

Reported live, mid-workout. Both were geometry problems, not styling ones. Full detail in `implementation-log.md`; the short version:

- **Tapping "Siguiente ejercicio" now lands you on the exercise**, not at the bottom of it. Measured before/after in a real browser: the heading moved from y = −813 to y = 116, and takes focus.
- **"Completar entrenamiento" is gone as an always-present submit.** It was the largest tap target on the screen for an irreversible, unconfirmed action — and the cluster it sat in moved under your thumb without you doing anything (rest timer unmounting, disclosure collapsing, logging form collapsing; WebKit has no scroll anchoring). Now low-emphasis text that only *reveals* a confirm panel carrying RPE + notes.
- **`Reabrir sesión`** on the completed summary. Completion was a one-way door, and worse than annoying: restarting made one workout count as two in every `/progreso` verdict.
- **A sticky `3/7 · nombre` rail**, funded by hiding the brand chrome row on this route.

**Now worth checking on your phone**, since real iOS Safari is the one thing the pre-deploy browser check could not exercise (it ran headless Chromium, and the root cause — no scroll anchoring in WebKit — is Safari-specific): open a session, log a set, and tap `Siguiente ejercicio` from the bottom. Confirm you land on the new exercise's title, and that the sticky `3/7 · nombre` rail reads correctly with a long exercise name.

**Two things worth knowing:**

1. **`workout_session` has no unique constraint on one active session per template**, and `startOrResumeWorkoutSession` picks the first row with no `ORDER BY`. `reopenSessionAction` refuses rather than risking two active rows. The partial unique index is the real fix, but it is a migration that will fail if production already has duplicates — **check production for duplicate active rows before writing it.**
2. **The repository layer has no tests at all** (no `workout-repository.test.ts`, no DB-mocking harness — every test in this repo is on pure functions), so `reopenWorkoutSession` and its guard are covered only by the component tests around them.

**Deliberately deferred:** the `/entrenar/[sessionId]/finalizar` review screen — "5 de 7 ejercicios completos" plus a tappable list of unfinished exercises, which the inline panel can't offer. Worth building if the inline confirm still feels thin after real use. It needs `?ejercicio=<id>` + an `initialExerciseId` prop, or Cancelar drops you on the wrong exercise.

## Prior status: the `/progreso` rebuild is complete — all three reports plus both structural cleanups. Committed (`5408da2`, `18edd45`, `c70a942`).

The screen now reads: KPI row → **¿Está funcionando?** → Ejercicios que más mejoraron → Tendencia corporal → Series por grupo muscular → Equilibrio → Dónde te ha dolido → Ejercicios por grupo muscular → Consistencia semanal → Sin clasificar → Historial.

What changed and why, in one line each — full detail in `implementation-log.md`:

- **¿Está funcionando?** crosses weekly sets (input) with per-exercise progression (output), which the page had both of and never joined. Five verdicts, each with a *different* correction.
- **Lifts read as weight × reps** ("60kg × 8 → 60kg × 10"), never volume-load kg or estimated 1RM — the two numbers reported as unreadable.
- **RIR per muscle group** splits "Estancado" into its two opposite fixes: far from failure → push closer; already at failure → deload.
- **"Mejoras recientes" deleted** — it was the third rendering of one comparison. Asymmetry survives in the per-exercise chart.
- **Volume card split**; pain opens itself when a set crossed the progression gate rather than hiding behind a fixed collapse.
- **Tendencia corporal promoted** as the outcome check, stating its own 8–12 week timescale.

## Up next — this is now a data question, not a code one

**Use it for a few real weeks before building anything else here.** The verdicts are only as good as the logged history behind them, and the dev DB's `demo-seed-` rows do not resemble production. Specifically worth checking on real data:

1. Do the verdicts read true? A group marked *Estancado* that you know is progressing means an exercise is attributed to the wrong muscle group.
2. Do the reference bands feel right once four real weeks are in? `project-status.md` already flags that if the averages read as discouraging, change the copy around the band rather than the numbers.
3. Does your logged RIR match what you actually feel? A "Lejos del fallo" chip on something you take close to failure is worth knowing on its own.

Still unbuilt from the original review, deliberately: **the Resumen / Músculos / Historial tab split.** It was ranked below everything above because the content fixes had to land first — a tab shell around unreadable numbers would have solved nothing. Worth reconsidering only if the page still feels long after real use.

## Prior status: the post-workout recap now includes a personal-record banner, backed by a real all-time-best query.

`getPriorStrengthInstancesForNames` fetches every prior completed instance (uncapped) of this session's exercises; `findPersonalRecords` checks this session's volume and estimated 1RM against the true max across all of them, not just the last session. Closes the one piece the recap explicitly deferred when it shipped. Full detail in `implementation-log.md`.

## Prior status: an honest post-workout recap opened the completed-session summary on `/entrenar/[sessionId]`.

Duración/Series/Volumen KPI tiles plus "N de M ejercicios mejoraron vs. tu sesión anterior", reusing `buildExerciseImprovements` verbatim. Full detail in `implementation-log.md`.

## Prior status: the body-map thumbnail shows everywhere `PlanDayPager` renders — `/plan/builder`, `/plan/rutina`, `/plan/historial`, and `/plan/templates`.

`/plan/historial` classifies the same way `/plan/rutina` does (real `ExercisePrescription` rows, catalog-link-then-name). `/plan/templates` classifies by name only — templates are static in-memory plan definitions with no `exerciseId` link, so there's nothing to batch-query. Full detail in `implementation-log.md`.

## Prior status: plan-builder body-map thumbnail shipped — the third and last of the three Hevy-inspired ideas. All three are now live.

Each day card in `/plan/builder` now carries a tiny front/back silhouette showing which muscle groups that day's exercises train, shaded binary (trained/not) rather than by volume — a draft day has no logged sets to weigh by. Reuses `/progreso`'s vendored body-map artwork and its catalog-link-then-name classification order rather than a second implementation. Full detail in `implementation-log.md`.

## Prior status: estimated 1RM shipped as a third progression-chart metric — the second of the three Hevy-inspired ideas.

Reused the existing RIR-adjusted Epley estimate (already computed for "Mejoras recientes") per-instance so `/progreso`'s per-exercise chart can plot it alongside Peso/Volumen. A session where every set falls outside the reliable rep range is a real gap (skipped in the line, or an explanatory message when no instance qualifies at all) — never plotted as zero. Full detail in `implementation-log.md`.

## Prior status: "Ejercicios que más mejoraron" shipped and deployed — the first of the three Hevy-inspired ideas.

A ranked list of improved exercises with a real percentage, above the KPI row. Along the way, found and fixed the same grid-track-overflow bug class (from earlier today) recurring in four more places on `/progreso` — same pattern confirmed in ~17 other files app-wide, flagged as an unscheduled follow-up rather than fixed opportunistically. Full detail in `implementation-log.md`.

## Prior status: plan builder's collapsed exercise summary no longer truncates or gets squeezed — shipped and deployed.

Reorder/delete buttons now only share a row with the small eyebrow label; the exercise name and stats line each get the card's full width on their own line. Full detail in `implementation-log.md`.

## Prior status: a third progreso layout fix (long muscle-group labels wrapping) shipped and deployed, plus a Hevy-inspired design-ideas proposal for plan builder and progreso — awaiting your pick of which idea to build first.

The label fix: same row as the delta-wrapping fix, different cause — a fixed 112px column couldn't fit "Abductores y aductores." Moved the label to its own line above the bar. The design proposal (published as an artifact) recommends, in order: a Top Exercises list replacing the emptiest KPI tile, E1RM as a third progression-chart metric, and a body-map thumbnail on plan-builder day cards — all three reuse data/components already in the codebase, no new dependencies. Skip list: achievements/badges, half-point RIR, exercise-thumbnail carousel. Full detail in `implementation-log.md`.

## Prior status: two layout bugs fixed (plan builder horizontal scroll, progreso delta wrapping) — shipped and deployed. A broader design review of both screens, using real reference apps, is next.

Root-caused both in a live browser, not just from code: the plan-builder scroll was `content-visibility` (closed `<details>`) leaking width into an unconstrained `grid`'s intrinsic sizing; the progreso delta wrap was a fixed-width span with no `whitespace-nowrap`. Full detail in `implementation-log.md`.

## Prior status: plan builder blocked-removal now actually resolves, and the error toast floats — shipped and deployed.

The crash fix below only made the failure visible; it didn't give her a way through it. She tried working around it via `/entrenar` (deleting the logged sets directly), which turned out to be structurally impossible — deleting a set never touches the `exerciseLog` row that's actually blocking the removal, and that row survives even at zero sets. The session editor now shows exactly which exercise(s) are blocked, with real set counts, and a confirmed "delete anyway" action that removes the history and the exercise together. The error banner also now floats above the bottom nav instead of sitting at the top of a long scrolled-past form. Full detail in `implementation-log.md`.

## Prior status: plan builder crash fixed — shipped and deployed.

Deleting an exercise with real logged history in `/plan/builder` and saving threw a bare HTTP 500, reported from production minutes after it happened. `saveDraftSession` already refused the delete and already had a readable message for it — the message just never reached the user because `saveSessionAction` didn't catch it. Now redirects to a clear banner instead. Root cause was reproduced directly against the dev DB, not just read from code, before writing the fix. Full detail in `implementation-log.md`.

## Prior status: `/entrenar` set-logging fixes and the plan builder redesign — both shipped and deployed.

Three complaints reported live, mid-workout: on `/entrenar`, logging a set gave no way to tell whether you'd hit the suggested RIR, unilateral exercises read as showing only one leg, and "última vez" only ever surfaced one set from a fully-loaded prior-session history. On `/plan/builder`, the reorder arrows had no visible label next to a destructive "Eliminar", and every field of every exercise stayed expanded with three permanent helper paragraphs, so editing a session meant scrolling through a wall of text. Both were fixed the same way: an independent UX/UI review and a Principal-Mobile-Engineer review, written blind to each other, then a synthesis and implementation once they converged. Full detail in `implementation-log.md`.

Deploy was held for roughly 15 minutes for an in-progress workout session before going out, per the constraint below.

## Prior status: plan editing unblocked — shipped and deployed.

**Editar mi plan** silently did nothing in production for whoever had a leftover draft, because a draft blocks the edit and nothing on any screen said so — `/plan` dropped the `?error=` on the floor, and the only route to the builder that could clear the draft was labelled "Crear mi propio plan". `/plan` now names the draft, links to it, and reports why the action failed; `/plan/historial/[planId]` no longer dead-ends on a draft.

Note for whoever hits something like this again: the discard button already existed at `/plan/builder` the whole time. The bug was navigation and silence, not capability — reaching that URL directly was the fix on the pre-deploy build.

Open decision: should **Editar mi plan** *adopt* an existing draft instead of refusing? Left as a refusal on purpose — auto-discarding someone's unfinished work to unstick a button is data loss, and adopting it is a product call. The refusal is at least visible now.

## Prior status: `setLog.painLocation` — shipped, deployed and committed (`e671424`).

Logging a set with pain above 0 now asks **where it hurts**: the seven joints, plus "Muscular (agujetas)" and "Otro". Below 0 pain nothing appears, so the normal flow is unchanged. `/progreso` states located pain plainly and marks older sets "(estimado)", since those can only be inferred from the joints an exercise loads.

Thresholds are untouched on purpose: pain > 2 still blocks aggressive progression even when it is ordinary soreness. Deciding whether that should change is what this column makes answerable — with evidence rather than a guess.

## Prior status: period views on Series por grupo muscular — shipped, deployed and committed (`3485611`, `f2af442`).

`/progreso`'s volume section now has four pills: **Esta semana · Semana pasada · 4 semanas · Todo**. "Semana pasada" exists because early in a week the current view is nearly empty and the averages smooth the last week away — there was no way to see how the week you just finished actually went. The multi-week views show the **average sets per week**, not a period total — a total sits several times above the weekly reference band and would read as healthy while you were undertrained. On the dev data, pecho reads 6 this week but averages 1.5/week against a 10–20 band; that gap is the reason the selector exists, and it is invisible from the weekly number alone. The body map follows the same period as the bars.

## Prior status: the exercise taxonomy and a rebuilt `/progreso` — shipped, deployed and committed (`6aa8e19`).

**All five feedback items are now done in code.** Item 5 turned into something bigger than the original ask, because you reframed it: rather than only regrouping the dashboard, you decided to add the muscle-group taxonomy the project had declined twice before, so the app could produce real reports.

What that bought, in order of value:

1. **Series por grupo muscular** is the new headline on `/progreso` — weekly effective sets per muscle against a reference range. It's the number a coach actually reads for muscle gain, and crucially it's meaningful at *one* logged session per exercise, which is the data you actually have. The old blocker ("no exercise has two data points, so every trend line is a single dot") no longer decides what the page can show.
2. **The dropdown is gone.** Exercises are grouped by muscle group; tapping one opens the same progression chart as before. The chart was never your complaint, so it survives intact.
3. **Push:tirón and cuádriceps:femorales ratios**, and **pain grouped by joint** — the physio half. You log a pain score on every set and until now it was only ever visible per exercise.
4. The app can finally tell when a substitution changed the muscle worked. Your real swap — *Pantorrilla sentada unilateral* replacing *Press inclinado en máquina* — is exactly the case it couldn't see before.

**Your "Core" ×5 is now five specific exercises**, one per day, chosen against each day's load: Crunch en máquina (días 1 and 2), Pallof press en polea (día 3 — antirotation after the hinge day, instead of more loaded flexion), Elevación de rodillas en paralelas (día 4), Plancha lateral (día 5). Día 3's two logged sets get relabeled, which you approved.

**One honest consequence:** splitting Core removed the only exercise that had two completed instances, so until the rotation repeats, "Mejoras recientes" will be empty and every progression line is a single dot. The split revealed that rather than caused it — those two instances were never the same exercise — and it's exactly why weekly volume leads the page now.

**Now worth checking against your real production data**, since that's the whole point of shipping it: open `/progreso` on your phone and confirm the volume numbers, the body map, and the grouped exercise list read correctly for you — and ask Athletes B and C whether anything looks wrong in theirs, since the Core rename reached their plans too if those are clones of yours. Anything the catalog didn't recognise will show up in the visible "Sin clasificar" disclosure rather than failing quietly.

Note the production `DATABASE_URL` is now marked Sensitive in Vercel, so it can no longer be pulled for a direct `psql` check — the URL has to come from the Neon console if you want one.

**The dev database now contains synthetic history, deliberately kept.** Two prior weeks (Mon 2026-07-20 and Mon 2026-07-27, 7 sessions / 65 sets) were seeded so the week-over-week deltas and the per-exercise progression charts have something to render against — before it, everything was a single dot. **Every synthetic row has a `demo-seed-` id prefix**, nothing else was touched, and removal is one cascading statement:

```sql
DELETE FROM workout_session WHERE id LIKE 'demo-seed-%';
```

It exists **only on the Neon development branch**. Production has its own branch, so it does not and cannot travel with a deploy. Treat any `demo-seed-` row as scaffolding, never as real training history — the four real sessions are the ones without that prefix.

Migrations `0018`, `0019`, `0020` are applied to dev; production applies them automatically during the Vercel build. 29/29 of your prescriptions classify, none "Sin clasificar". `lint`/`typecheck`/`test` (396)/`build` all green.

## Up next

**Nothing is blocked or urgent.** All five user-feedback items and every milestone deliverable through M6 are shipped. Candidates, in rough order of value — the reasoning for each is in `project-status.md`:

1. ~~A `painLocation` column on `setLog`.~~ **Shipped 2026-08-09** (`e671424`). Logging pain above 0 now asks where, separating ordinary soreness from joint pain. It deliberately does not yet change the progression thresholds — **that is the next decision**, and it needs real logged pain to make responsibly. Every set to date carries pain 0.
2. **Use the dashboard for a few real weeks, then re-read the reference bands.** If the averages read as discouraging with genuine data, change the copy around the band rather than the numbers.
3. **Read what is already written**: `workoutSession.notes` and `musclePriority` are captured and never surfaced.
4. **M6's remaining acceptance** is field validation, not code: two weeks of real use per tester, friction documented, then the decision on web vs offline vs native.

Also open, user-side: check the raised text sizes and the ± stepper values on a real iPhone.

## Constraints that still apply

- No AI plan generation — plans are manual only (template catalog + builder). Not a gap to fill; it's the actual product direction now.
- Spanish-first UX; English support (`nameEn`/`notesEn` fields, `locale: "en"`) must not be removed even though it's currently unused — flagged, not touched.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain >=7 flags stop/professional-guidance.
- Run before commit: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
- Update `docs/product/implementation-log.md` with outcome and next step after each change.
- Avoid deploying (migrations run automatically as part of the Vercel build) while a workout session might be actively in progress.
