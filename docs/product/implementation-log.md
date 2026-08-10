# Implementation Log

Living checkpoint for small iterations. Update this after every task iteration so the project can be paused and resumed with context.

## 2026-08-09 — Deployed and committed the exercise taxonomy and the rebuilt /progreso

Status: shipped. Committed as `bfdd8fb` on `main` (`feat: add an exercise taxonomy and rebuild /progreso around it`) — 43 files, one commit covering all seven phases plus the mobile-UX pass, per this project's pattern for stacked work. Deployed via `npx vercel deploy --prod --yes`; live at `https://gym.jcvalerio.com` (`/` and `/guia` HTTP 200, `/progreso` and `/entrenar` 307-to-auth). Adds one runtime dependency, `lucide-react`.

Deployed with **no** workout session active — the Día 4 session that had been open all day was completed by the user at 18:27 local while reviewing the dashboard, and `status = 'active'` returned zero rows immediately before deploying.

**Migrations verified indirectly, and this is a change from previous deploys worth recording.** `vercel.json`'s `buildCommand` is `npm run db:migrate && npm run build`, so the build only runs if the migration exits 0 — the deployment being live and serving the new `/guia` volume section proves `0018`, `0019` and `0020` applied to the production branch. What could **not** be done this time is the direct `psql` confirmation earlier entries used: the production `DATABASE_URL` is now marked **Sensitive** in Vercel, so `vercel env pull` returns the literal string `[SENSITIVE]` rather than the URL. Anyone wanting the direct check (`select count(*) from drizzle.__drizzle_migrations` should be 21, and `exercise_prescription.exercise_id` should exist) needs the URL from the Neon console. Worth knowing before planning the next schema-carrying deploy.

**What this deploy does to the other two accounts.** `0019` renames prescriptions named "Core" keyed on `day_index` across every plan, not scoped to a profile — that is the only form that works across branches where ids differ, and it deliberately reaches clones of the user's plan in Athlete B's and Athlete C's accounts. Confirmed with the user beforehand. Día 5's flip to duration type stays guarded by "has no logged sets", so it cannot rewrite anyone's history; at worst it no-ops. Any exercise the seed map does not recognise backfills as NULL and shows in the visible "Sin clasificar" disclosure rather than failing.

**The dev database now carries synthetic history on purpose.** Two prior weeks (7 sessions, 65 sets, all ids prefixed `demo-seed-`) were seeded so the week-over-week deltas and the progression charts have a baseline — before it, every chart was a single dot and the deltas rendered nothing. It lives only on the Neon development branch and cannot travel with a deploy. `DELETE FROM workout_session WHERE id LIKE 'demo-seed-%';` removes all of it via cascade. Treat any `demo-seed-` row as scaffolding, never as real history.

**Not verified in a browser.** The Playwright MCP profile was held by a 7-hour-old Chrome belonging to a different MCP server instance, which would not release it; the only way through was for the user to close the window and sign in again, undoing the sign-in they had just done. The user reviewed the pages directly instead. Everything mechanically checkable was checked: 419 tests, clean build, and the volume numbers confirmed against the dev DB by direct query.

## 2026-08-09 — The exercise taxonomy, and a /progreso built on it (feedback item 5, complete)

Status: code complete, `lint`/`typecheck`/`test` (419 passing, +63 new)/`build` all green. One new runtime dependency: `lucide-react`. Migrations `drizzle/0018_gigantic_wong.sql`, `0019_link_prescriptions_to_catalog.sql` and `0020_link_catalog_aliases.sql` generated **and applied to the dev DB**. Shipped — see the deploy entry above.

Came from `docs/product/progress-dashboard-kickoff-prompt.md`, but the user reframed it first: *"revisit the taxonomy, now after used the app in production we noticed that adding the taxonomy is going to help us to generate better reports… determine the best way to categorize and track this information from the point of view of muscle gain."* So this reopens — deliberately, with the user's explicit decision — the taxonomy question declined on 2026-08-02 and in `loadMechanism`'s own doc comment.

**The coaching frame, which reshaped the whole feature.** A hypertrophy coach does not primarily read per-exercise load curves; they read *series efectivas por grupo muscular por semana* against volume landmarks. That report is meaningful at **one** logged session per exercise — which dissolves the blocker the kickoff prompt identified, where only "Core" had 2+ instances and any multi-line trend chart would render as a field of single dots. Weekly volume works on the data that exists today.

**Confirmed via `AskUserQuestion`** (four rounds): full taxonomy depth (primary + fractional secondary + movement pattern + joint load); 13 muscle groups with region derived, never stored; a **normalized catalog** rather than per-prescription columns; catalog seeded globally with user-added entries private per profile; unilateral counted **per side** (3 izq + 3 der = 3); evidence-based reference ranges rather than self-relative averages; substitutes as their own entry under their own muscle group; and both dashboard asks shipped together.

The user initially accepted "selector obligatorio" as the cost of normalizing. It isn't necessary, so `exercise_id` is **nullable**: `exerciseNameEs` stays free text and stays the display name, mid-session substitution keeps working with typed names, and unmatched rows degrade to "Sin clasificar" instead of blocking anything.

**Schema.** New `muscle_group` pgEnum whose values are imported from `src/training/muscle-taxonomy.ts`, so the enum cannot drift from the TS union. The orphaned `exercise` table is revived as the catalog: `athlete_profile_id` (null = seeded/global), `is_active`, `primary_muscle_group`, `secondary_muscle_groups` (enum array, not jsonb — the seed is hand-written SQL where TypeScript checks nothing). `movement_pattern` and `joint_stress_tags` are **reused as-is** with TS types rather than promoted to enums: nothing aggregates on them, and they're the vocabularies most likely to churn. `exercise_prescription.exercise_id` is nullable with `on delete set null`.

`is_active` defaults to **false**, which is the whole trick for the 12 legacy rows left by the removed "Pesos base" flow — `baseline_lift` references them with `on delete restrict`, so they can never be deleted. Defaulting to false hides them without the migration having to name them, and hides any unseen legacy row on the production branch automatically. `baseline_lift` verified still at 3 rows.

**Migration split into three, forward-only.** `0018` is purely additive (types, columns, indexes, the 67-row catalog seed). Dropping the superseded `primary_muscles`/`secondary_muscles` jsonb in the same diff makes drizzle-kit prompt for a rename decision and it has no TTY here — same reason `0010` added and `0011` dropped, so those columns stay for a follow-up. `0019` links prescriptions by exact name and renames the five "Core" rows. `0020` links the alias names.

**The "Core" ×5 problem, and the trainer/physio call.** "Core" was five prescriptions across five days sharing one label — five different exercises on one progression line, with no way to see that only trunk flexion was ever trained. The user confirmed the work is abdominal on every day and asked for each to be defined properly by day. Assigned against each day's load: **Crunch en máquina** on días 1 and 2 (trunk flexion where the lumbar spine is otherwise unloaded; día 2 also matches the 40 kg × 10 actually logged), **Pallof press en polea** on día 3 (antirotation — after Romanian deadlift and hip thrust the lumbar has already worked in extension, and adding loaded flexion there is the classic error), **Elevación de rodillas en paralelas** on día 4 (hip flexors fresh on an upper day), **Plancha lateral** on día 5 (antilateral flexion, same frontal plane as the abduction and unilateral work). Días 1 and 2 deliberately share a name — one exercise on two days, exactly like "Extensión de tríceps" already is.

Renames are keyed on `day_index` + name, never on prescription ids, because ids differ between branches and this correctly reaches cloned copies of the plan in the other two accounts. Día 5's flip to `duration` type is additionally guarded by "has no logged sets", since `/progreso` filters on `prescription_type = 'strength'` and flipping a row with history would make those sets vanish.

**A real methodological catch, from the design review.** Two rules written into the approved plan were outright wrong and were verified against the source before being fixed:
- The unilateral rule said "count distinct `setNumber`". But `saveSetForSession` (`workout-repository.ts:296`) assigns `setNumber = existingSets.length + 1` across the whole exercise log regardless of side, so 3 izq + 3 der yields setNumbers 1–6 — a distinct-count returns **6**, doubling every unilateral exercise and producing exactly the inflation the per-side decision existed to prevent. Correct rule: `max(count(left), count(right)) + count(bilateral)`.
- The counting rule said to exclude `phase = 'mobility'`. But `seeded-plan.ts:68` ships `["Face pull", "mobility", …]` with rep ranges — mobility-phase but strength-type — so excluding it would silently delete real `deltoides_posterior` volume. Correct rule: `prescriptionType === 'strength' && phase !== 'warmup'`, which already excludes genuine stretches and holds because those are duration-type.

**Substitutes must not inherit their classification.** `createSubstituteExercise` inherits dosage (phase, sets, RIR, rest, loadMechanism) but must resolve `exercise_id` from the *typed name*. The live data proves why: `Pantorrilla sentada unilateral` substitutes `Press inclinado en máquina`, so inheriting would credit calf work to **pecho**, silently and permanently, in the headline chart. Verified after migrating — that row resolves to `pantorrillas`. Dosage inherits; identity does not.

**Verified live** against the real dev DB: **29/29 prescriptions classified, 0 "Sin clasificar"**; 67 active catalog rows and 12 legacy rows hidden; `id = slug` on every active row; all 41 logged sets still visible to `/progreso`'s `prescription_type = 'strength'` read path; `baseline_lift` untouched; `drizzle.__drizzle_migrations` at 21.

**An honest consequence worth stating.** Splitting "Core" removed the only exercise that had 2+ completed instances. Until the rotation repeats, *no* exercise has two data points, so "Mejoras recientes" will be empty and every progression line is a single dot. This is not a regression the split caused so much as one it revealed — those two instances were never the same exercise. It is also precisely why weekly volume per muscle group is the headline section rather than a trend chart.

**Write paths (phase 3).** All four prescription-construction sites now carry `exerciseId`: `toExercisePrescriptionValues` and `insertClonedPlanSessions` in `plan-builder-repository.ts` (a clone copies it verbatim like `lineageKey` — same exercise, must not re-resolve), the `prescriptionRows` flatMap in `activateSeededPlanForProfile`, and `createSubstituteExercise`. Both Zod contracts gained the field in their **common** fields rather than the strength branch, unlike `loadMechanism`/`isCompound`: those are strength-only because they only drive weight suggestions, whereas a plank has a muscle group and a joint load even though it contributes no effective sets.

`toGeneratedWorkoutPlan`'s hand-written pass-through gained `exerciseId` with a dedicated round-trip test, because that was the highest-probability silent failure in the change — the field exists in the DB, the Zod contract and the form, so omitting it there would drop it on every read with no error anywhere, and the only symptom would be that every activated plan reports "Sin clasificar".

**UI.** The builder's exercise row gained a full-width "Grupo muscular" select, `<optgroup>`-ed by muscle group with a cardio group at the end and "Sin clasificar" as the empty option — a native select, so it renders as an iOS wheel and needs no new component. The catalog is grouped once at module scope rather than per render. The helper copy under `loadMechanism` said *"Esto no clasifica el ejercicio"*, which stopped being true, and now points at the new select instead.

**Templates deliberately do not carry `exerciseId`.** Both the activation path and the builder fall back to `findCatalogEntryByName`, and the coverage test proves every template name resolves — so duplicating ~90 slugs across the four template modules would add pure redundancy plus a drift risk, with the test as the thing that would actually catch a regression.


**Volume aggregation (phase 4).** New `src/workouts/muscle-volume.ts` + 21 tests. `buildMuscleVolumeSummary` produces weekly effective sets per muscle group (1.0 primary, 0.5 each secondary), push:tirón and cuádriceps:femorales ratios derived from `regionForMuscleGroup`, and pain aggregated by joint. `startOfWeek` was exported from `consistency.ts` and imported rather than reimplemented, with a test asserting both builders emit identical `weekStartDate` values — the two charts render on the same screen, and two Monday implementations drifting by a day would be a visible bug.

**Query (phase 5).** New `getLoggedVolumeInstancesSince` sibling in `workout-repository.ts` — the volume report needs every set in a window, which the existing per-exercise-instance query (capped at 12 per name, in memory, no time bound) cannot give, and widening it would have changed the cap semantics `buildExerciseImprovements` depends on. It deliberately does not filter `prescriptionType`/`phase` in SQL: those rules live in `muscle-volume.ts` where they are testable, and one of them is subtle. `getRecentExerciseInstancesByName` gained a projection widening plus a `leftJoin` alias for the substituted-for name.

**`/progreso` (phase 6).** Section order is now Resumen → **Series por grupo muscular** → **Ejercicios por grupo muscular** → Mejoras recientes → Consistencia semanal → Tendencia corporal → Historial. The volume section leads because it is the only view that reads correctly at one logged instance per exercise, which is the actual data state.

New `muscle-volume-chart.tsx`: horizontal rows, one per muscle group, each with its reference band behind the bar. Deliberately not built on `bar-chart.tsx`, which is vertical, zero-baselined and week-indexed with a single shared target line — generalizing it would roughly double its prop surface for one caller and risk the working Consistencia chart, the same reasoning that gave `dual-line-chart.tsx` its own file. Also a deliberate deviation from "every chart is one inline `<svg>`": the row labels are real HTML text so they inherit the raised type scale, because rendering "Abductores y aductores" as SVG `<text>` in a 300-unit viewBox means ~8px glyphs — precisely what that type-scale change exists to prevent. The bars themselves are still hand-rolled inline SVG.

New `exercise-group-list.tsx` replaces the `<select>`: an accordion grouped by muscle group in region order (pierna → empuje → tirón → core), opening on the most recently trained exercise so what you came to check is already showing. `ExerciseProgressionChart` lost its dropdown and now takes a single `group` — its metric toggle, unilateral dual-line branch and effort-gap section are untouched, because the chart was never the complaint. Substitutes keep their own row under their own muscle group with a "sustituyó a X" line.

A below-range bar is grey, not red, and there is no warning styling anywhere in this section. A five-day rotation with two-set accessories genuinely lands under most reference bands, and painting that as failure would both demotivate and nudge toward junk volume — colour in this app stays reserved for pain.

**`/guia` (phase 7).** Fourth accordion section (`?open=volumen`) covering effective sets, the half-credit rule, the per-side unilateral rule, what does and does not count, why the band is a reference and not a goal, and the honest limit on pain-by-joint. `/progreso` links to it.

**Verified live** against the real dev DB. Weekly volume computed straight from SQL matches the module's rules: femorales 6 (Peso muerto rumano 3 bilateral + Curl femoral sentado unilateral logged as **6 sets → 3 effective**), pantorrillas 3 (6 logged sets → 3). That is the per-side rule working, and the number a distinct-`setNumber` count would have doubled.


**Mobile UX pass and two dependency decisions (same day, after first review).** The user tried the new section and pushed back: 13 muscle-group rows rendered unconditionally (~570px, most of a 844px viewport before any interaction), and nothing signalled that rows were tappable.

- **Zero-volume groups now collapse to one line** — "Sin series esta semana (3): Espalda alta, Hombro posterior, Abductores y aductores" — with the names in the always-visible summary and only the per-group reference range behind the tap. Simply hiding them was rejected: a muscle sitting at 0 is the single most actionable line the report has, and on a partial week 9 or 10 of 13 groups are legitimately empty. The x-axis now scales off trained rows only, so a hidden group's reference band no longer stretches the axis for real bars.
- **The "no icon library" constraint was lifted by the user.** `lucide-react` added (v1.31.0, React 19 support, tree-shakes per icon); both accordions got a rotating `ChevronDown` plus `active:` touch feedback.
- **A charting library was evaluated and declined.** Recharts 3.10 pulls `@reduxjs/toolkit`, `react-redux`, `immer` and d3 via `victory-vendor` into a mobile app, and adopting it would mean rewriting five working, tested charts. A library reduces complexity when it replaces code you would otherwise write, and increases it when it replaces code already written and tuned — icons and the body map are the former, these charts are the latter. Revisit if a future chart needs stacking, brushing or many series.

**A live bug found by the UX review, in code written earlier the same day.** `formatRatio` had both branches inverted, so with the real numbers (cuádriceps 4, femorales 6) the dashboard rendered "Cuádriceps : Femorales — 1.5 : 1" — stating the exact opposite of the data. Fixed, `formatRatio` exported purely so three tests can pin it against those real numbers.

**The body map.** New `body-map.tsx` + `body-map-geometry.ts`: front and back silhouettes shaded by how much each muscle was trained this week, above the bars. The polygon artwork is **vendored from react-body-highlighter under its MIT licence, with the full notice retained in the file**, rather than taken as a dependency — the upstream package was last published in May 2022 and predates React 19, anatomy is static so there is no bug-fix stream to miss, and, decisively, no library exposes the lateral/posterior deltoid split this taxonomy is built on. Owning the geometry lets the **front** view carry `deltoides_lateral` and the **back** view carry `deltoides_posterior`; a mapping layer over a library could not express that, and it is the whole reason there are 13 groups rather than 8. A test asserts all 13 are covered across the two views.

Shading is a single emerald opacity ramp, never a hue change, and is computed against each muscle's own reference range rather than an absolute count — 16 sets is the top of the range for pantorrillas and mid-range for pecho, so an absolute scale would misread both. Untrained muscles stay zinc, which is what makes a skipped muscle visible without reading a number.


**A per-muscle trend chart was evaluated and declined; a week-over-week delta shipped instead.** The user asked whether a trend chart by muscle group made sense. Checking first rather than assuming: all three completed sessions fall inside **one** Monday-start week (Mon 03 Aug and Sun 09 Aug are the same week), so a trend would render one dot per muscle — the same trap the kickoff prompt identified for per-exercise charts, reproduced one level up.

The stronger objection is structural, and survives having more weeks. Each muscle maps to specific training days — pecho lives on días 2 and 4 only — so its weekly volume swings on *whether that day got trained*, not on anything about the training itself: 3 → 0 → 6 as the calendar moves. A line chart of that plots your schedule while looking like it plots your progress, which is worse than showing nothing. It would also need a per-muscle selector at 390px, reintroducing the dropdown this whole feature existed to remove.

Shipped instead: a ▲/▼ delta per muscle group against the previous calendar week, on the bars that already exist. `weekOverWeekDelta` returns **null when the previous week has no volume at all** — on a first week, or after a gap, every muscle would otherwise show a triumphant "+N" against an empty baseline and read as progress when there was simply nothing before. Arrows are zinc, never green/red: colour stays reserved for pain, and fewer sets is not a warning. `MuscleVolumeSummary` gained `previousWeek`. Nothing will render for this athlete until a second week exists, which is correct.

Also removed the chart's `sr-only` summary paragraph. It predated the HTML-label redesign; now that every label, number and delta is real text, it made assistive tech announce the whole table twice. Caught by two tests failing on "found multiple elements" — a real defect surfacing as a test failure, not a test artefact.

**A third empty-row class fixed.** The user spotted exercises listed under a muscle group with no sets — "Extensión de cuádriceps unilateral" under Cuádriceps. Cause: `exerciseLog` rows are created the moment an exercise is opened while training, so starting one and logging nothing (or deleting its sets afterwards) leaves a real completed-session instance with zero sets. Two exist in the real data. `toExerciseSeriesGroups` now drops groups with no points — fixed at the source rather than in the list component, so `pickDefaultExerciseName` cannot auto-open an empty chart on load either.

**Not done, deliberately.** No `painLocation` column on `setLog` — attributing a set's pain to every joint its exercise loads is an inference, not a measurement, so the UI must label it "articulaciones cargadas cuando reportaste dolor" and never "dolor de hombro". The four plan templates do not yet carry `exerciseId`, so newly activated plans rely on the name fallback until phase 3.

Files touched: `src/training/muscle-taxonomy.ts` (new, +test), `src/db/schema.ts`, `drizzle/0018_gigantic_wong.sql` (new), `drizzle/0019_link_prescriptions_to_catalog.sql` (new), `drizzle/0020_link_catalog_aliases.sql` (new), `drizzle/meta/*`, `src/plans/generated-plan-schema.ts`, `src/plans/plan-builder-schema.ts`, `src/plans/plan-repository.ts`, `src/plans/plan-builder-repository.ts`, `src/app/plan/builder/session/[dayIndex]/page.tsx`, `src/app/plan/builder/session/[dayIndex]/session-editor-form.tsx`, plus `exerciseId` added to prescription fixtures in `src/plans/plan-repository.test.ts` (+2 tests), `src/workouts/session-progress.test.ts`, `src/app/entrenar/[sessionId]/session-runner.test.tsx`, `src/app/plan/builder/session/[dayIndex]/session-editor-form.test.tsx`. Phases 4–7 added `src/workouts/muscle-volume.ts` (new, +test), `src/workouts/consistency.ts`, `src/workouts/workout-repository.ts`, `src/workouts/exercise-series.ts`, `src/app/progreso/muscle-volume-chart.tsx` (new), `src/app/progreso/exercise-group-list.tsx` (new), `src/app/progreso/exercise-progression-chart.tsx`, `src/app/progreso/page.tsx`, `src/app/progreso/progreso-page-content.tsx`, `src/app/guia/page.tsx`, `docs/architecture/data-model.md`, plus the colocated tests for each.

Next iteration: browser verification at 390×844 with Playwright (needs the user to sign in), then deploy and commit when asked. Before deploying, confirm the Core rename reaching cloned plans in the other two accounts is wanted — the migration matches on `day_index` + name, which is the only way it can work across branches but does mean those exercises get renamed for Athletes B and C too.

## 2026-08-09 — Deployed and committed exercise substitution + the reading type scale

Status: shipped. Committed as `ffe3197` on `main` (`feat: swap an exercise mid-session, and raise the reading type scale`) — 17 files, bundling both undeployed pieces into one commit per this project's established pattern for stacked work. 1Password's SSH signing agent worked first try. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`; `/` and `/guia` HTTP 200, `/entrenar` and `/plan/rutina` HTTP 307-to-auth confirmed).

Verified in production rather than assumed, since this deploy carried a schema change: both `substituted_for_prescription_id` and `substitution_reason_es` exist and are nullable, `drizzle.__drizzle_migrations` shows 18 applied entries, and the production CSS bundle carries the new scale (`--text-xs:.875rem`, `--text-sm:1rem`) with `--text-xl` still at its stock `1.25rem` — confirming headings were left alone as the user asked — plus `input-stepper{appearance:textfield;padding-left:0;padding-right:0}`.

**Deployed with a workout session genuinely active**, which is normally this project's stop condition. Checked rather than waved through: the session on Día 4 had a set logged ~70 seconds earlier, so it was unambiguously live. Raised it explicitly instead of proceeding, and the user confirmed they were testing on `localhost:3000`, which a Vercel production deploy cannot interrupt. The migration was additive and nullable with no backfill, so the data was safe either way. Worth keeping the check itself — the constraint is about *disruption*, and the answer turned on where the session was running, not on whether one existed.

`next-env.d.ts` was again kept out of the commit (it auto-flips between `./.next/types/` and `./.next/dev/types/` depending on whether `build` or `dev` ran last).

Next iteration: only feedback item 5 (the `/progreso` dashboard) remains, still deferred for lack of chartable history — see `next-task.md`. The real-iPhone check of the new default type scale is worth doing on-device, since the user's original complaint was about on-device readability.

## 2026-08-09 — Substituting an exercise mid-session (feedback item 3)

Status: code complete, `lint`/`typecheck`/`test` (354 passing, +23 new)/`build` all green. Migration `drizzle/0017_funny_famine.sql` generated **and applied to the dev DB**. Not yet deployed/committed. Verified live against the real dev DB and the real signed-in account.

User feedback: "some days I want to do a different exercise because the machine is broken/too busy or just because I don't feel well to perform that exercise."

**A finding that invalidated the previously-agreed scope, surfaced before building rather than after.** The plan of record was "substitute from `substitutionOptionsEs` *or* any exercise already in your plan." A direct query showed **all 28 exercises on the real active plan carry the identical placeholder pair `["Máquina equivalente", "Cable equivalente"]`** — the template author wrote one generic pair and applied it everywhere. So the curated half was hollow: it names no actual exercise, and worse, `getPreviousExercisePerformance` matches history by `exerciseNameEs` **globally per athlete**, so substituting into a prescription literally named "Máquina equivalente" would have collapsed every swap across all 28 exercises into one shared progression history — a leg-press swap informing a bicep-curl suggestion. Went back to the user rather than quietly shipping the thin version, with the correction that a typed name is *not* the unclassified free-text the original kickoff feared.

**Confirmed via `AskUserQuestion` (both recommended options)**: swap targets are any exercise already in the plan *or* a typed name; and a substitute is stored **linked** to the exercise it replaces rather than merely appended.

**Schema** (`0017`), two nullable columns on `exercise_prescription`:
- `substituted_for_prescription_id` — self-referential FK, **`on delete set null`** rather than cascade: cascade would fight `exerciseLog`'s `onDelete: "restrict"`, where a substitute with logged history would block deleting the original outright. Set-null degrades gracefully (the alternative just becomes a normal exercise).
- `substitution_reason_es` — kept because the reasons are **not clinically equivalent**. A busy or broken machine is logistics; "no me sentí bien" is a symptom report, and since the original ends the session with *no logged sets*, nothing else would record that anything was wrong. The UI surfaces a matching physio note ("si aparece dolor... el dolor manda antes que la carga") only for that reason.

**A substitute is a real prescription, not a session-scoped override** — the inverted trade-off flagged in the previous entry held up: an override would have needed a new column plus a coalesce in three core read paths, whereas a real row needs none and every existing feature (progression, previous-performance, `/progreso`) works on it untouched. It **inherits the original's entire prescription** — sets, reps, RIR, rest, phase, laterality, `loadMechanism`, `isCompound`, `painSensitive` — so it's fully classified from its first set (no flat-increment fallback), and coaching-wise the swap doesn't silently change the day's intended stimulus. Only the name differs; `exerciseNameEn`/`notesEn` are deliberately *not* inherited, since they describe a different movement.

**Keeping the day from growing** was the whole point of the link. New pure module `src/workouts/exercise-substitution.ts` (+17 tests): `selectVisibleExercises` shows the plan's own exercises plus only those alternatives chosen *in this session*, sorted immediately after the exercise they stand in for rather than at the end where their `orderIndex` would put them. "Chosen" is keyed on the **`exerciseLog` row, not on sets existing** — a design correction caught mid-build, since a just-created substitute has no sets yet and would otherwise have been filtered out of the very screen you need it on; `markExerciseChosenForSession` writes that row. `getActivePlanForProfile` filters substitutes out entirely, so day counts and `/plan` previews stay honest. `buildSubstituteChoices` dedupes by name precisely because history is name-matched ("Core" really is on all five days). `createSubstituteExercise` reuses an existing alternative of the same name instead of minting a near-duplicate, so a recurring broken machine builds one continuous history.

**UI**: a muted "Cambiar ejercicio" on the exercise card (not behind a menu — the decision happens standing in front of an occupied machine), opening reason chips → "ya usaste antes" one-tap alternatives → a name field → a pick-from-plan select. After a successful swap the runner **lands on the replacement**, via the same render-time state-adjustment pattern the bonus-set reset already uses. The app deliberately does **not** grade the swap: with no muscle-group taxonomy it cannot tell whether an alternative preserves the movement pattern, and a confident-sounding warning it can't back would be worse than staying quiet.

**Verified live** at 390×844 on a throwaway Día 5 session: swapped "Sentadilla búlgara con apoyo" → "Hack squat" with reason "No me sentí bien"; confirmed by direct query that the new row inherited 3×6-10 / RIR 2 / 120s / unilateral / machine / compound / pain-sensitive and stored both the reason and the link. Confirmed it appeared as "Ejercicio 2 de 7" directly after its original, that a second swap **reused** the same prescription (29 rows, not 30) and auto-landed on it, that a set logged against it saved correctly, and — the point of the whole design — that `/entrenar` still reported Día 5 as **"6 ejercicios"** and `/plan/rutina` never rendered "Hack squat" at all.

Cleanup confirmed: throwaway session and substitute deleted, account back to exactly 3 completed sessions / 41 sets / 28 prescriptions / 0 substitutes / 0 orphan `exercise_log` rows.

Not done, deliberately: plan-preview pages don't yet *display* alternatives under their original (they simply omit them, which is the correctness fix); and the templates' generic `substitutionOptionsEs` placeholders are still rendered as inert text where `painSensitive` is true — rewriting those lists with real per-exercise alternatives is a content-authoring pass the user declined for now.

Files touched: `src/db/schema.ts`, `drizzle/0017_funny_famine.sql` (new, applied), `src/workouts/exercise-substitution.ts` (new, +test), `src/workouts/workout-repository.ts`, `src/plans/plan-repository.ts`, `src/app/entrenar/actions.ts`, `src/app/entrenar/[sessionId]/page.tsx`, `src/app/entrenar/[sessionId]/session-runner.tsx` (+test), plus the new fields added to the `ExercisePrescription` fixtures in `plan-repository.test.ts`/`session-progress.test.ts`.

Same-session follow-up after the user tried it locally and asked why the swap panel looked the way it did (screenshot: the plan picker's options rendered as a full-height browser-native list covering the panel). Two separate things, one of them a real defect:

- **The popup's appearance was browser-native and unstyleable** — that's how macOS Chrome renders a `<select>` popup; on the iPhone it would have been a bottom wheel picker instead. Replaced the `<select>` entirely with the same collapsed-`<details>`-plus-tappable-list pattern already used for "ya usaste antes" and the reason chips, so it now looks like the rest of the app, stays collapsed until asked for, and scrolls within `max-h-64` instead of covering the form.
- **A genuine bug behind it**: the picker was pinned to `value=""`, so it snapped straight back to its placeholder after every choice. The name *had* in fact been filled into the field above, but nothing in the control you just tapped acknowledged it, so the tap read as a no-op. The list now marks the chosen exercise via `aria-pressed` and clears it again as soon as you type something that isn't in the plan — covered by two new regression tests (356 passing).

The user had an **active session on Día 4 and a real substitute of their own** ("Pantorrilla sentada unilateral" standing in for "Press inclinado en máquina", reason "Otra razón") at the time; both were left untouched throughout, and confirmed intact afterwards.

Next iteration: deploy and commit when asked — this would bundle with the still-undeployed type-scale work from the entry below.

## 2026-08-09 — Bigger reading text by default (the other half of item 4)

Status: code complete, `lint`/`typecheck`/`test` (331 passing)/`build` all green. No schema change. Not yet deployed/committed.

Follow-up to the deploy below. The user confirmed pinch-zoom now works on their real iPhone, then made the point that mattered: **they wanted defaults that are easier to read at 47+, not just the ability to zoom**. That's the correct reading of their original words — "harder to read instructions almost all the time" is about the resting state, and having to pinch every session is an escape hatch, not a readable default. Removing `maximumScale` was necessary but not sufficient.

**Audit first**: the app was 215 × `text-sm` (14px) and 104 × `text-xs` (12px), against only 9 × `text-base` (16px). The coaching copy the user named — `notesEs`, `mobilityNotesEs`, the pain and substitution warnings — was all `text-xs`, i.e. **12px**.

**Scoped by the user's own correction**, which changed the design: asked how far to push, they answered that exercise names and page titles "are ok right now, the most affected are coaching notes, lead paragraphs." So this is deliberately **not** a uniform scale bump — only the three reading sizes move, via a `@theme` override in `globals.css` (Tailwind v4), which lifts all 319 call sites from one place with zero churn across 26 files:
- `--text-xs`: 12px → **14px** (coaching notes, warnings, substitutions)
- `--text-sm`: 14px → **16px** (body copy and lead paragraphs; the usual mobile body-text floor)
- `--text-base`: 16px → **17px**
- `text-lg` and up: **unchanged** — verified in the compiled CSS that `--text-xl`/`--text-2xl`/`--text-3xl` still resolve to their defaults, and live that `h1` is still 30px.

**Why a theme override rather than a root `font-size` bump**: Tailwind's spacing utilities are rem-based, so raising the root would have inflated the fixed grids too — the ± stepper's `[2.75rem 1fr 2.75rem]` columns and the 5-column bottom nav — re-clipping the very fields fixed in the entry below. The `@theme` route grows text only and leaves all geometry alone.

**A real regression this introduced, caught by measuring rather than eyeballing, and fixed**: at 16px the main logging form's weight field began clipping at **"62.5"** — and half-kilo values are precisely what `suggestNextWeightKg` produces via `roundToHalf`, so this would have hit constantly. Measured the cause instead of guessing: the digits only need ~34px of the ~51px available, but the browser reserves ~23px for the **native number spinner**, which is pure dead weight here (these fields have their own ± buttons, and iOS Safari never renders the spinner at all). Hiding it via `appearance: textfield` + the `::-webkit-*-spin-button` reset on `.input-stepper` — deliberately scoped, since the Dolor (0-10) field is also a number input but has no ± buttons and keeps its spinner — plus dropping `.input-stepper`'s side padding to zero (the value is centre-aligned, so the padding bought nothing visually). Both forms now render every value cleanly from "40" through "999.5", the schema max. Notably this fixes the tap targets' cost too: no button was shrunk to buy the space.

Verified live at 390×844 against the real dev DB: coaching notes measured at 14px/20px line-height (were 12px), body at 16px, `h1` unchanged at 30px, no horizontal overflow anywhere, the 5-column nav labels unclipped, the 5-column RIR selector unclipped, and both the main form and the narrower in-card editor clean across `40`/`62.5`/`100`/`127.5`/`999.5`.

Used a throwaway Día 5 session for the live check and deleted it afterward — confirmed the account is back to exactly its real state (3 completed sessions, 41 sets, 2 marked edited, 0 orphan `exercise_log` rows). The user had trained Día 2 and Día 3 for real earlier in the day; none of that was touched.

Not changed, and worth a deliberate decision later: the bottom-nav tabs and a handful of uppercase eyebrow/stat labels use hardcoded arbitrary sizes (`text-[0.68rem]` ≈ 10.9px, `text-[0.65rem]` ≈ 10.4px) which a `@theme` override cannot reach. They're the smallest text left in the app, but they're chrome rather than reading copy, and the nav is the tightest horizontal constraint (5 fixed columns that already abbreviate "Entrenar"→"Entr."), so growing them is a separate call.

Files touched: `src/app/globals.css` only.

Next iteration: deploy and commit when asked.

## 2026-08-09 — Deployed and committed set correction + the iOS text-zoom fix

Status: shipped. Committed as `a7c27a9` on `main` (`feat: let a logged set be corrected or deleted, and unblock iOS text zoom`) — 22 files, both of this session's pieces in one commit per this project's established pattern for stacked work. 1Password's SSH signing agent worked first try this time (no retry needed, unlike the last two sessions). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` and `/guia` HTTP 200, `/entrenar` and `/plan/rutina` HTTP 307-to-auth confirmed).

Unlike every prior deploy in this project, this one **did** carry a schema change — verified rather than assumed afterwards: `set_log.updated_at` exists in the DB as `timestamp with time zone`, nullable, and `drizzle.__drizzle_migrations` shows 17 applied entries. Also confirmed the two fixes actually reached production rather than trusting the build: the served HTML now emits `content="width=device-width, initial-scale=1"` with **no** `maximum-scale` (the previous production build had `maximum-scale=1`, so this doubles as proof the alias is serving the new deployment), and the production CSS bundle contains `input-stepper{padding-left:.25rem;padding-right:.25rem}`.

Confirmed no workout session was active at deploy time, and none started during it. `next-env.d.ts` was deliberately left out of the commit — it auto-flips between `./.next/types/` and `./.next/dev/types/` depending on whether `next build` or `next dev` ran last, so committing the dev variant would just churn.

**The real account had been used for real in between**: two new completed sessions appeared (Día 2 "Tren superior completo A" at 17:59 UTC and Día 3 "Femorales, glúteos y pantorrillas" at 18:03 UTC), taking `set_log` from 7 rows to 41 — and **2 of those sets are already marked edited**, both on "Press de pecho en máquina" (set 2 corrected ~14s after logging, set 3 ~2.5 min after). That's the user's own real training and the first real use of this feature, entirely separate from this session's throwaway verification (which used a Día 5 session, `118e42ca…`, deleted with zero residue confirmed before any of this). Left completely untouched.

Next iteration: the real-iPhone text-size check for item 4 is still open and only the user can do it (see the entry below). Items 3 and 5 remain — see `next-task.md`.

## 2026-08-09 — Correcting a logged set (edit + delete), and unblocking iOS text zoom

Status: code complete, `lint`/`typecheck`/`test` (331 passing, +14 new)/`build` all green. Migration `drizzle/0016_sharp_screwball.sql` generated **and applied to the dev DB**. Not yet deployed/committed. Verified live against the real dev DB and the real signed-in account.

Kicked off from `docs/product/user-feedback-kickoff-prompt.md` — five pieces of real user feedback. This session shipped **items 1+2 (correcting a logged set) and item 4 (text size)**; items 3 and 5 were deliberately deferred, with reasons recorded below so they don't get re-derived. Structured as four reconciled role passes (trainer/physio judgment first, then mobile UX, then principal engineering), with the real forks confirmed via `AskUserQuestion` before implementing.

**Phase 1 verdict (trainer/physio), on whether unrestricted after-the-fact editing is safe**: yes — and the *inability* to edit is itself the safety defect. Concrete failure traced through the real code, not hypothesised: log 8 reps as 18 and `reachedTopOfRange` fires against `targetRepMax`, so the next session prefills a heavier weight the athlete never earned — on a plan whose own Spanish safety copy says "no agregues series extra a la pierna delgada sin valoración profesional." A mistyped pain score is worse: it silently disables the pain brake (>2 blocks aggressive progression, >=7 flags professional guidance). A wrong value in a training log is more dangerous than an edited one. So: no time window, no approval gate, no restriction — this is a single-user personal log, not a coached multi-athlete platform. The one guardrail that earns its keep is *visibility*, not restriction: pain is the field with real downstream safety consequences, and quietly revising it downward is exactly what someone in denial about a niggle does, so the app records **that** a set was corrected without ever blocking the correction.

**Confirmed via `AskUserQuestion` (all four recommended options accepted)**: scope = items 1+2+4 now; "wrong exercise" = delete-and-relog, not a true move; editing available on completed sessions too, not just active ones; and (for the deferred item 3) substitution from `substitutionOptionsEs` *or* any exercise already in the plan, creating a real tracked prescription.

**Schema**: one new column, `set_log.updated_at` — deliberately **nullable, no default, no `$onUpdateFn`**, unlike the shared `updatedAtColumn()` helper `exerciseLog`/`workoutSession` use. A `notNull().defaultNow()` column would stamp all 7 pre-existing real sets as "just updated," making the marker meaningless; nullable means `updatedAt !== null` reads as exactly one thing. Confirmed after migrating that all 7 real sets still have NULL.

**The real bug the delete path would have introduced, caught before writing the UI**: `saveSetForSession` derives `setNumber` from `existingSets.length + 1`. Delete set 2 of 3 → survivors numbered 1 and 3 → the next save computes 3 again, a **duplicate**, with no unique constraint on `(exerciseLogId, setNumber)` to catch it and non-deterministic `orderBy(asc(setNumber))` between the colliding rows. Fixed with a new pure module `src/workouts/set-editing.ts` (`renumberSets`, +6 unit tests) applied inside `deleteSetForSession`. Worth noting `splitPlannedAndBonusSets` classifies by **array position**, not by `setNumber` value, so it tolerates gaps on its own — the renumbering is about display correctness and stable ordering, and about keeping `length + 1` safe.

**Why delete-and-relog rather than a true move** (item 2): a move would re-insert into another exercise's sequence and could silently promote or demote the moved set between planned and bonus — and shift the *target* exercise's own split too — since classification is positional. Delete-and-relog needs renumbering only, and the re-logged set goes through the already-tested `saveSetForSession` path. It also needs **no new navigation**: the runner's existing `exerciseIndex` Anterior/Siguiente state already gets you to the wrong exercise and back.

**Repository/actions**: `updateSetForSession`/`deleteSetForSession` (`workout-repository.ts`), both ownership-scoped by joining `setLog → exerciseLog → workoutSession.athleteProfileId` via a shared `findOwnedSet`, following `updateExercisePrescriptionTargetSets`'s precedent and returning `false` rather than throwing. `updateSetAction`/`deleteSetAction` reuse `parseSetLogFormData` **verbatim** — an edit can never accept a value a fresh log couldn't, so there is no second validation surface. Their session guard deliberately differs from `saveSetAction`'s (which requires `status === "active"`): editing is allowed on completed sessions, because every progression read derives from `set_log` live rather than from a snapshot taken at completion, so a later correction simply makes the next suggestion right. Both revalidate `/progreso` as well as the session page. `SaveSetInput` was refactored to be built *from* a new `UpdateSetInput` base rather than an `Omit<>` of it — `Omit` over an intersection-with-union collapses the strength/duration discriminated union.

**UI** (`session-runner.tsx`): a new `EditableSetRow` wraps the existing display-only `LoggedSetRow` (which stays display-only, so the previous-session reference row is correctly *not* editable). An explicit "Editar" control (`min-h-11`, per this project's 44px convention — not tap-the-whole-row, which has no affordance and misfires with sweaty hands) expands an editor **in place**, reusing the same `StrengthSetFields`/`DurationSetInput`/pain/notes fields as the logging form rather than a second differently-shaped form. `StrengthSetFields` gained an optional `selectedRir` so an edit preselects the set's *actual* RIR instead of the plan's target (`?? targetRir`, not `||`, so a real RIR of 0 stays selected — covered by a test). Delete lives inside the expanded editor as a muted secondary action behind one confirm step, not a swipe (conflicts with iOS back-swipe); its confirm button uses `formAction` + `formNoValidate` on a shared form (`SubmitButton` gained both as optional props) so deleting isn't blocked by validation on fields being discarded anyway. A subtle "· editado" marker renders when `updatedAt !== null`. Rows are keyed on `set.updatedAt`, so a successful save remounts the row closed with fresh values while a rejected one stays open showing its error — no open/closed state machine needed. Both the live current-exercise card and the completed-session summary render through the same component.

**A real pre-existing bug found during live verification, fixed here**: the ± stepper fields have been **clipping their own values since the competitor-UX-benchmark session shipped them**. `.input`'s `padding: 0.875rem 1rem` leaves a 19px content box inside the stepper's narrow `[2.75rem 1fr 2.75rem]` grid at iPhone width, so the main logging form was rendering "40" as a bare sliver of "4" and "18" as "1" — you could not read the weight you were about to save. The new editor, nested one level deeper, made it total (7px content box, nothing visible), which is how it surfaced. Fixed with an `.input-stepper` class in `globals.css` (declared there rather than as a Tailwind `px-1` utility because `.input` is **unlayered** CSS, which outranks anything in Tailwind's utilities layer — a utility class would have silently lost), plus `px-2 py-3` instead of `p-3` on the editor form. Confirmed via `scrollWidth > clientWidth` measurements that all four fields on both forms are now unclipped. The 44px tap targets on the ± buttons themselves are untouched.

**Item 4** (`layout.tsx` + new `viewport-config.ts`, +2 tests): removed `maximumScale: 1`, which blocked pinch-to-zoom *and* Safari's per-site "aA" text-size control on iOS — the only two mechanisms mobile Safari offers to enlarge an under-sized page, since it does not apply the OS "Larger Text" setting to arbitrary page CSS. WCAG 1.4.4/1.4.10. Tailwind's utilities are already `rem`-based and `globals.css` sets no fixed root `font-size`, so this is the whole fix. The viewport object moved into its own module purely so it stays unit-testable (importing `layout.tsx` pulls in `next/font/google`, which doesn't load under vitest, and this codebase has no `vi.mock` usage anywhere — introducing one for a single test would have been a new pattern). Confirmed the served HTML now emits exactly `content="width=device-width, initial-scale=1"` with no `maximum-scale`/`user-scalable`.

**Verification**, live against the real dev DB and the real signed-in account (the user signed in manually — the app is Google-OAuth-only, so this can't be automated). Used Día 5 ("Pierna completa") for a throwaway session deliberately, since Día 2 was the day suggested for today and the user could plausibly train it for real mid-session. On a unilateral exercise ("Sentadilla búlgara con apoyo"): logged the exact complaint scenario (40kg × **18** reps), corrected it in the UI to 8 reps with pain 0→5 and a note, and confirmed via direct query that reps/pain/notes changed, `updated_at` was stamped, and `set_number`/`exercise_log_id` were untouched; the editor auto-closed and the row rendered "Set 1 · Der · editado". Logged two more sets, deleted the **middle** one through the two-step UI confirm, and confirmed survivors renumbered 1,2 (the 44kg set moving from #3 to #2) — then saved another set and confirmed it landed at **3 with no duplicate**, which is precisely the collision that would have occurred without `renumberSets`. Completed the session and confirmed editing still works from the completed summary (40.00 → 41.50 persisted, 3 edit affordances, no logging form). Finally confirmed the corrected pain score genuinely drives the safety gate, not just storage: `buildProgressionSuggestion` over the real rows returned `reduce_or_modify` off the edited pain of 5. Before all of this, a repository-level throwaway vitest file (written-run-deleted, never committed, per this project's precedent) exercised in-place correction, ownership refusal for both update and delete against a stranger profile id, middle-delete renumbering, the post-delete collision, and the unilateral planned/bonus split.

**Cleanup confirmed**: the throwaway session was deleted and a follow-up query showed exactly the pre-existing state — 1 real completed session, 7 real sets, **0 sets marked edited**, 0 orphan `exercise_log` rows, 1 active plan, and day 5's `target_sets` unchanged. Local screenshot/snapshot artifacts removed too.

**Deferred deliberately, with the reasoning captured**:
- **Item 3 (substitute/swap an exercise)** — direction already confirmed by the user (curated `substitutionOptionsEs` *or* any exercise already in the plan, creating a real tracked `exercisePrescription`, plus a short reason prompt so "no me sentí bien" is captured rather than silently absorbed — a physio point: that trigger is a *symptom report*, and skipping the exercise means no set is logged, so the signal would vanish entirely). Note the kickoff prompt's trade-off is **inverted**: a "lighter session-scoped override" is the *expensive* option, because `exerciseLog.exercisePrescriptionId` is NOT NULL and an override would need a new column plus a coalesce in `getPreviousExercisePerformance`, `getRecentExerciseInstancesByName` and `toExerciseSeriesGroups`; a real prescription row needs **zero** schema change. One question stays genuinely open: whether a substitute *appends to* or *replaces* the exercise in the active plan's day template. Also worth stating plainly: with no muscle-group taxonomy, the app **cannot** algorithmically judge whether a swap preserves a movement pattern, so it should offer curated options and a caution rather than pretend to grade substitutions.
- **Item 5 (dashboard)** — deferred on **evidence**, not size. Checked against the real dev DB: (a) **zero exercises have 2+ completed instances**, and a progression line needs 2 points, so a grouped dashboard would render essentially empty today and could not be verified; (b) grouping by day template **is not a partition** — "Core" appears in all 5 day templates and "Extensión de tríceps en máquina o polea" in 2, while `toExerciseSeriesGroups` groups by name across all history, making name→group many-to-many; (c) `loadMechanism` is `machine` for **all 28** exercises on the real active plan, so that axis collapses to compound (10) vs. isolation (18), bucketing calf raises with bicep curls. Revisit once real history accumulates. Grouping "by muscle group" as literally requested would reopen the taxonomy decision this project explicitly declined (see `schema.ts`'s `loadMechanism` comment and the 2026-08-02 entry) — the user's call to make, not a quiet schema addition.

Files touched: `src/db/schema.ts` (+`set_log.updated_at`), `drizzle/0016_sharp_screwball.sql` (new, applied), `src/workouts/set-editing.ts` (new, +test), `src/workouts/workout-repository.ts`, `src/app/entrenar/actions.ts`, `src/app/entrenar/[sessionId]/page.tsx`, `src/app/entrenar/[sessionId]/session-runner.tsx` (+test), `src/app/submit-button.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/viewport-config.ts` (new, +test), and `updatedAt: null` added to the `SetLog` fixtures in `exercise-series.test.ts`/`improvement.test.ts`/`progression-view.test.ts`.

Next iteration: deploy and commit when asked (neither done yet). **Still open, and only the user can do it**: the real-iPhone check for item 4 — confirm text enlarges with Settings → Accessibility → Display & Text Size → Larger Text turned up, that pinch-zoom works, and that the fixed bottom nav doesn't break while zoomed. Playwright confirms the meta tag and the rem-based CSS but cannot observe iOS's own text-scaling behavior.

## 2026-08-05 — Deployed and committed the "Ver técnica en YouTube" tap target

Status: shipped. Committed as `8459052` on `main` (`feat: add a minimalistic "Ver técnica en YouTube" tap target`). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` and `/guia` HTTP 200, `/entrenar` and `/plan/rutina` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do). Confirmed no workout session was active at deploy time via a direct DB query (using the corrected `grep '^DATABASE_URL='` pattern, not the earlier flawed one — see below).

Next iteration: none queued. The real-iPhone check of the universal-link handoff to the installed YouTube app is still open — see the entry below. See the entry below for the feature's full design/verification detail.

## 2026-08-05 — "Ver técnica en YouTube": a minimalistic search-handoff tap target

Status: code complete, `lint`/`typecheck`/`test` (317 passing, +6 new)/`build` all green. No schema/migration. Not yet deployed/committed. Verified live against the real dev DB.

Kicked off from `docs/product/youtube-technique-lookup-kickoff-prompt.md` as a single-phase principal-mobile-product-designer session: decide placement/scope/mechanism, then build. Three genuine forks confirmed via `AskUserQuestion` before implementing (same pattern as prior features):

- **Mechanism/visual**: a hand-written inline SVG play-button icon (no icon library — none exists as a dependency in this app, confirmed before starting), icon-only with an `aria-label`, next to the exercise name — not a text link like `/guia`'s "¿Por qué esta sugerencia?". Plain `<a href="https://www.youtube.com/results?search_query=...">`, `target="_blank"` — no custom `youtube://` scheme or app-detection JS; iOS Safari's own universal-link handoff to the installed YouTube app is the whole mechanism.
- **Scope**: the broadest of the three offered tiers — session-runner's live current-exercise card (`/entrenar/[sessionId]`), the completed-session summary in that same file, every plan-preview page that renders `PlanExerciseCard` (`/plan/rutina`, `/plan/templates/[id]`, `/plan/historial/[planId]`, all sharing one component via `PlanDayPager`), and the plan builder (`session-editor-form.tsx`) while defining exercises.
- **Query content**: `exerciseNameEs` + "técnica", plus "unilateral" appended only when `isUnilateral` is true **and** the Spanish name doesn't already contain the literal word "unilateral" (checked against real template data: "Prensa unilateral" already says it and isn't duplicated; "Sentadilla búlgara con apoyo" doesn't, and gets it appended) — plus `exerciseNameEn` in parentheses when present (currently null on every real exercise; the field stays unused today but the wiring is real, matching the standing "don't remove English support fields, decide deliberately on using them" constraint).

**New pure module** `src/training/youtube-technique.ts` (`buildYoutubeTechniqueQuery`/`buildYoutubeTechniqueSearchUrl`), matching this codebase's pattern of plain `.ts` modules for URL/string-building logic (alongside `rir.ts`/`duration.ts`) — fully unit tested including the exact edge cases above. Shared component `src/app/youtube-technique-link.tsx` (`YoutubeTechniqueIcon` + `YoutubeTechniqueLink`) reused in session-runner and the plan-preview card. The builder needed a different wiring: its name input and unilateral checkbox are uncontrolled (read straight from the DOM on submit, an existing pattern in that file) — a controlled-state button would have needed new state just for this. Instead the button reads both inputs via `ref`s at click time and calls `window.open` directly, so it always reflects whatever's currently typed, not stale React state. One real bug caught by the component test suite: the icon button was first placed *inside* the `<label>` before the `<input>`, which made it the first labelable descendant and broke implicit label association (`getByLabelText("Nombre del ejercicio")` started resolving to the button) — fixed by moving the button outside the label, as a flex sibling.

**Verification, and a real methodological mistake caught mid-session**: live-checked all four scope areas via Playwright at 390×844 against the real dev DB — the active current-exercise card (bilateral "Press de pecho en máquina" and, after finding the plan's one non-self-describing unilateral exercise via a direct query, "Sentadilla búlgara con apoyo" → correctly appended "unilateral"), the completed-session summary (5 real exercises, all already-named-unilateral cases correctly *not* duplicated), `/plan/rutina`, and the builder (typed "Zancada" + checked Unilateral, clicked the button, confirmed a new tab opened to the exact right URL). Mid-verification, a cleanup check revealed `export $(grep DATABASE_URL .env.local | xargs)` — the exact pattern used for DB checks in prior sessions — silently picks up **both** the active `DATABASE_URL` line and a commented-out second line further down the same file (a leftover alternate Neon branch, `ep-silent-flower`), and `export` applies them in order so the commented one wins. Every "no active session"/"no leftover rows" check earlier in this session had actually queried the wrong, stale branch. Re-ran every check against the correct branch (`grep '^DATABASE_URL=' .env.local`) once caught: found and deleted 2 real throwaway `workout_session` rows (created just by visiting `/entrenar/[sessionId]` for an unstarted day — the row is created eagerly on view, not lazily on first set save, a real behavior worth knowing for future throwaway-session verification in this project) and 1 real throwaway draft `workout_plan` — all confirmed zero-residue afterward, and the real account's one legitimate completed session (`0ded4e9b…`, pre-existing, untouched) and one real active plan verified unchanged. Also found and killed two stale, days-old orphaned processes at session start (a `next dev` server running since Jul 31 on port 3000, and a Playwright Chrome instance running since Monday) that were silently serving/holding state from before this session.

Files touched: `src/training/youtube-technique.ts` (new, +test), `src/app/youtube-technique-link.tsx` (new), `src/plans/plan-preview.ts` (+`nameEn` field), `src/app/entrenar/[sessionId]/session-runner.tsx`, `src/app/plan/plan-page-content.tsx`, `src/app/plan/builder/session/[dayIndex]/session-editor-form.tsx`.

Next iteration: deploy and commit when asked (neither done yet). The universal-link handoff to the installed YouTube app (vs. the mobile web results page) still needs a real-iPhone check, per the kickoff prompt — Playwright/dev-DB verification confirms the URLs and rendering are correct but can't observe iOS's own app-handoff behavior.

## 2026-08-03 — Deployed and committed bonus-set logging + the `/guia` page

Status: shipped. Committed as `f039f89` on `main` (`feat: let a set exceed the plan, and add a RIR/AMRAP/progression guide`) — bundled both of this session's undeployed pieces into one commit, per this project's established pattern for stacked work. The first commit attempt failed with 1Password's SSH signing agent ("failed to fill whole buffer" — locked), succeeded on retry once unlocked, same failure mode this project has hit before. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` and `/guia` HTTP 200, `/entrenar` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do). Confirmed no workout session was active at deploy time via a direct DB query — the account's only recent session was already `completed`.

Next iteration: none queued. See the two entries below for what shipped.

## 2026-08-03 — `/guia`: explaining RIR, AMRAP-to-failure, and the progression math

Status: code complete, `lint`/`typecheck`/`test` (310 passing)/`build` all green. No schema/migration. Not yet deployed/committed.

Same-session follow-up to the bonus-set work below. User asked for two role passes: first an experienced personal trainer working with a physiotherapist to define RIR, AMRAP-to-failure, and the progression math in clear language; then a principal-mobile-designer pass on where that content actually lives in the app, with a new page and a Home entry point.

**Content**, written directly rather than invented — grounded in what's already implemented (`suggestProgression`/`suggestNextWeightKg` in `src/training/progression.ts`/`src/workouts/progression-view.ts`, `docs/product/progression-rules.md`, the existing `rirLabelsEs` scale):
- **RIR**: the existing 5-value scale (4+/3/2/1/0) plus the coaching rationale for RIR 2 as the default target and the physio rationale for not training to failure every session (technique breaks down exactly when fatigue is highest, which is when pain shows up).
- **AMRAP-to-failure**: defined as an intentional RIR-0 set, with a hard physio rule (never on a pain-flagged exercise, never after existing pain that session, never on a brand-new exercise) — and tied explicitly to the bonus-set feature shipped just before this: an AMRAP is one kind of bonus set, and the app already treats bonus-set pain and bonus-set performance differently (see below).
- **The math**: the actual 5-step order `suggestProgression` evaluates (pain first, then top-of-range, then average RIR, then the increase percentages by load mechanism, then the hold fallback), stated as the exact logic, not a simplified paraphrase — including that bonus sets count for pain but not for the RIR/rep-range signals, directly referencing the bonus-set work.

**Placement**, confirmed via `AskUserQuestion` (all four recommended options): new route `/guia`, not a 6th bottom-nav tab (the nav is a fixed 5-column grid — this is one-level-deep reference material, same pattern as `/mediciones`, `backTo: { href: "/", label: "Inicio" }`). Three `<details>`/`<summary>` accordion sections (RIR / AMRAP / math), collapsed by default, matching the accordion pattern `session-runner.tsx` already uses for "¿Cómo te sentiste?". A persistent card on Home ("¿Qué significa RIR?") visible in every auth/onboarding state, not gated to first-time users — it's ongoing reference material, not a one-time explainer. A contextual "¿Por qué esta sugerencia?" link next to the progression-suggestion box in `session-runner.tsx`, deep-linking to `/guia?open=matematica` — implemented as a plain server-side `searchParams.open` read (validated against a small allowlist) that sets the matching `<details open>` attribute, no client JS/hash-scroll hackery needed. The page itself needs no auth (pure static content, no user data), so it's reachable signed-out too.

Verified live: the Home card renders and links correctly for the real signed-in account; all three accordion sections expand with correct content (table, physio callout, ordered math steps) via Playwright; the `?open=matematica` deep link pre-expands only that section, the other two stay collapsed. Did **not** re-verify the `/entrenar` contextual link live end-to-end: mid-verification, a direct DB check (routine after any live `/entrenar` testing this session) showed the real account's "Prensa unilateral" exercise had picked up 7 real sets (20kg × 7 reps, RIR alternating 1/3, pain 0, timestamps 19:11–19:15 today) and the session had moved to `completed` — none of that matches any throwaway pattern used earlier this session (always round numbers like 15/20/50kg at flat reps, sessions always left `active`), so it reads as the user's own real concurrent workout. Left entirely untouched, flagged here rather than silently worked around, and added a direct RTL assertion on the new link's `href` in `session-runner.test.tsx` instead of generating more live activity against the real account while it might be in active use.

Files touched: `src/app/guia/page.tsx` (new), `src/app/home-shell.tsx`, `src/app/entrenar/[sessionId]/session-runner.tsx` (+test).

Next iteration: deploy and commit when asked (neither done yet).

## 2026-08-03 — Bonus-set logging past `targetSets`, with a real coaching judgment first

Status: code complete, `lint`/`typecheck`/`test` (310 passing, +18 new)/`build` all green. No schema/migration. Not yet deployed/committed.

Kicked off from `docs/product/extra-set-kickoff-prompt.md` — user feedback that an exercise configured for 2 sets couldn't be pushed to 3+ mid-session. Two-phase session, phase 1 deliberately not skippable: a real strength-coaching judgment before any UX work, since the prompt named a concrete, verified risk rather than a hypothetical one.

**Phase 1 verdict**: yes, allow it. RIR/pain-based autoregulation already assumes day-to-day training capacity varies — a hard wall at `targetSets` fights the app's own premise, and the backend (`saveSetForSession`) never enforced a cap anyway; the block was purely a UI dead-end (`isExerciseComplete()` in `session-runner.tsx` swapping the logging form for a static "Series objetivo completadas" paragraph, confirmed local to that one file via a repo-wide grep — nothing else reads it). But traced `suggestProgression` (`src/training/progression.ts`) line by line before concluding anything: `maxPain`/`averageRir` and `reachedTopOfRange = sets.every(...)` ran over *every* logged set, so a bonus set's different character — a lighter deliberate backoff set, an AMRAP-to-failure set — could silently veto or dilute what the *planned* sets actually earned, and `previousLastSet = previousPerformance.sets.at(-1)` anchored the next suggested weight on whatever was logged last, bonus or not. Drew a line between the two: pain is a safety brake (any set, any time, should still trip it — no change there), while RIR average / top-of-range / rep-drop / anchor weight are performance-condition signals that should reflect the *prescribed* work specifically.

One more concrete data point found live, not assumed: the leg-priority template's own Spanish safety copy (verified on `/entrenar` against the real active session) already says "no agregues series extra a la pierna delgada sin valoración profesional" — the app's own content already takes a position on the unilateral-asymmetry question, which shaped the phase 2 design rather than being paved over by a generic control.

**Phase 2**, confirmed via `AskUserQuestion` before implementing (all four recommended options accepted): a muted "+ Agregar un set extra" button (not a toggle) replaces the dead-end, reopening the same logging form for exactly one more set, then collapsing back — repeatable, so every bonus set stays a small deliberate choice rather than an unlimited unlock. An inline "¿Hacer esto tu nuevo objetivo? (N series)" offer appears after saving a bonus set, writing `exercisePrescription.targetSets` directly via a new `updateExercisePrescriptionTargetSets` (ownership-scoped, joins through `planSessionTemplate`/`workoutPlan`) — deliberately *not* routed through the existing `/plan/builder` draft-clone-and-reactivate flow, since that would mint a whole new plan version just to bump one integer, and a plain column update is safe regardless of logged history (unlike deleting a row, `exerciseLog.exercisePrescriptionId`'s `onDelete: "restrict"` doesn't block an update). Progression math: `splitPlannedAndBonusSets` (new, `progression-view.ts`) classifies each logged set as planned or bonus purely from its position vs. `targetSets` (per side for unilateral) — no schema change, computed at read time so a just-accepted "make this the new target" bump retroactively reclassifies that session's own sets as planned, consistently. `suggestProgression` now takes an `isBonus` flag per set: `maxPain` still scans everything, but `averageRir`/`reachedTopOfRange`/`hasSharpRepDrop`/`hasNegativeNote` use planned sets only. Unilateral bonus mode: neither side's radio is disabled (both legitimately already "complete"), the default side flips away from the measurement-derived thinner side on a tie (previously bonus mode would always land on "Derecha" via the normal-mode asymmetric fallback, which don't apply once both sides are already complete), and a caution paragraph appears — generic, driven by the same `smallerSideHint` used for the side default, not hardcoded to any one template's copy.

Verified live against the real dev DB and the real active account/session, not just unit tests: reached target on both a bilateral exercise ("Prensa bilateral," 3→4 sets, accepted the persist offer, confirmed via direct query that `target_sets` became 4) and a unilateral one ("Extensión de cuádriceps unilateral," 2/2 both sides, bonus mode, thinner-side caution rendered). Screenshotted the original dead-end live before changing anything, per the kickoff prompt's instruction. One real bug caught this way, not by unit tests: the pre-existing tie-break note ("según tus mediciones... se preseleccionó primero") kept firing during bonus mode and contradicted the actual selection once the bonus-mode default started deliberately picking the *opposite* side — fixed by gating that note to non-bonus mode only. All throwaway sets and the `targetSets` bump created during this verification were deleted/reverted directly against the dev DB afterward (`DELETE`/`UPDATE` + a follow-up `SELECT` confirming zero leftover rows and `target_sets` back to 3) — the account's real training history and its real active plan's real configuration are unchanged.

Files touched: `src/training/progression.ts` (+test), `src/workouts/progression-view.ts` (+test, new `splitPlannedAndBonusSets`), `src/plans/plan-repository.ts` (new `updateExercisePrescriptionTargetSets`), `src/app/entrenar/actions.ts` (new `updateTargetSetsAction`), `src/app/entrenar/[sessionId]/page.tsx`, `src/app/entrenar/[sessionId]/session-runner.tsx` (+test, rewrote the test file's render calls through a shared `renderRunner` helper since `updateTargetSetsAction` became a new required prop).

Next iteration: deploy and commit when asked (neither done yet).

## 2026-08-02 — Deployed and committed the standardized back-navigation pattern

Status: shipped. Committed as `9c2c550` on `main` (`fix: standardize back-navigation to one AppShell-owned pattern`) — the first commit this session that needed a retry: 1Password's SSH commit-signing agent failed once with "failed to fill whole buffer" (likely locked), succeeded on retry after the user unlocked it. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` HTTP 200 and `/mediciones` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do).

Next iteration: none queued. See the entry below for the fix's design/verification detail.

## 2026-08-02 — One standard back-navigation pattern, replacing three inconsistent ones

Status: code complete, `lint`/`typecheck`/`test` (295 passing)/`build` all green. No schema/migration. Not yet deployed/committed. Verified live against the real active account across 4 pages spanning every category of the fix (`/mediciones`, `/plan/builder`, `/entrenar/[sessionId]` — including the real in-progress session the user has going on the leg-priority plan — and `/plan/rutina`), read-only throughout.

User feedback, with concrete examples: navigating into a template detail page has a "← Volver a plantillas" link, but `/plan/templates` itself, `/plan/historial`, `/plan/builder`, and `/plan/builder/session/[dayIndex]` had no way back except re-tapping the bottom-nav "Plan" tab; `/mediciones` had no way back to Perfil at all. Audited all 17 route files (29 `AppShell` call sites) before touching anything, rather than just patching the pages named — found the real picture was worse than "some pages missing a back link": **three different back-navigation treatments already coexisted**, plus a fourth "nothing" case:
- A small top-of-page text link, "← Volver a X" (`/plan/rutina`, `/plan/historial/[planId]`, `/plan/templates/[templateId]`, `/perfil/reiniciar`) — itself in two slightly different styles (with vs. without a focus-visible ring).
- A full-width button at the *bottom* of the page, "Volver a Plan," no arrow (`/plan/historial`, `/plan/compartir`).
- Nothing at all (`/plan/templates` list, `/plan/builder`, `/plan/builder/session/[dayIndex]`, `/mediciones`, `/entrenar/[sessionId]`, and one more found during the audit that hadn't even been flagged: `/plan/compartir/[code]`, the share-redemption landing page).

**The fix lives in one place**: every page in this app already renders through a single shared `AppShell` component (used for the bottom nav). It gained a new, deliberately *required* prop — `backTo: { href: string; label: string } | null` — required rather than optional so a future new page can't silently ship without a deliberate answer either way; `null` is reserved for the 5 bottom-nav home pages (`/`, `/perfil`, `/plan`, `/entrenar`, `/progreso`), where the nav tabs themselves already are the back-navigation. Every other page now renders one consistent "← Volver a {label}" at the top, in one place, styled once (`text-sm font-semibold text-emerald-300`, `focus-visible` ring, `min-h-11` tap target per this project's existing 44px accessibility convention) — not copy-pasted per page in three different ways.

Migrated the 6 pages that already had *something* onto the new prop (removing their inline `Link`/bottom-button markup entirely) and added `backTo` to the 7 pages that had nothing — 5 originally flagged plus `/plan/compartir/[code]`, found during the audit. Back targets: `/plan/templates`→Plan, `/plan/builder`→Plan, `/plan/builder/session/[dayIndex]`→"tu borrador" (not "el borrador" — bare `a el` isn't valid Spanish, needed the possessive), `/mediciones`→Perfil, `/entrenar/[sessionId]`→Entrenar, `/plan/compartir/[code]`→Plan (a share link is an external entry point, so Plan is the sane default landing target rather than "back" to anywhere specific).

TypeScript caught the whole migration mechanically — every one of the 29 call sites needed a real decision (no way to leave one unmigrated and have it silently compile), which is exactly the point of making the prop required instead of optional.

Files touched: `src/app/app-shell.tsx`, plus all 17 route files that render it — `home-shell.tsx`, `perfil/page.tsx`, `perfil/reiniciar/page.tsx`, `progreso-page-content.tsx`, `plan-page-content.tsx`, `plan/historial/page.tsx`, `plan/historial/[planId]/plan-history-detail-content.tsx`, `plan/compartir/page.tsx`, `plan/compartir/[code]/page.tsx`, `plan/rutina/plan-detail-content.tsx`, `plan/templates/templates-page-content.tsx`, `plan/templates/[templateId]/template-preview-content.tsx`, `plan/builder/builder-page-content.tsx`, `plan/builder/session/[dayIndex]/page.tsx`, `entrenar/entrenar-page-content.tsx`, `entrenar/[sessionId]/session-runner.tsx`, `mediciones/page.tsx`.

Next iteration: none queued. Deploy and commit when asked.

## 2026-08-02 — Deployed and committed the "Readaptación" template

Status: shipped. Committed as `344237a` on `main` (`feat: add "Readaptación" template from a user-supplied infographic`). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` HTTP 200 and `/plan/templates` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do).

Next iteration: none queued. See the entry below for the template's design/verification detail.

## 2026-08-02 — A fourth template: "Readaptación" (4-week return-to-training) from a user-supplied infographic

Status: code complete, `lint`/`typecheck`/`test` (295 passing)/`build` all green. No schema/migration — templates are pure code. Not yet deployed/committed. Verified live at `/plan/templates/readaptation` (read-only preview only).

User supplied an infographic image ("Plan de entrenamiento — Readaptación (4 semanas)"): a 5-day (Lun-Vie) return-to-training plan built around one "ejercicio estrella" (star exercise) per day that gets real week-over-week progression, while the day's other exercises "complementan el trabajo" without the same progression pressure — plus a Wednesday active-recovery day (cardio + mobility + core, no lifting) instead of a sixth muscle-group split. Followed the same pattern as the other three templates (`seeded-plan.ts`/`fat-loss-plan.ts`/`leg-priority-plan.ts`) — local `strengthEx`/`durationEx` helpers, wired into `plan-templates.ts` as a fourth catalog entry (`id: "readaptation"`).

**Adaptation calls, all flagged in the file's own header comment**:
- **No RIR given anywhere in the source** (unlike the two prior PDF/infographic sources, which at least had a scheme or an implicit target) — approximated as RIR 2 for each day's star exercise (the one meant to genuinely progress) and RIR 3 for everything else, matching the source's own "complementar el trabajo, sin progresar tan agresivo" framing and the plan's overall conservative "volver con seguridad" theme.
- **The 4-week %-of-previous-weight progression schedule** (semana 1: ~70%, semana 2: 80-85%, semana 3: pesos habituales, semana 4: +2-5% on the star exercise only) has no week-indexed home in this schema — folded into `safetySummaryEs` as ongoing reference guidance instead of an enforced week counter, the same adaptation `fat-loss-plan.ts` made for its own week-numbered source.
- **A probable labeling slip in the source**: "Viernes: Sentadilla sumo" is listed as a star exercise, but sentadilla sumo is a Jueves (Thursday) exercise in the same infographic — treated as Thursday's second star rather than transcribed literally, with the reasoning documented in the code comment.
- **Miércoles's "Movilidad de cadera / Movilidad de hombros / Estiramientos" bullets have no explicit sets/reps/duration** in the source (unlike every other line item, which all have explicit prescriptions) — folded into that day's `mobilityNotesEs` rather than inventing discrete exercises with a made-up duration.
- **Timed holds modeled as duration-type, not reps**: "Plancha" (3×40s) and "Plancha lateral" (3×30-40s por lado, also unilateral) are isometric holds with an explicit time in the source, so they use `prescriptionType: "duration"` — matching `fat-loss-plan.ts`'s precedent for timed core/carry work.

Verified two ways: `readaptation-plan.test.ts` (new) checks schema validity, day count and exercise-count bounds (including Miércoles's lighter 4-exercise day), the RIR 2/3 star/non-star split, the Thursday-two-stars fix, duration-type modeling for the three timed holds, and every unilateral flag (sentadilla búlgara, bird dog, remo unilateral, plancha lateral) — plus the existing `plan-templates.test.ts` picked it up automatically. Then a live read-only walkthrough of `/plan/templates/readaptation` (Día 1 and Día 3 screenshotted): 28 exercises total across 5 days, star/non-star RIR and copy rendering correctly, Miércoles's duration-type cardio/core block rendering correctly. **The account now has a real active plan** (the leg-priority template from the previous entry, activated by the user between sessions), which gates `/plan/templates` behind an active-plan redirect — used the exact same temporary-bypass-then-revert pattern already established in this project's history (commented out via `&& false`, screenshotted, then reverted immediately; confirmed clean via `git diff` showing zero changes to either `page.tsx`) rather than touching the real active plan to get access.

Files touched: `src/plans/readaptation-plan.ts` (new, +test), `src/plans/plan-templates.ts` (+1 catalog entry, extended `PlanTemplateId`).

Next iteration: none queued. Deploy and commit when asked. Activating this template (replacing the currently-active leg-priority plan) is the user's call, not done as part of this change.

## 2026-08-02 — Deployed and committed the leg-priority template + measurement-based side default

Status: shipped. Committed as `2469330` on `main` (`feat: add leg-priority template; default unilateral side from measurements`). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` HTTP 200 and `/plan/templates` HTTP 307-to-auth confirmed; no schema change, nothing for the automatic migration step to do).

Next iteration: none queued. See the two entries below for what shipped.

## 2026-08-02 — Unilateral side default now keys off real measurements, not a hardcoded "left"

Status: code complete, `lint`/`typecheck`/`test` (288 passing)/`build` all green. No schema/migration. Not yet deployed/committed.

Immediate follow-up to reviewing the new leg-priority template against the user's real body measurements (thigh/calf/arm all ~5-6% smaller on the right). That review surfaced a real, concrete bug: `session-runner.tsx`'s side-selector tie-break (`leftCount <= rightCount ? "left" : "right"`) always defaulted to Izquierda at the start of every unilateral exercise, regardless of which leg is actually thinner — directly contradicting this plan's (and the app's own existing unilateral-progression docs') core rule of starting with the weaker/thinner side. Confirmed the user's real numbers before touching code: right thigh 51cm vs left 54cm, right calf 36cm vs left 38cm, right arm 33cm vs left 35cm — right consistently smaller, so their sessions should default to Derecha, not Izquierda.

**`src/measurements/measurement-schema.ts`**: `calculateMeasurementGaps` gained `armGapCm` (was thigh/calf only — arms were tracked in the historial display but never had gap math, an existing inconsistency noted in an earlier entry). New `determineSmallerSide(measurement)` sums whichever limb gaps are actually available (thigh/calf/arm — not all three required, so it degrades gracefully with partial data) and returns `"left" | "right" | null`; null on no data or a genuine tie, so callers keep their own default rather than being forced into a guess. Deliberately body-region-agnostic (sums across all paired limbs rather than trying to guess "this exercise is a leg exercise") since this schema has no per-exercise muscle-group classification to be more precise, and adding one would be exactly the kind of exercise-taxonomy scope creep this codebase has explicitly avoided before (see `loadMechanism`'s own doc comment in `schema.ts`).

**`session-runner.tsx`**: `defaultSide`'s tie-break now uses the new hint (falling back to "left" when there's no measurement data, preserving today's behavior for anyone without saved measurements) — the fewer-sets-goes-next logic for every *non-tied* case is completely unchanged. A small note ("Según tus mediciones, tu lado derecho es más delgado — se preseleccionó primero") only appears when the hint actually resolved a tie, so it's not noise once a session is underway. The hint is computed server-side in `/entrenar/[sessionId]/page.tsx` from the profile's single most recent measurement (`getRecentBodyMeasurementsForProfile(profile.id, 1)`) and passed down as a plain prop — no new client-side data fetching.

Verified against the user's exact real numbers in `measurement-schema.test.ts` (`determineSmallerSide` with their real thigh/calf/arm values resolves to `"right"`), plus new `session-runner.test.tsx` cases for: no-hint falls back to Izquierda with no note shown, a hint resolves a tie to the correct side with the note visible, and a hint does *not* override the fewer-sets-goes-next rule when the sides aren't actually tied. Did not verify end-to-end against the real account: the measurement row the user shared (via a raw SQL INSERT, for context) was never actually written to the real DB — confirmed via a direct query, table's empty — and inserting real health data on their behalf without being asked wasn't the ask here. The fix itself doesn't depend on that row existing; it activates automatically whenever they do save a measurement.

Files touched: `src/measurements/measurement-schema.ts` (+test), `src/app/entrenar/[sessionId]/page.tsx`, `src/app/entrenar/[sessionId]/session-runner.tsx` (+test).

Next iteration: none queued. Deploy and commit when asked.

## 2026-08-02 — New template: "Hipertrofia con prioridad en piernas" from a user-supplied PDF

Status: code complete, `lint`/`typecheck`/`test` (281 passing)/`build` all green. No schema/migration — templates are pure code, not DB rows. Not yet deployed/committed. Verified live at `/plan/templates/hypertrophy_legs` (read-only preview only — did not tap "Activar este plan", since activating is a real commitment the user didn't ask for, just the template itself).

User supplied `/Users/jcvalerio/Downloads/Plan_detallado_entrenamiento_semanal.pdf`, a detailed 5-day, all-machine hypertrophy plan built around an explicit unilateral-leg-priority protocol (always lead with the thinner/weaker leg, the stronger leg matches its weight and never exceeds its reps) and a per-set RIR scheme (e.g. "3-2-2" for the first/second/third effective set). Read the PDF directly, then followed the existing template pattern exactly (`seeded-plan.ts`/`fat-loss-plan.ts`) rather than inventing a new shape — a local `strengthEx` helper builds each exercise, wired into `plan-templates.ts` as a third catalog entry (`id: "hypertrophy_legs"`).

**Two adaptation calls, both because this schema is flatter than the source document**, matching the same kind of judgment call `fat-loss-plan.ts` already made for its own source material:
- **Per-set RIR scheme → one `targetRir`.** This schema has a single RIR per exercise (used only as the default pre-selected value when logging a set and in display copy — confirmed it's not read by the progression-suggestion algorithm, so this choice is low-stakes). Used the *last* (hardest) set's RIR as `targetRir`, and kept the full scheme verbatim in `notesEs` (e.g. "RIR 3-2-2 por serie...") so it's still visible while training.
- **"Core" is a free choice with a rep-or-duration range** ("8-15 reps o 20-40s isométrico") — modeled as strength/8-15 reps since this app's set-logging flow is rep-first, with the isometric alternative noted in `notesEs`.

Every exercise in the source is machine/cable-based (no barbell/dumbbell work at all), so `loadMechanism: "machine"` throughout — `isCompound` set per exercise by joint count (presses/prensa/jalón/remo/peso muerto rumano/hip thrust/sentadilla búlgara true; single-joint isolation work false). `painSensitive` hand-set per exercise (not the substring heuristic `seeded-plan.ts` uses, since "prensa" doesn't literally contain "press") for the loaded compound/joint-stress movements the source's own clinical language calls out. The plan-level `safetySummaryEs` folds in the source's approach-set guidance, RIR definition, the unilateral rule, the 2.5-5% progression rule, and stop-the-set criteria; each session's `mobilityNotesEs` carries the source's day-specific lower/upper mobility routine plus that day's approach-set guidance.

Verified in two layers: `leg-priority-plan.test.ts` (new) checks schema validity, day count, exercise-count bounds, that every source-unilateral exercise is flagged unilateral, that the RIR-scheme-to-`targetRir` mapping is correct, that every strength exercise is `loadMechanism: "machine"`, and that Core is rep-based everywhere — plus the existing `plan-templates.test.ts` picked it up automatically (it loops over the whole catalog, so no changes needed there). Then a live read-only walkthrough of the real `/plan/templates/hypertrophy_legs` preview (Día 1 and Día 3 screenshotted) confirmed the day-pager, exercise cards, RIR/rest copy, unilateral badges, and plan-level safety summary all render correctly — 28 exercises total across 5 days, matching a manual count of the source PDF.

Files touched: `src/plans/leg-priority-plan.ts` (new, +test), `src/plans/plan-templates.ts` (+1 catalog entry, extended `PlanTemplateId`).

Next iteration: none queued. Deploy and commit when asked. Activating the template for real (replacing the currently-empty plan slate — the account has zero plans right now, post-reset) is the user's call, not done as part of this change.

## 2026-08-02 — Deployed and committed pecho/caderas (chest/hips) measurements

Status: shipped. Committed as `0305f98` on `main` (`feat: add pecho/caderas (chest/hips) to body measurements`). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` HTTP 200 and `/mediciones` HTTP 307-to-auth confirmed; migration 0015 ran automatically as part of the build, consistent with how every prior schema change in this project has deployed).

Next iteration: none queued. See the entry below for the feature's design/verification detail.

## 2026-08-02 — Added pecho/caderas (chest/hips) to body measurements

Status: code complete, `lint`/`typecheck`/`test` (275 passing)/`build` all green. Migration `drizzle/0015_moaning_warbird.sql` (two nullable columns, additive, zero backfill needed) generated and applied to the dev DB, verified via `information_schema.columns`. Not yet deployed/committed.

User feedback: mediciones was missing chest and hips. Treated both as single circumference values (not left/right paired) — matching `waistCm`, not the thigh/calf/arm pattern, since chest and hips don't have a meaningful asymmetry-gap use case the way limbs do.

Followed the existing `waistCm` treatment end to end for consistency, touching every layer that field already touches: `bodyMeasurement.chestCm`/`hipsCm` in the schema; `measurementNumericFields`, the Zod schema, and form-data parsing in `measurement-schema.ts`; the insert in `measurement-repository.ts`; a first-vs-latest delta in `measurement-trend.ts` (`BodyMeasurementTrend.chestCm`/`hipsCm`); two new inputs on `/mediciones`'s form (next to Peso/Cintura) and two new fields in the historial card; and two new trend lines on `/progreso`'s "Tendencia corporal" card, styled identically to the existing Peso/Cintura lines. Deliberately did **not** extend `MeasurementSeriesChart`'s Peso/Cintura toggle to include chest/hips — that's a bigger, un-asked-for scope increase (a 4-way toggle) versus the text-delta parity that was actually requested; flagged here in case it's wanted later.

Verified in two layers, neither touching the real account's real measurement history: a throwaway vitest file (written, run against the real dev DB with `DATABASE_URL` exported into the shell, then deleted — same precedent as the reset-feature verification) created a real-but-fake profile, saved a measurement with `chestCm`/`hipsCm` through the actual `createBodyMeasurementForProfile`, and read it back correctly before cleanup; the live `/mediciones` form was screenshotted read-only to confirm the two new fields render with the right Spanish labels/placeholders in the right place.

Files touched: `src/db/schema.ts`, `drizzle/0015_moaning_warbird.sql` (new), `src/measurements/measurement-schema.ts` (+test), `src/measurements/measurement-repository.ts`, `src/measurements/measurement-trend.ts` (+test), `src/measurements/measurement-series.test.ts` (fixture update only), `src/app/mediciones/page.tsx`, `src/app/progreso/progreso-page-content.tsx` (+test fixture updates).

Next iteration: none queued. Deploy and commit when asked.

## 2026-08-02 — Deployed and committed the "Zona de peligro" reset feature

Status: shipped. Committed as `7de478e` on `main` (`feat: self-serve reset for plans/sessions, keeping body measurements by default`). Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` HTTP 200 and `/perfil/reiniciar` HTTP 307-to-auth confirmed — no schema change, nothing for the automatic migration step to do).

The feature itself is live now, but running it for real against the account's own data is still a separate, unexecuted decision — nothing has been deleted from the real account as part of shipping this.

Next iteration: none queued. See the entry below for the feature's design/verification detail.

## 2026-08-02 — "Zona de peligro": a self-serve reset for plans/sessions, with measurements kept by default

Status: code complete, `lint`/`typecheck`/`test` (273 passing)/`build` all green. No schema/migration — reuses existing tables only. Not yet deployed/committed. The deletion logic (both the keep- and delete-measurements paths) was verified by actually calling the real `resetAthleteProfileData` function against a real-but-fake throwaway profile — a genuine throwaway vitest file, not reimplemented SQL, run with `DATABASE_URL` exported into the shell since vitest doesn't load `.env.local` the way `next dev`/`next build` do, then deleted (never committed), with a follow-up query confirming zero leftover fake rows. The UI (counts, checkbox, confirm-gating) was verified live against the real account **without ever submitting the real delete** — that action is real and irreversible, so only the user decides to actually pull the trigger on their own account.

**Immediate follow-up, same day**: asked whether to make measurements optional in the wipe, since body measurements (weight, waist, limb measurements) track physical progress independent of whichever plan/routine is running — losing that history isn't something a "start fresh with training" reset should force. Recommended defaulting to *keep* measurements (destructive actions should default toward less destruction) rather than matching today's "wipe everything" default; confirmed. `resetAthleteProfileData` gained a `{ keepMeasurements = true }` option; the confirm page now shows a checkbox ("Mantener mis mediciones corporales (N)"), checked by default, with a live-updating summary line ("Se eliminarán X planes y Y sesiones. Tus mediciones se mantienen." / "...también se eliminarán.") so the exact consequence is always visible before typing the confirm phrase. The post-reset success banner on `/perfil` also reflects which outcome actually happened, via a `keptMeasurements` query param set by the action.

The user has been testing this app's features against their real personal account (the one place with a real Google-OAuth login available) and accumulated a pile of test plans/sessions, and asked me to evaluate whether a real "clean slate" feature was worth building versus a one-off manual cleanup. Recommended the one-off script initially (lower surface area for a need described as one-time); the user chose to build the real feature instead, reasoning their family members (who now have their own accounts via plan sharing) might want the same self-serve reset later.

**Scope decision**: wipes `workoutPlan` (any status), `workoutSession` (cascades `exerciseLog`/`setLog`), and `bodyMeasurement` for the calling user's own profile — deliberately keeps the `athleteProfile` row itself plus `limitation`/`musclePriority` (profile characteristics, not training history), since re-entering onboarding data is real friction the user didn't ask to repeat. Never touches another profile: the profile is always re-derived from the authenticated session, never accepted as a client-submitted ID.

**Deletion order matters and was the one real technical risk**: `exerciseLog.exercisePrescriptionId` is deliberately `onDelete: "restrict"` (protects logged history from an accidental prescription edit elsewhere) — deleting `workoutPlan` first would hit a live FK violation for any plan that was ever trained. `workoutSession` has to go first (cascades `exerciseLog`→`setLog` away), which clears the restriction before `workoutPlan` (cascades `planSessionTemplate`, `exercisePrescription`, and any `planShareInvite` sourced from it) is deleted. Confirmed exactly this sequence against a throwaway fake user+profile+plan+session+exerciseLog+setLog+measurement: after reset, all target rows were gone, the profile row survived, and the fake user/profile were cleaned up afterward with zero leftovers (verified via a direct count query).

**UI** (`src/app/perfil/reiniciar/`): a "Zona de peligro" section added to the bottom of `/perfil`, linking to a confirmation page showing exact real counts (planes/sesiones/mediciones) before anything happens. Destructive action gated by typing the literal word "REINICIAR" — re-validated server-side in the action itself (the client-side match is a UX nudge, not the real boundary) — with the submit button rendering as plainly inert (zinc, not just dimmed amber) until the text matches exactly, since a dimmed-but-still-amber disabled state read as "basically ready" at a glance for something this destructive. One nested-component-API wrinkle: Next.js `"use server"` files may only export async functions, so the shared confirm-text constant was pulled into its own plain module rather than living in `actions.ts`.

Files touched: `src/profile/profile-reset.ts` (new), `src/app/perfil/reiniciar/{page.tsx,actions.ts,reset-confirm-form.tsx,reset-confirm-form.test.tsx,reset-confirm-text.ts}` (all new), `src/app/perfil/page.tsx`.

Next iteration: the user needs to decide whether to actually run this against their real account now (it would delete their real 2 plans / 11 sessions / 2 measurements, confirmed live in the counts) — that's a real, irreversible call only they make. Deploy and commit when asked.

## 2026-08-02 — Deployed and committed plan sharing, "Tus planes" history, and the competitor UX benchmark work

Status: shipped. Committed as `a66474a` on `main` (`feat: plan sharing, "Tus planes" history, and a competitor UX benchmark pass`), bundling three previously-uncommitted pieces of work in one commit per this project's established pattern for stacked undeployed entries. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully; `/` HTTP 200 and `/plan` HTTP 307-to-auth confirmed — migration 0014 had already been applied to the dev DB in a prior session and ran with the deploy as usual, no manual step needed).

Confirmed before deploying that no `/entrenar` session could be actively in progress: the real account's plan was in `draft` status (mid-edit by the user) at deploy time, so there was no active plan to train against regardless.

Next iteration: none queued. The deferred datalist-autocomplete item (see the entry below) still needs a real-iPhone check before deciding whether to replace it.

## 2026-08-02 — Competitor UX benchmark: 6 small improvements to routine definition + session recording

Status: code complete, `lint`/`typecheck`/`test` (269 passing)/`build` all green. No schema/migration involved. Session-recording changes verified live via Playwright against the real dev DB (a throwaway session/set was created, verified, then deleted directly from the DB — cascade via `exerciseLog.workoutSessionId onDelete: cascade` — confirmed clean via a follow-up query, matching the plan-sharing feature's established throwaway-verification precedent). Builder changes verified against real component tests plus a read-only live view of the user's real in-progress draft (no submissions).

Kicked off from `docs/product/competitor-ux-benchmark-kickoff-prompt.md`: a Principal-Product-Designer competitive benchmark of this app's two core flows (routine definition, session recording) against MyFitCoach (the named benchmark) and Hevy/Strong (secondary references, more thoroughly documented — MyFitCoach's own marketing/help-center content turned out to be light on granular in-app UI detail, confirmed via direct fetch rather than assumed). Explicitly not a feature hunt — grounded in real screenshots of the current app (iPhone viewport, logged in as the real user) before researching competitors, then a prioritized shortlist presented for confirmation via `AskUserQuestion` before any code, per this project's established pattern.

**Session recording (`/entrenar/[sessionId]/session-runner.tsx`)**, all four confirmed:
1. **Rest timer**: a non-blocking countdown (`useRestTimer` hook) auto-starts the moment a set is saved, using the exercise's existing `restSeconds` field (previously only static display text, never an actual timer) — the single most-cited gap vs. every competitor (Hevy: auto-starts on checkmark, ±15s adjust; Strong's headline feature; MyFitCoach: "built-in timer"). A ref-based signature guard means navigating back to an exercise after the timer already ran/was skipped doesn't restart it. Skip button included; vibrates at zero via the Vibration API (progressive enhancement, no-op where unsupported).
2. **Trimmed weight default** ("40.00" → "40"): `formatKg`'s trim logic split out into a new `roundKgValue` (returns the bare number, not a "kg"-suffixed string) and applied to the weight input's initial value.
3. **Previous-performance reference now tracks the set you're on, for the whole exercise** — previously it only showed (as a full list of every previous set) before the first set of the session, then vanished entirely. Per the user's explicit refinement during scoping ("keep visible the corresponding set... show the same previous values for the third set"), it's now a single matched row — same position, same side for unilateral exercises — visible for every set, with a fallback message ("La vez pasada no llegaste a este set.") once you're past what was recorded last time.
4. **± stepper buttons** beside weight/reps for one-thumb adjustment without opening the iOS keyboard (which doesn't render number-input spinners at all) — new `StrengthSetFields`/`NumericStepperField` components, controlled state reset via the existing per-set `key` remount trick the file already used for `DurationSetInput`. One real bug caught by the test suite, not by eye: a `<label>` wrapping both stepper buttons and the input only implicitly associates with the *first* labelable descendant (the minus button, per HTML's label-association algorithm) — fixed with an explicit `htmlFor`/`id` pair instead of wrapping.

**Routine definition (`/plan/builder/session/[dayIndex]/session-editor-form.tsx`)**, both confirmed:
5. **Prefill sets/reps/RIR/rest from history**: new `getExercisePrescriptionDefaultsByName` (`plan-builder-repository.ts`) returns one most-recent prescription per known exercise name (picked in JS by the owning plan's `createdAt`, since `exercisePrescription` rows carry no timestamp of their own) across any of the profile's plans. Wired to the exercise-name field's `onBlur`: typing/selecting a name that matches history prefills that row from its most recent configuration elsewhere, skipping silently for unknown names and — critically — skipping when the name is unchanged, so tabbing through an already-correct existing row never clobbers it with unrelated history. Mirrors Hevy's "re-adding a known exercise repopulates its prior sets" pattern. Since most row fields are uncontrolled (read from the DOM on submit), applying a prefill forces a fresh mount by bumping the row's `key` — the same trick already used elsewhere in this file.
6. **Reorder rows** with ↑/↓ buttons (no drag-and-drop library) — pure array-swap in the existing `rows` state, boundary-disabled at the first/last position.

**Deferred, not built this pass**: item 7 from the shortlist (the exercise-name `<datalist>`'s well-known iOS Safari rendering unreliability) — user chose to verify on a real iPhone before deciding whether to replace it. A full plate-math calculator (needs a "what plates do you own" config that doesn't exist in the schema) and superset/circuit grouping (touches the data model and the builder/runner pairing) were flagged as genuinely structural, not small, and explicitly not proposed for this pass.

**Aside, unrelated to this work but discovered mid-session**: the real active plan ("JuanK") flipped to `status: draft` (`activated_at: null`) partway through, with no corresponding browser action in this session's own history — flagged to the user directly rather than assumed benign; confirmed as the user's own concurrent edit, not touched further. Documented here since it explains why the builder verification above used the user's real in-progress draft instead of the previously-active plan.

Files touched: `src/lib/format.ts` (+`roundKgValue`), `src/app/entrenar/[sessionId]/session-runner.tsx` (+test), `src/plans/plan-builder-repository.ts` (+`getExercisePrescriptionDefaultsByName`), `src/app/plan/builder/session/[dayIndex]/page.tsx`, `src/app/plan/builder/session/[dayIndex]/session-editor-form.tsx` (+test).

Next iteration: deploy and commit when asked (neither done yet). Verify the datalist autocomplete on a real iPhone next time the user is on-device, then decide on item 7.

## 2026-08-01 — Plan-detail view for any plan in "Tus planes" + discarded the real stray draft

Status: code complete, `lint`/`typecheck`/`test` (265 passing)/`build` all green. No schema/migration involved.

Immediate follow-up to "Tus planes" below. The user confirmed the stray "JuanK (copia)" draft was real (created by tapping "Duplicar como borrador" themselves, not test leftover) and asked for two things: discard it, and add detail/stats when looking at an archived plan.

- **Discarded the draft for real, through the app's own UI** (`/plan/builder` → "Descartar borrador"), not a direct DB delete — exercises the same code path a user would hit, and it's the lowest-risk way to remove something the user explicitly asked to remove. Verified via `/plan/historial` afterward: exactly the 2 real plans (active + archived) remain.
- **New `/plan/historial/[planId]`**: each card in the list is now a link into a detail page for that specific plan (any status). Reused existing machinery end to end rather than building new rendering: `getDraftPlanSessions` (already exported, works for any plan row despite its name) + `toGeneratedWorkoutPlan` + `getPlanPreviewSummary` + the existing `PlanDayPager` component — the exact same pipeline `/plan/rutina` and the template-preview screens already use, so the legacy 4-week seeded-plan data correctly collapses to its real 5 unique days here too, for free. New `getPlanForProfile` (ownership-scoped by id) and `getPlanSessionStats` (session count + first/last session date, one grouped query) added to `plan-repository.ts`.
- Stats shown: sessions logged, days/week, first/last session date (when any exist), created/activated dates — the "don't build reactivation" boundary from the previous entry still holds, this is purely a richer read view.

Verified live: clicked from the real list into the real archived plan ("Plan base 5 días — hipertrofia," legacy 4-week data) — correctly showed 5 days (not 20), full exercise detail per day, and accurate stats (4 sessions, first/last both 28-jul).

Files touched: `src/plans/plan-repository.ts` (+2 functions), `src/app/plan/historial/page.tsx` (cards now link out), `src/app/plan/historial/[planId]/page.tsx` (new), `src/app/plan/historial/[planId]/plan-history-detail-content.tsx` (new, +test).

Next iteration: none queued.

## 2026-08-01 — "Tus planes": a read-only list of every plan a profile has ever had

Status: code complete, `lint`/`typecheck`/`test` (259 passing)/`build` all green. No schema/migration involved.

Follow-up to the plan-sharing work above. User asked whether a "see all my plans" view made sense — evaluated against real data before answering rather than guessing: the real dev-DB account already had an **archived plan with 4 real logged sessions attached, completely invisible anywhere in the UI** (findable only via a direct DB query), plus a stray draft ("JuanK (copia)") whose origin wasn't obvious from anything done this session. That's real, present evidence of the problem, not a hypothetical — recommended building a lightweight **read-only** list (explicitly not reactivation/deletion of archived plans, which is a separate decision: archived plans with logged history can't even be hard-deleted today, `exerciseLog.exercisePrescriptionId` is `onDelete: restrict` by design). Confirmed.

- `src/plans/plan-history.ts` (new, +test): pure, testable sort (`sortPlanHistoryRows`) — active first, then draft, then archived/completed newest-first, so the list doesn't bury what's live under however many old plans exist — plus the Spanish status label/pill-color lookups.
- `src/plans/plan-repository.ts`: new `getAllPlansForProfile` — every plan regardless of status, with a real per-plan session count (one grouped query against `workoutSession`, not N+1).
- `src/app/plan/historial/page.tsx` (new route): the list itself — name, status pill, days/week, session count, created/activated dates.
- `src/app/plan/plan-page-content.tsx`: "Ver todos tus planes" link, deliberately **unconditional** (renders with or without an active plan) — verified via a dedicated test case, since a user with only drafts/archived plans and no active one still needs a way in.

Verified live: the real list rendered exactly the three real plans in the correct priority order (active → draft → archived), matching the diagnostic query used to justify building this in the first place.

Next iteration: none queued. The stray "JuanK (copia)" draft's origin is still unresolved — flagged for the user to check, not touched.

## 2026-08-01 — Plan sharing: clone-not-link invites to another account, phase 1 of a future cross-account comparison

Status: code complete, `lint`/`typecheck`/`test` (255 passing)/`build` all green. Migration `drizzle/0014_flowery_stone_men.sql` (nullable `workoutPlan.sharePlanGroupId`, nullable `exercisePrescription.lineageKey`, new `plan_share_invite` table — all additive, zero backfill needed) generated and applied to dev DB, verified via `information_schema`. Not yet deployed as of this entry.

User (training with another athlete on the same routine) asked for the ability to share a plan with another account so nobody has to hand-retype it (and risk typos in exercise names/order breaking progression continuity), with an explicit ask to think it through critically first — "a possible plan is don't do it" was offered as a real option. Worked this as a Principal Engineer + Principal Designer planning pass before writing any code: read the real data model and the existing `cloneWorkoutPlanToDraft`/template-activation code first, which reframed the ask into two separable features — (A) get an independent copy without retyping, (B) a *future* cross-account progress comparison — and surfaced that every existing "avoid retyping" mechanism in this codebase is already copy-on-write, never a live link, which became the guiding precedent. Also surfaced via direct questions: no email-sending infrastructure exists (Google-OAuth-only auth), so "share by email" became "generate a link, send it yourself" rather than a new transactional-email dependency. Confirmed via `AskUserQuestion`: build a real (not one-off) feature; recipient assumed to already have an account; share via manually-sent code/link; future comparison scoped to training performance only, never pain or body measurements.

**Data model** (additive, both nullable, no behavior change until first use): `workoutPlan.sharePlanGroupId` and `exercisePrescription.lineageKey` are stamped once, the first time a plan is ever shared, then copied verbatim onto every clone descended from it. This exists *only* so a future comparison feature can join two independently-cloned, independently-editable plans by stable identity instead of fuzzy-matching `exerciseNameEs`/`orderIndex` — the exact fragility ("commit mistakes on names, order") the user was trying to avoid in the first place. No comparison UI was built; this is groundwork only.

**Share flow, `src/plans/plan-share-repository.ts`**: `createPlanShare` (owner-only, backfills lineage, mints a `planShareInvite` row bound to a specific recipient email — not an open "whoever has the link" code, since this is health-adjacent data) → owner copies the generated link and sends it however they already talk to the recipient → `redeemPlanShare` (validates email match/expiry/not-already-redeemed/no-conflicting-draft, then clones the plan into the recipient's account as a **draft**, reusing the exact same clone-insert logic `cloneWorkoutPlanToDraft` already used for self-duplication). Refactored that shared insert loop out into `insertClonedPlanSessions` (now exported from `plan-builder-repository.ts`) so both call sites stay identical instead of drifting. Once cloned, the two plans are fully independent by design — editing one never touches the other, deliberately, since silently propagating an edit into someone else's already-in-progress training block is exactly the kind of thing that should never happen without them asking.

**Verification**: this codebase has no established pattern for DB-mocked repository unit tests (confirmed by checking `plan-repository.test.ts`, which only tests pure functions) — DB-touching code is verified live instead. Given this feature is genuinely security-sensitive (a new cross-account data-mutation path), a real second Google account wasn't available to test redemption end-to-end through the UI, and forging a valid signed Better Auth session cookie was judged too fragile to be worth it. Instead: a throwaway vitest file (written, run against the real dev DB, then deleted — never committed) created a real-but-fake second `user`/`athleteProfile`, exercised the full repository surface — self-share rejection, no-account rejection, create→lineage-backfill→preview→redeem, already-redeemed, wrong-account, expired, invalid-code, draft-conflict — asserting against real DB rows each time, then deleted every row it created in `afterAll`. Confirmed clean afterward via a direct query (exactly 1 real user, 0 leftover invite rows). The real owner's real active plan now legitimately carries a `sharePlanGroupId` from that test run (its `createPlanShare` calls stamped it) — left in place deliberately, since that's real, correct, forward-looking state, not test pollution. The UI itself (form, self-share/no-account error banners, invalid-code redemption state) was verified live via Playwright against the real account.

**UI**: a de-emphasized "Compartir" text link added to `/plan`'s existing Editar/Duplicar row. New `src/app/plan/compartir/page.tsx` (recipient-email form → generated link + copy-to-clipboard, `src/app/copy-link-button.tsx` new/generic) and `src/app/plan/compartir/[code]/page.tsx` (handles invalid/expired/wrong-account/already-redeemed/draft-conflict states before ever showing a confirm button that would just fail, plus the happy-path preview+confirm). Base URL for the share link reuses `env.BETTER_AUTH_URL` (already the app's real public origin for OAuth callbacks) rather than adding a new env var.

Files touched: `src/db/schema.ts`, `drizzle/0014_flowery_stone_men.sql` (new), `src/plans/plan-builder-repository.ts` (exported `getDraftPlanSessions`, extracted `insertClonedPlanSessions`), `src/plans/plan-share-repository.ts` (new), `src/plans/plan-share-schema.ts` (new, +test), `src/app/plan/compartir/actions.ts` (new), `src/app/plan/compartir/page.tsx` (new), `src/app/plan/compartir/[code]/page.tsx` (new), `src/app/copy-link-button.tsx` (new), `src/app/plan/plan-page-content.tsx` (+test), plus fixture updates in 3 existing test files for the two new schema columns (`session-runner.test.tsx`, `plan-repository.test.ts`, `session-progress.test.ts`).

Next iteration: deploy and commit when asked. Comparison UI itself is explicit future work, not queued — the schema groundwork just keeps that door open.

## 2026-08-01 — Deployed and committed the /progreso charts+KPIs work (base set + unilateral L/R split + effort-gap chart)

Status: shipped. Deployed to production via `npx vercel deploy --prod --yes` (live at `https://gym.jcvalerio.com`, aliased successfully, `/` HTTP 200 and `/progreso` HTTP 307-to-auth confirmed — no migration involved, no schema changes across any of these three entries), then committed locally on `main`. Covers all three entries below in one deploy/commit: the base KPI row + 3 charts, the unilateral left/right split, and the RIR effort-gap chart.

## 2026-08-01 — Effort-gap (RIR) chart: the weight/volume dual-line chart alone can hide a real asymmetry

Status: code complete, `lint`/`typecheck`/`test` (252 passing)/`build` all green. No schema/migration involved. Verified live against the real "Prensa unilateral" exercise in the dev DB.

Immediate follow-up to the same-day left/right split entry above. The user described their actual protocol for a unilateral leg press: right (weaker) leg does 8 reps @ 20kg to RIR0 (failure), left (stronger) leg matches the same 20kg/8 reps but at RIR4 (well short of its real capacity) — correct per this app's own rules (`progression-rules.md`: "stronger side should match the weaker side's load," "do not let the stronger side progress faster") — then asked whether the new dual-line chart's insight was actually trustworthy, since load-matching makes both lines read identical (20kg = 20kg) regardless of whether the underlying strength gap has closed at all.

That's a real, worth-fixing blind spot, not a false alarm: **a load-matched protocol makes the weight/volume dual-line chart converge by construction**, whether the true capacity gap is closing, static, or even widening — the chart can't tell those apart because it only encodes load, not effort. The signal that actually answers "is this working" is RIR: right at RIR0 on 20kg means 20kg is right leg's real ceiling; left at RIR4 on the same weight means left's real ceiling is unknown and higher. That's a live, unresolved gap the weight chart reports as zero.

Added a second chart, **not a replacement** for the dual-line weight/volume chart (confirmed via `AskUserQuestion`, choosing a dedicated gap line over folding RIR into the existing metric toggle): "Brecha de esfuerzo (RIR izq − der)" = left avg RIR minus right avg RIR per instance, plotted as its own single-line chart below the weight/volume one, only for unilateral exercises. Framed neutrally (positive = left has more reserve i.e. right worked harder; negative = the opposite; near 0 = both sides equally challenged at the matched load — the point where progressing load together again stops being a guess) rather than presuming which side is "the weak one," matching this app's existing convention of showing deltas without a built-in value judgment (`measurement-trend.ts`'s body-measurement deltas do the same).

Implementation:
- `src/workouts/exercise-series.ts`: `ExerciseSeriesPoint` gained `left/rightAvgRir` (computed the same way as the weight fields, generalized `sideAverage` to take a value selector instead of duplicating it for RIR). New `buildEffortGapSeries` derives the gap per instance, only where both sides have a recorded RIR.
- `src/app/progreso/line-chart.tsx`: gained an optional `referenceLine` prop (dashed, labeled — the same visual language `bar-chart.tsx`'s target line already uses) so the gap chart can show "0 = mismo esfuerzo" as a fixed reference; the y-domain now always includes the reference value so it can't get scaled out of view when every data point sits on one side of it.
- `src/app/progreso/exercise-progression-chart.tsx`: new `EffortGapSection`, rendered under the existing dual-line chart for unilateral exercises only, with its own empty-state text when no instance has RIR recorded on both sides (distinct from the dual chart's own "one instance" hint).

Verified live: the real "Prensa unilateral" exercise's 2 real instances (both 28-jul) show the gap moving from a positive value toward 0 — i.e. the true effort asymmetry actually narrowing, which the weight chart alone (flat 25kg = 25kg both instances) doesn't reveal at all.

Files touched: `src/workouts/exercise-series.ts` (+test), `src/app/progreso/line-chart.tsx` (+test), `src/app/progreso/exercise-progression-chart.tsx` (+test), `src/app/progreso/progreso-page-content.test.tsx` (fixture update only).

Next iteration: none queued. Not yet deployed — stacks with the two other undeployed /progreso entries above.

## 2026-08-01 — Left/right split on the per-exercise progression chart for unilateral exercises

Status: code complete, `lint`/`typecheck`/`test` (244 passing)/`build` all green. No schema/migration involved. Verified live via Playwright against the real dev DB, including the tap-tooltip interaction on the real "Prensa unilateral" exercise.

Follow-up to the previous entry's per-exercise progression chart: the user asked how to see left vs. right progress separately for a unilateral exercise, and the honest answer was "it doesn't split them yet" — the chart was averaging left+right into one blended number, hiding exactly the asymmetry this app's whole progression model cares about (`docs/product/progression-rules.md`'s unilateral/asymmetry rules; `improvement.ts` already computes an `asymmetryGapKg` signal, just never as a series). Presented two options via `AskUserQuestion` (a simultaneous two-line left-vs-right chart vs. a simpler side-toggle reusing the existing Peso/Volumen pattern) — the two-line chart was chosen since watching the gap itself close/widen over time is the actual product goal, not just each side's raw number.

**Color choice**: this is the app's first-ever 2-series chart, so it needed a second categorical color alongside the existing emerald-300 brand accent. Checked the app first — amber (warning), sky (info/hold), and red (errors) are all already reserved status colors elsewhere (`session-runner.tsx`, `form-status-banner.tsx`); reusing any of them for "right side" would collide with that existing vocabulary, which the `dataviz` skill explicitly warns against. Ran the skill's `validate_palette.js` against several unused-in-this-app candidates on the real dark card surface (`#18181b`): violet-300 (`#c4b5fd`) won clearly (CVD ΔE 12.3, normal-vision ΔE 21.1, both comfortably clear of the floors) over orange/sky/rose/pink, which either sat right at the CVD floor or failed normal-vision separation outright. The validator's lightness-band check fails for the pair (both are light "-300" pastels, inherent to matching the app's existing light-accent aesthetic rather than a from-scratch categorical ramp) — accepted as a documented, deliberate deviation since the checks that actually determine real distinguishability (CVD, normal-vision) both pass with a wide margin.

**Data layer** (`src/workouts/exercise-series.ts`): `ExerciseSeriesPoint` gained `left/rightAvgWeightKg` and `left/rightVolumeLoadKg` (null, not 0, when that side has no logged sets for an instance — a real absence, not a zero value). `ExerciseSeriesGroup` gained `isUnilateral` (read off the instance data, same source `improvement.ts` already uses for its asymmetry signal). `toExerciseSeriesGroups`/`pickDefaultExerciseName` were refactored to take the raw `instancesByName` map / the built groups directly rather than a pre-flattened series map — simplified `page.tsx` by removing an intermediate step it no longer needed.

**New chart primitive** (`src/app/progreso/dual-line-chart.tsx`): a two-series line chart sharing one y-axis (never dual-axis — same unit both sides) and one shared per-date tap target, so a single tooltip shows both sides at once ("one tooltip, every series" per the skill's interaction guidance) rather than requiring two separate taps. Always shows a line-key legend (required once ≥2 series are on screen). `exercise-progression-chart.tsx` now branches on `isUnilateral`: unilateral exercises get this dual chart plus a small "Ejercicio unilateral — izquierda y derecha por separado" badge (directly answers "how do I know an exercise is unilateral" — there was no indicator anywhere before this); bilateral exercises keep the original single-line chart unchanged.

Verified live: the real "Prensa unilateral" exercise (1 real instance, `Asimetría izq/der: 200kg → 200kg` in its existing improvement card, i.e. perfectly symmetric so far) rendered as two flat overlapping-value lines both at 25kg, with the badge, legend, and a working tap tooltip showing "Izq: 25kg / Der: 25kg" together.

Files touched: `src/workouts/exercise-series.ts` (+test), `src/app/progreso/dual-line-chart.tsx` (new, +test), `src/app/progreso/exercise-progression-chart.tsx` (+test), `src/app/progreso/page.tsx`, `src/app/progreso/progreso-page-content.test.tsx` (fixture update only).

Next iteration: none queued from this pass. Not yet deployed — stacks with the previous /progreso charts entry, which is also still undeployed.

## 2026-07-31 — A base set of charts/KPIs on /progreso: per-exercise progression, weekly consistency, body-measurement trend

Status: code complete, `lint`/`typecheck`/`test` (234 passing)/`build` all green. No schema/migration involved. Verified live via Playwright at an iPhone viewport (390×844) against the real dev DB, logged in as the real user — including tapping into the actual chart interactions (bar tooltip, exercise picker, metric toggle), not just visual screenshots.

Kicked off from `docs/product/progress-metrics-kickoff-prompt.md`. Grounded the design in two things checked directly rather than assumed: the real `/progreso` page (every existing "trend"/"improvement" value turned out to be a 2-point latest-vs-previous comparison, confirmed in `measurement-trend.ts`/`improvement.ts`/`session-load.ts`) and the real user's actual dev-DB data (8 completed sessions across only 2 calendar days, several 1-10min smoke-test-length, **zero sessions with RPE logged ever**, **exactly 1 body measurement ever saved**, and pain flat at 0 throughout). That data reality directly shaped scope — presented a proposal via `AskUserQuestion` and got three decisions confirmed before building:

1. **Full proposed scope** (3 KPI tiles + 3 charts), not a trimmed flagship-only start.
2. **Hand-rolled inline SVG**, not a charting library (Recharts/visx) — no library existed in the project, the chart needs here are simple, and this matches the app's stated "no dependency without justification" philosophy (`technical-stack.md`'s Drizzle-over-Prisma/Better-Auth-over-Clerk reasoning).
3. **Defer both a training-load trend chart and a dedicated pain-over-time chart** — real data has zero RPE-logged sessions and pain has been flat at 0 throughout, so charting either right now would be exactly the "visualization for its own sake" the kickoff explicitly warned against. Kept both as their existing text/number signals; revisit once real data supports them.

Loaded the `dataviz` skill before finalizing the color/mark decisions in the proposal and again while building — followed its mark specs (2px lines, r≥4 dots with a 2px surface-color ring, ≤20px capped/rounded bars, dashed reference line for a goal — not a gridline, one hue per single-series chart with no legend box, direct endpoint labels instead of dense axes, tap-per-mark tooltip since this is a touch-only app with no real hover).

**Data layer** (new, all with unit tests):
- `src/workouts/exercise-series.ts`: `buildExerciseSeries` turns the existing `ExerciseInstance[]` shape (already returned by `getRecentExerciseInstancesByName`, just previously capped at 2) into an ascending per-instance `{avgWeightKg, volumeLoadKg}` series; `toExerciseSeriesGroups`/`pickDefaultExerciseName` shape it for the picker. `getRecentExerciseInstancesByName`'s call site in `page.tsx` bumped its limit from the default 2 to 12 — one query now serves both the existing 2-point improvement cards and the new progression chart's fuller history.
- `src/workouts/consistency.ts`: `buildConsistencySummary` buckets completed sessions into Monday-start weeks, counting **distinct calendar days trained** (not session count — two sessions the same day count once) against `athleteProfile.targetTrainingDaysPerWeek` (captured since the profile model existed, never used for this). `buildConsistencyBars` shapes it for the bar chart.
- `src/measurements/measurement-series.ts`: `buildMeasurementSeries` turns the already-ordered `getRecentBodyMeasurementsForProfile` result into a parsed ascending series — this one needed no new query at all, the data was already a series, just being collapsed to oldest-vs-latest by `measurement-trend.ts`.
- `totalVolumeLoadKg`/`average` exported from `improvement.ts` for reuse rather than duplicated.

**Chart primitives** (new, `src/lib/chart-svg.ts` + `src/app/progreso/{line,bar}-chart.tsx`): generic `LineChart` and `BarChart` client components — plain SVG, viewBox-scaled so they resize with the card, tap-to-reveal tooltip (each point/bar is its own hit target; `LineChart` additionally snaps to the nearest point from anywhere along the line, mirroring a crosshair for touch). A real bug caught by the component's own test, not by eye: the per-point invisible hit-circle's `onPointerDown` and the root `<svg>`'s `onPointerDown` both fired on tap (event bubbling) and raced to set `activeIndex`, with the outer (wrong) handler always winning since it runs after the inner one in bubble order — fixed with `event.stopPropagation()` on the inner handler.

**Feature wrappers**: `exercise-progression-chart.tsx` (exercise `<select>` + Peso/Volumen toggle), `measurement-series-chart.tsx` (Peso/Cintura toggle, hides the toggle entirely when only one of the two has any data), both client components consuming the primitives above.

**`/progreso` page** (`progreso-page-content.tsx`): new 3-tile KPI row under the header (Esta semana días/target, Mejorando exercises-with-a-signal/total, Carga avg training load — the last one relocated up from its old spot in the session-history header, not duplicated) using a "—" placeholder rather than hiding a tile when its data doesn't exist yet, which is intentionally different from this page's older pattern of hiding a whole section when data is absent (a placeholder tile reads as "not yet," an entirely missing row reads as broken). New "Progresión por ejercicio" and "Consistencia semanal" chart cards; "Tendencia corporal" gained the new `MeasurementSeriesChart` alongside its existing oldest-vs-latest delta text once there are ≥2 measurements (still text-only at exactly 1, unchanged).

Verified all the sparse/empty states live against the real data, not just theoretically: the progression chart defaults to the most-recently-trained exercise, which turned out to have exactly 1 real instance — rendered as a single dot with a "registra otra sesión..." hint rather than a broken-looking empty chart; picking a 2-instance exercise from the selector showed a real (flat, since weight was unchanged) 2-point line; the consistency chart correctly showed 7 empty weeks and one real 2-day week (28-jul and 30-jul both landing in the same Monday-start week), confirmed via its tap tooltip; the measurement chart correctly stayed hidden (single-measurement text only) since the real account has exactly 1 measurement.

Files touched: `src/lib/chart-svg.ts` (new, +test), `src/lib/format.ts` (+`formatShortDateEs`), `src/workouts/consistency.ts` (new, +test), `src/workouts/exercise-series.ts` (new, +test), `src/workouts/improvement.ts` (exported 2 helpers), `src/measurements/measurement-series.ts` (new, +test), `src/app/progreso/{line,bar}-chart.tsx` (new, +test), `src/app/progreso/exercise-progression-chart.tsx` (new, +test), `src/app/progreso/measurement-series-chart.tsx` (new, +test), `src/app/progreso/page.tsx`, `src/app/progreso/progreso-page-content.tsx` (+test).

Next iteration: none queued from this pass. The deferred training-load and pain-trend charts are explicit candidates once real RPE/pain data exists — not forgotten, deliberately postponed (see above). Not yet deployed as of this entry.

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
