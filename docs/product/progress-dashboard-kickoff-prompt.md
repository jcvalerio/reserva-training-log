# Kickoff: a better `/progreso` dashboard (user-feedback item 5)

This is the last of five pieces of real user feedback. The other four shipped (see `docs/product/implementation-log.md`, 2026-08-09 entries). Treat this as a real design problem with real consequences for a real training log, not a hypothetical backlog item.

Work it as **three reconciled role passes held by one entity**, in order, each seeing the previous one's conclusions — not three isolated analyses, and not delegated to separate untethered agents:

1. **An experienced personal trainer with a physiotherapist background** — what would a coach actually reach for when reviewing someone's progress? This comes first and is not skippable, matching this project's precedent of doing the coaching judgment before any UX work. It decides the grouping question below; do not let "no new schema" quietly decide a coaching-relevant answer.
2. **A mobile UX designer** — layout and interaction at 390×844, single column, dark, thumb-driven.
3. **A principal engineer** — data model, read paths, migration cost.

## The ask, verbatim from the user

> "I want a better dashboard to see my progress — I have to tap the dropdown to change the exercise to see my progress. It would be nice to see all the exercises in a single chart or at least grouped by body part, muscle group, or whatever grouping makes more sense from the point of view of a physiotherapist or a personal trainer giving feedback — right now it's pretty basic."

Two separable asks live in there: **(a)** stop making me switch a dropdown to see one exercise at a time, and **(b)** group exercises in a way a coach would recognise. They can be answered independently, and (a) is the cheaper, more certain win.

## What this app is

Read `docs/product/next-task.md` and `docs/product/implementation-log.md` (newest first) before proposing anything — they're the source of truth. Short version: a Spanish-first, iPhone-only web app (`https://gym.jcvalerio.com`) for building a workout plan manually and logging every set with RIR and pain. Single-column `max-w-md`, dark, no icon library, **no charting library** — every chart so far is hand-rolled inline SVG. No AI generation anywhere; keep that framing.

## Verified findings — grounded, not assumed

**The gap is exactly as described.** `/progreso`'s `src/app/progreso/exercise-progression-chart.tsx` renders one exercise at a time behind a `<select>`. `toExerciseSeriesGroups` (`src/workouts/exercise-series.ts`) groups purely by exact `exerciseNameEs` match. `/progreso` today has five sections, in order: *Progresión por ejercicio* (the dropdown one), *Mejoras recientes*, *Consistencia semanal*, *Historial de sesiones*, *Tendencia corporal* — so any new view needs a deliberate placement among these, not a bolt-on at the bottom.

**The data reality, and it should shape the whole design.** Re-verified against the real dev DB on 2026-08-09:

- 3 completed sessions (Días 1–3) and 1 active (Día 4).
- **Exactly one exercise has 2+ completed instances: "Core" (2)** — and it's the single least meaningful one to chart, because "Core" is a generic name that appears on *all five days* of the plan and is therefore several different things sharing one label.
- Ten other exercises have real logged sets but **exactly one instance each**.

A progression *line* needs two points. So a multi-line "all exercises trending over time" chart — the most literal reading of the request — would render as a field of single dots today. **Do not build something that only looks right on hypothetical data.** The productive framing is a view that is genuinely useful at one point per exercise (latest load, volume, RIR, pain, per exercise, grouped) and that *becomes* a trend view for free as the rotation repeats. Design for the data that exists, with a clear path to the data that will exist.

**The grouping question reopens a standing architectural decision.** This schema has **no muscle-group or body-part field on any exercise, by deliberate prior choice**: `exercisePrescription.loadMechanism`'s own doc comment in `src/db/schema.ts` warns it "replaces the old incrementCategory enum... which conflated equipment type with body region," and a 2026-08-02 session explicitly declined to add per-exercise muscle-group classification when it would have been useful for the unilateral-side default. Grouping "by muscle group" as literally asked means reopening that. **Flag it plainly via `AskUserQuestion`; never add a taxonomy field quietly.**

Three zero-new-schema axes exist, and each was tested against the real plan — two of them do not survive contact:

- **`planSessionTemplate.nameEs` / `.focus`** — genuinely body-region-descriptive, human-written ("Cuádriceps y pantorrillas", "Femorales, glúteos y pantorrillas", "Tren superior completo A/B", "Pierna completa"). **But it is not a partition**: "Core" appears in all 5 day templates and "Extensión de tríceps en máquina o polea" in 2, while `toExerciseSeriesGroups` groups by name across *all* history — so exercise→group is many-to-many, and an exercise's group can change if the plan is edited. Any design using this axis must answer what happens to an exercise trained on multiple days.
- **`loadMechanism` × `isCompound`** — collapses on the real data: **`loadMechanism` is `machine` for all 28 exercises** (it's an all-machine plan), leaving compound (10) vs isolation (18). Two buckets that put calf raises with bicep curls.
- **`phase`** — main/accessory only on this plan. Two buckets again.

**Substitutes are new since this item was deferred, and they change the picture.** The just-shipped substitution feature (`substituted_for_prescription_id`, see the 2026-08-09 log entry) means an alternative exercise is a *real prescription with its own name and its own progression history*. `getRecentExerciseInstancesByName` will therefore surface it as an independent exercise on `/progreso` today. Decide deliberately whether the dashboard shows a substitute as its own row/chart or rolls it up under the exercise it replaced — the link is available, and `groupSubstitutes` in `src/workouts/exercise-substitution.ts` already exists.

**Scale makes one shared axis wrong.** Real logged weights already span ~20kg (unilateral leg extension) to 50kg+, and will spread further. A single combined chart on one y-axis would flatten most series into noise; small multiples or per-exercise normalised sparklines each keep their own scale. Whatever the choice, it's a design decision to make explicitly, not by accident.

**What already exists to reuse** (`src/app/progreso/`): `line-chart.tsx`, `dual-line-chart.tsx`, `bar-chart.tsx`, `measurement-series-chart.tsx` — all hand-rolled inline SVG with colocated tests, plus `src/workouts/exercise-series.ts` (`buildExerciseSeries`, `toExerciseSeriesGroups`, `buildEffortGapSeries`, `pickDefaultExerciseName`) and `src/workouts/improvement.ts`. Prefer extending these over new ones.

## Real forks — confirm via `AskUserQuestion` before implementing

Same pattern as every prior feature here. At minimum:

1. **The grouping axis**, with the muscle-group taxonomy question stated honestly as a schema decision the project previously declined — including the option of *no* grouping at all (just a flat, well-designed overview), which is a legitimate answer given the axes above.
2. **The overview's shape** — small multiples per exercise, a compact table/list with latest-vs-previous deltas, or one combined normalised chart. Bring a recommendation grounded in the one-point-per-exercise reality.
3. **Substitutes** — separate entries, or rolled up under the exercise they replaced.
4. **Whether the existing per-exercise detail chart stays** as a drill-down (tap an exercise in the overview) or is replaced outright. The dropdown is the specific thing the user complained about; the chart behind it is not necessarily the problem.

## How to work

1. `nvm use v24.18.0`, then `npm run dev`. Use the Playwright MCP tools at an iPhone viewport (390×844) against the real dev DB, signed in as the real user (Google-OAuth-only — **you cannot authenticate yourself; ask the user to sign in** in the Playwright browser when needed).
2. **Before touching `/entrenar`, check for an in-progress session** with a direct `psql` query for `status = 'active'`. Use `DBURL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//; s/"$//')` — **never** a bare `grep DATABASE_URL | xargs`, which also matches a commented-out stale Neon branch further down the file and silently queries the wrong database. This has caused real mistakes here before. Note `export $(...)` also breaks on the URL's `&`, hence the `cut`/`sed` form.
3. Verify against **real dev-DB data**, and use the established throwaway-then-clean-up pattern for anything you create — delete it afterwards and confirm zero residue with a direct query. The account has real training history and a real active plan; never leave test rows behind and never modify the user's own data.
4. Add tests for any new pure logic (a grouping function, a series builder), matching this codebase's plain-`.ts`-module-with-colocated-test pattern.
5. Run before considering anything done: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
6. Update `docs/product/implementation-log.md` (newest entry first) and `docs/product/next-task.md` after each shipped piece. Commit only when the user explicitly asks; deploy only when explicitly asked, and only after confirming no workout session is active — if one is, say so and let the user decide rather than proceeding silently.

## Constraints that still apply

- **No new dependency** — no charting library, no icon library — without flagging it explicitly and getting confirmation first. Every chart in this app is hand-rolled inline SVG. (The `dataviz` skill is available for colour/form/legibility guidance and is compatible with hand-rolled SVG; it is not permission to add a library.)
- No AI generation or AI-derived insights anywhere in the app.
- Spanish-first UX. `exerciseNameEn`/`notesEn` must not be removed even though unused.
- Preserve pain-aware framing: pain >2 blocks aggressive progression, >3 flags reduce/modify, ≥7 flags stop/professional guidance. If pain appears on the dashboard, it must not read as just another metric.
- Text sizes were deliberately raised for readability at 47+ (`@theme` block in `globals.css`: `text-xs` 14px, `text-sm` 16px; headings intentionally unchanged). Don't reintroduce small type for dense chart labels without a deliberate decision — legibility on a phone is the whole reason that change exists.
- This is a real production app with real logged history. Same care about not touching real data as every prior feature.

## One honest caveat to raise with the user early

If the answer to "what would a coach actually reach for" turns out to need a muscle-group taxonomy, and the user doesn't want to add one, then the most valuable version of this work may be **(a) only** — kill the dropdown, show everything at once, well designed — and leave grouping until there's either a taxonomy or enough history to make day-based grouping worth its ambiguity. That's a legitimate outcome, not a failure to deliver; say so plainly rather than shipping a grouping axis nobody would coach from.
