# Project status

Where this project actually is, and what a new feature has to respect. Written 2026-08-09.

Three docs, three jobs — keep them that way:

| Doc | Answers | Shape |
|---|---|---|
| **this file** | Where are we, and what constrains what I build next? | Durable; rewrite sections as reality changes |
| `next-task.md` | What is the immediate next thing? | Short and rolling |
| `implementation-log.md` | How did we get here, and why? | Append-only, newest first — the source of truth for decisions |

If you change `src/db/schema.ts`, update `docs/architecture/data-model.md` in the same change. That doc drifted for months once already, which is why it now says so in its own preamble.

---

## What this is

A Spanish-first, iPhone-only web app at `https://gym.jcvalerio.com` for building a training plan by hand and logging every set with weight, reps, RIR and a pain score. Built around three real athletes — the owner and two others — whose friction drove every early decision. Since going public it is used by people outside that group, so a change that would only suit the original three is no longer automatically the right change. It runs entirely on free tiers (Neon, Vercel, GitHub) and stays free.

**It is not an "AI personal trainer"** — that was the original framing and the original repo name, both since retired. AI plan generation was evaluated and dropped (milestone M3, 2026-07-31). Plans come from a hardcoded template catalog or the manual builder. There is no AI anywhere in the product and no AI-derived insight on any screen — keep it that way unless the user says otherwise.

## What works today, end to end

1. **Profile** (`/perfil`) — goals, limitations, muscle priorities, target training days.
2. **Plan** — activate one of four hardcoded templates (`/plan/templates`) or build one by hand (`/plan/builder`). Plans can be shared to another account by email invite, which clones them.
3. **Train** (`/entrenar`) — run a session, log every set with weight/reps/RIR/pain, get a pain-aware progression suggestion prefilled, log bonus sets past the target, correct or delete a logged set, and substitute an exercise mid-session when a machine is busy or something feels wrong. Ending a session goes through `/entrenar/[sessionId]/finalizar`, which states what is unfinished and offers a way back into it — nothing on the runner itself submits, so a mis-tap can only navigate. On a completed session, sets stay editable and deletable, and a logged exercise can be **reassigned** to another exercise in that session — or **swapped** with one that already has sets, which is how a whole day's mis-filed work gets corrected pair by pair.
4. **Progress** (`/progreso`) — weekly effective sets per muscle group over four selectable periods, a front/back body map, balance ratios, pain grouped by where it hurt, exercises grouped by muscle group with per-exercise progression charts, recent improvements, weekly consistency, and body-measurement trends.
5. **Privacy** (`/privacidad`) — what is stored, who sees it, where it lives, and how to ask for deletion. Static and readable without signing in.
6. **Guide** (`/guia`) — what RIR means, AMRAP, the progression math, and how sets per muscle group are counted.

All five items of the 2026-08 user-feedback batch are shipped. Milestone M6's dashboard deliverable is done; its remaining acceptance criteria are field-validation, not code.

## The reporting layer, and why it is shaped the way it is

This is the newest and least obvious part of the system, added 2026-08-09.

**Every exercise carries a muscle-group classification** via `exercisePrescription.exerciseId` → the `exercise` catalog. The vocabulary — 13 muscle groups, movement patterns, joint loads, weekly reference ranges, and a ~67-entry seed catalog — lives in `src/training/muscle-taxonomy.ts`.

Four rules there are load-bearing. Each was arrived at by getting it wrong first, so do not "simplify" them without reading why:

- **Classification resolves in three steps**: `exerciseId` → `findCatalogEntryByName(exerciseNameEs)` → unclassified. Step two is why the backfill migrations are an optimization rather than a correctness requirement, and why accounts nobody has inspected still classify correctly.
- **Unilateral effective sets are `max(left, right) + bilateral`, never a distinct-`setNumber` count.** `saveSetForSession` numbers sets across the whole exercise log regardless of side, so 3 left + 3 right carries numbers 1–6 and a distinct count doubles every unilateral exercise.
- **A set counts when `prescriptionType === "strength" && phase !== "warmup"`.** Do *not* also exclude `mobility`: `seeded-plan.ts` ships Face pull as mobility-phase but strength-type, and excluding it deletes real posterior-delt volume.
- **A substitute resolves its own classification and never inherits it.** Dosage (phase, sets, reps, RIR, rest) inherits; identity does not. The live data has a calf raise replacing an incline press.

**Multi-week views show an average per week, never a period total.** `weeklySetReferenceRange` is a weekly dose, so a total sits several times above the band and reads as healthy while the athlete is undertrained — on real data, cuádriceps totalled 15 over three weeks (inside its 8–20 band) while averaging 5/week, well under the floor. The in-progress week is excluded from averages; rest weeks after training began are not.

## Standing decisions a new feature must respect

Each of these has cost real rework at least once.

- **Spanish-first.** All UI copy in Spanish. `exerciseNameEn` / `notesEn` / `locale: "en"` exist and are unused — do not remove them.
- **Pain is never just another metric.** `pain > 2` blocks aggressive progression, `> 3` means reduce or modify, `>= 7` means stop and seek guidance. See `progression-rules.md`. Since 2026-08-09 a set can also carry *where* it hurt (`setLog.painLocation`), which distinguishes ordinary soreness from joint pain — but the thresholds still treat both identically, on purpose, until there is logged evidence to justify loosening a safety rule.
- **Colour is reserved for pain.** Emerald is the accent, violet the secondary series, zinc the neutral ramp. A below-target bar is grey, not red — a five-day rotation with two-set accessories genuinely lands under most reference bands, and painting that as failure nudges toward junk volume.
- **The type scale is raised deliberately** for readability at 47+: `text-xs` is 14px and `text-sm` is 16px (`@theme` in `globals.css`). Do not shrink type to fit dense labels; that constraint is why the volume chart uses HTML text rather than SVG `<text>`.
- **Charts are hand-rolled inline SVG.** A charting library was evaluated on 2026-08-09 and declined: Recharts pulls Redux Toolkit and d3 transitively into a mobile app, and adopting it means rewriting five working, tested charts. Revisit only if a chart genuinely needs stacking, brushing or many series.
- **Icons come from `lucide-react`** (added 2026-08-09, when the previous no-icon-library rule was lifted).
- **The body-map artwork is vendored, not depended on** (`body-map-geometry.ts`, MIT, notice retained). Anatomy is static, the upstream package is stale, and no library expresses the lateral-vs-posterior deltoid split the taxonomy needs.
- **`targetSets` means sets per side** for unilateral exercises, not a shared total.
- **There is one draft plan at a time, and that constraint must always be visible where it bites.** A draft blocks both editing and duplicating the active plan (`revertActivePlanToDraft`, `cloneWorkoutPlanToDraft` both refuse). On 2026-08-10 this stranded a real user for weeks: the refusal redirected to a `?error=` that `/plan` never rendered, and the builder that could clear the draft was only ever linked as "Crear mi propio plan". If a server action can refuse, the page it returns to must say so and link to the way out — a silent redirect back to an identical page is indistinguishable from a broken button.
- **No new dependency without asking.**

## Where things live

- `src/training/` — domain vocabulary with no DB coupling: `muscle-taxonomy.ts`, `rir.ts`, `rpe.ts`, `progression.ts`, `duration.ts`.
- `src/workouts/` — logic that reads logged sets: `muscle-volume.ts`, `exercise-series.ts`, `improvement.ts`, `consistency.ts`, `exercise-substitution.ts`, plus `workout-repository.ts` (the only DB access for sessions).
- `src/plans/` — plan templates, both Zod contracts, and the plan repositories. **Four places construct an `exercisePrescription`**; a new column touches all of them plus both schemas and the builder form.
- `src/app/progreso/` — the dashboard and every chart component.
- `src/db/schema.ts` — the whole schema, with the reasoning in comments. Read those before changing a column.

Pure logic is colocated with a `.test.ts`; DB repositories are untested by convention.

## How to work

```bash
nvm use v24.18.0          # first, always — other versions break Vitest's config loader
npm run lint && npm run typecheck && npm run test && npm run build
npx vercel deploy --prod --yes    # npx, not bare vercel
```

Migrations apply automatically during the Vercel build (`vercel.json` chains `db:migrate && build`), so schema and code ship together and there is no separate migration step.

Reading the dev database:

```bash
DBURL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//; s/"$//')
```

Never `grep DATABASE_URL | xargs` — it also matches a commented-out stale Neon branch and silently queries the wrong database. This has caused real mistakes.

**The production `DATABASE_URL` is marked Sensitive in Vercel** and can no longer be pulled, so post-deploy verification against production needs the URL from the Neon console. Note that the DB runs in GMT while the app's `startOfWeek` is local — bucket by local time when checking weekly numbers, or a Sunday-evening session appears in the wrong week.

**The dev database contains synthetic history on purpose.** Every seeded row is prefixed `demo-seed-`; `DELETE FROM workout_session WHERE id LIKE 'demo-seed-%';` removes it. It exists only on the development branch. Treat any such row as scaffolding, never as real training history.

Do not deploy while a session may be in progress — check `status = 'active'` first, and if one exists, say so and let the user decide.

## Known gaps and credible next moves

Nothing is urgent. In rough order of value:

1. ~~`setLog` has no pain location.~~ **Done 2026-08-09** — `setLog.painLocation` records where it hurt, prompted only when pain goes above 0. Reported locations are stated plainly; sets predating the column still fall back to the joint inference and are labelled "estimado". It deliberately does **not** yet affect the progression thresholds: "muscular" (ordinary soreness) still blocks aggressive progression exactly like joint pain. Revisit once there is real logged pain — every set to date carries pain 0.
2. **Let real weeks accumulate, then re-read the reference bands.** If the averages feel like a scolding after a month of genuine data, change the copy around the band, not the numbers.
3. **A trend chart was evaluated and declined** (2026-08-09): per-muscle weekly volume swings on which training days you hit, so a line would plot the calendar while looking like it plots progress. Revisit only if the 4-week average proves insufficient.
4. **`workoutSession.notes` and `musclePriority` are written but never read.** Real gaps, small.
5. **M6's remaining acceptance is field validation** — two weeks of real use per tester, friction documented, then the web/offline/native decision.
