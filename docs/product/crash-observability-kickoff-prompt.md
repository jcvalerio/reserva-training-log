# Kickoff prompt: land the finish-screen work, root-cause a live crash, and stop flying blind

Paste everything below into a new Claude Code session in this repo to start the work. It's written to be
self-contained — you shouldn't need the prior conversation.

---

Three jobs, in this order. Do not start job 2 before job 1 is committed; a dirty tree makes a crash hunt
ambiguous, because you can no longer tell whether you are debugging shipped code or your own uncommitted work.

## What this app actually is

Read `docs/product/project-status.md` first, then `docs/product/next-task.md`, then the newest entries of
`docs/product/implementation-log.md`. They are the source of truth and always current.

Short version: **Reserva** (`https://gym.jcvalerio.com`) is a Spanish-first, iPhone-only web app for building a
hypertrophy plan by hand, logging every set with weight, reps, RIR and a pain score, and getting a pain-aware
progression suggestion from that logged history. No AI generation anywhere — don't reintroduce that framing.
Next.js 16, React 19, TypeScript strict, Tailwind 4, Drizzle + Neon Postgres, better-auth, deployed on Vercel.

**Two things changed recently that older docs and prompts in this folder predate:**

1. **The repo is public** at `github.com/jcvalerio/reserva-training-log`. Everything you commit is published.
2. **The app is public too.** It was built around three known athletes; it is now used by people the owner
   doesn't know. It runs on free tiers (Neon, Vercel, GitHub) and stays free.

Both matter enormously for job 3. See "Non-negotiables" below.

---

# Job 1 — Land the finish-screen work that is sitting uncommitted

There is uncommitted work in the tree implementing `/entrenar/[sessionId]/finalizar`, the review screen that
the 2026-08-18 implementation-log entry scoped and deliberately deferred. It appears complete and green, but it
was never reviewed, never logged, and never deployed.

**What's there:**
- `src/workouts/session-finish.ts` (+ `.test.ts`, 8 tests) — `isExerciseComplete` and `buildFinishSummary`.
- `src/app/entrenar/[sessionId]/finalizar/page.tsx` and `finish-session-view.tsx` — the review route.
- `session-runner.tsx` shrank by ~167 lines and `session-runner.test.tsx` by ~136; the inline finish panel and
  `completeSessionAction` moved out to the new route.
- `page.tsx` gained a `?ejercicio=` search param feeding a new `initialExerciseId` prop.

**That last point is the thing to verify first.** The 2026-08-18 log entry ends with an explicit warning: if
this screen were ever built, `Cancelar` remounts `SessionRunner` and reseeds `exerciseIndex` to
first-incomplete, so it needs `?ejercicio=<id>` and an `initialExerciseId` prop *or it drops you on the wrong
exercise*. The uncommitted code appears to do exactly that. Confirm it actually works rather than assuming —
navigate to the finish screen from a mid-session exercise, hit Cancelar, and check you land back where you were.

**What to do:**
1. Review it as if someone else wrote it. Does `buildFinishSummary` agree with the counting rules in
   `project-status.md` — in particular, are unilateral exercises `max(left, right) + bilateral` and not a
   distinct-`setNumber` count, and does a set count only when `prescriptionType === "strength" && phase !== "warmup"`?
2. Run `nvm use v24.18.0`, then `npm run lint && npm run typecheck && npm run test && npm run build`.
3. Verify in a real browser at 390×844 (see "How to work"). Check the unfinished-exercise list is tappable and
   lands on the right exercise, and that no horizontal overflow appears (`scrollWidth === clientWidth` at 390 —
   a grid-track overflow has bitten this project repeatedly).
4. Commit with a conventional-commit message, and **add an implementation-log entry**. The repo convention is
   an append-only log, newest first, stating the root cause, the measured before/after, and what was
   deliberately not built. Match the voice of the existing entries.
5. Deploy: `npx vercel deploy --prod --yes` (npx, not bare `vercel`). **Check first that no session has
   `status = 'active'`** — do not deploy while someone may be mid-workout. If one exists, say so and let the
   user decide.

If you find the work is *not* actually complete, say so plainly and finish it rather than committing something
half-done.

---

# Job 2 — Fix the crash on `/entrenar/[sessionId]`

## The symptom

A user on `/entrenar` taps **Continuar** on a session. The page dies with Safari's
*"This page couldn't load. Reload to try again, or go back."* The RSC navigation to
`/entrenar/<sessionId>?_rsc=...` never renders. Console:

```
Uncaught Error: Expected a strength-type set (weight/reps/RIR), got a set with missing values.
    at ad (...)
    at Array.map (<anonymous>)
```

One confirmed affected session: `677d49ab-ee8d-45a1-9914-ec5bb24a8165` (production).

## The mechanism — already traced, verify before fixing

This has been followed through the source. Confirm it rather than re-deriving it, then fix it.

1. `toStrengthSetLog` (`src/workouts/workout-repository.ts:39`) throws when a `SetLog` has a null
   `actualWeightKg`, `actualReps` or `rir`. That throw is **deliberate** — its docstring says it throws
   "rather than silently defaulting nulls to 0, which would quietly corrupt volume-load/progression math
   instead of surfacing a bug." Do not make it lenient. That would trade a visible crash for silently wrong
   training numbers, which is far worse in this app.
2. `buildProgressionSuggestion` (`src/workouts/progression-view.ts:73`) does `sets.map(toStrengthSetLog)`.
3. **`session-runner.tsx` is a `"use client"` component** and calls `buildProgressionSuggestion` at line 312.
   So this code is in the client bundle, and the throw happens during React render — which is why the whole
   page dies rather than one card failing. That matches `at Array.map` in the stack exactly.
4. Its input is `previousPerformance.sets`, narrowed to the `"strength"` branch by
   `getPreviousPerformance` (`workout-repository.ts` ~line 258). **That narrowing is based solely on
   `mostRecent.prescriptionType`. It never checks whether the set rows actually carry weight/reps/RIR.**

So: a prior exercise instance whose prescription says `strength` but whose logged sets have null
weight/reps/RIR takes the strength branch, reaches the client, and throws.

Note the near-miss directly below it: `getPreviousPerformance` *does* guard `targetRepMax === null` with the
comment *"Shouldn't happen … but the DB column is nullable, so guard rather than assert."* Same class of
problem, one guarded and one not.

## Find the bad rows

`saveSet` (`workout-repository.ts:385`) writes nulls into weight/reps/RIR whenever the set is logged under a
`duration` prescription. So the question is which write path produced duration-shaped sets under a
strength-typed prescription. Candidates, most likely first:

- **A mid-session substitution.** `substituteExercise` does not touch `prescriptionType` — a substitute
  inherits the slot's type. A stale client form after a swap could post the wrong `prescriptionType`.
- **A prescription edited from `duration` to `strength`** after sets already existed (the log records a
  "Día 5 flip to duration type").
- **Phase/type confusion.** `seeded-plan.ts` ships Face pull as mobility-*phase* but strength-*type*; check
  for similar rows where the UI logs a duration but the type says strength.

Read the production database to confirm which. Get the URL from the Neon console — the production
`DATABASE_URL` is marked Sensitive in Vercel and can no longer be pulled. **Never** `grep DATABASE_URL | xargs`;
it also matches a commented-out stale Neon branch and silently queries the wrong database.

```sql
SELECT ep.id AS prescription_id, ep.exercise_name_es, ep.prescription_type,
       sl.id AS set_id, sl.set_number, sl.actual_weight_kg, sl.actual_reps,
       sl.rir, sl.actual_duration_seconds, el.workout_session_id
FROM set_log sl
JOIN exercise_log el ON el.id = sl.exercise_log_id
JOIN exercise_prescription ep ON ep.id = el.exercise_prescription_id
WHERE ep.prescription_type = 'strength'
  AND (sl.actual_weight_kg IS NULL OR sl.actual_reps IS NULL OR sl.rir IS NULL)
ORDER BY el.workout_session_id, sl.set_number;
```

Rows with a non-null `actual_duration_seconds` point at the substitution/type-flip path. Rows with everything
null are abandoned or partial writes and are a different bug.

## The fix — two parts, both needed

**1. Make the narrowing honest.** `getPreviousPerformance` should not claim a `"strength"` branch it cannot
back up. If the prior instance's sets are not all strength-shaped, return `null` — the UI already handles
"no previous performance" as a normal state, so the exercise simply shows no suggestion instead of taking the
whole session down. This keeps the fail-loudly intent for genuine programming errors while refusing to hand
the client data it cannot render.

**2. Add an error boundary around the per-exercise card** in the session runner, so a single bad exercise can
never blank an entire workout again. A person mid-session losing the whole screen is the worst possible
failure for this app.

Then repair the affected rows. Decide with the user whether malformed sets are deleted or backfilled —
**do not guess at training data.** Deleting a set changes someone's logged history.

Add a regression test pinning that a strength prescription with a null-valued set yields no previous
performance rather than a throw. Both `progression-view.test.ts` and the repository are relevant; repository
functions are untested by convention here, so the pure-function test is the one that must exist.

## Reproducing it

1. Start with **server logs** — `npx vercel logs <deployment-url>` and the Vercel Functions tab — though note
   this particular error is client-side, so it may not appear there at all. That absence is itself the
   argument for job 3.
2. Reproduce locally at 390×844 with the Playwright MCP tools, seeding a set row that matches the SQL above.
3. Read `browser_console_messages` and `browser_network_requests`, not just screenshots.
4. **This app only supports Google OAuth.** When you reach the sign-in screen, **stop and ask the user to
   complete the login themselves** in that browser window. Do not attempt credentials you do not have, and do
   not fabricate a bypass without asking. Google will not accept a private LAN IP as a redirect, so phone
   login needs the production URL or a stable HTTPS preview.

# Job 3 — Stop finding out about crashes from a person

This is the real point of the exercise. A user had to *tell* the owner the app broke. There is currently no
error monitoring of any kind: no client-side exception capture, no source-mapped stack traces, no alerting. Any
crash that nobody reports is invisible, and on an iPhone-only app the most likely failure — a client-side
exception on a device you don't own — is exactly the one you'll never hear about.

**Goal:** know that a crash happened, on which build, on which device, with a usable stack trace, without
anyone having to report it.

## Evaluate before installing

`project-status.md` carries a standing rule: **no new dependency without asking.** That rule applies here with
full force, so **present a recommendation and get agreement before adding anything.** A charting library was
evaluated and declined on exactly these grounds — weigh this the same way.

Things to weigh, and report on:

- **Sentry** (`@sentry/nextjs`) — the default choice; source maps, session replay, release tracking, a free
  tier. But it is a substantial dependency and its Next.js SDK wraps the build. Check what it costs in bundle
  size on a mobile-first app, and whether the free tier's event quota is realistic.
- **Vercel's own observability** — already available with the existing deployment, zero new dependencies. Check
  what the free/Hobby tier actually captures; it may cover server errors but not client exceptions.
- **A minimal hand-rolled reporter** — `window.onerror` + `onunhandledrejection` posting to one API route that
  writes to the existing Neon database. No new dependency, no third party, no data leaving infrastructure the
  project already uses. Loses source maps and grouping. Given this codebase hand-rolls its own SVG charts
  rather than pulling Recharts, this option is more in keeping with the house style than it might first appear.

Recommend one. Say what it costs and what it gives up.

## Non-negotiables for whatever gets chosen

1. **No secrets in the repo. It is public.** A Sentry DSN goes in Vercel environment variables, never in a
   committed file. `.gitignore` already covers `.env*` except `.env.example` — keep it that way.
2. **Scrub personal data before it leaves the app.** This is not optional and it is not paranoia: users log
   **pain scores, pain locations and body measurements**. That is health data, from people the owner does not
   know, and in some jurisdictions it is a special category. Whatever tool is chosen must be configured to
   strip request bodies, form data and query params by default, and to send no PII. Verify by triggering a test
   error and *reading the captured payload* — do not trust the default config.
3. **Free tier only.** The project's stated commitment is that it stays free on Neon, Vercel and GitHub. Don't
   introduce something that forces a paid plan at low volume.
4. **Source maps must not be published** in a way that exposes more than intended — check the chosen tool's
   upload settings rather than accepting defaults.
5. Update `docs/architecture/technical-stack.md` and `project-status.md`'s standing-decisions list with what
   was chosen and why it was chosen over the alternatives. Future agents read those before adding features.

## Then prove it works

Installing a monitor and assuming it works is the same mistake as shipping a fix without checking the rendered
page. Close the loop:

1. Deploy the instrumented build.
2. **On the actual device where the crash happens**, reproduce the crash from job 2.
3. Confirm the event arrives, with a usable stack trace, the right release/commit, and device metadata.
4. Confirm no pain score, measurement, or personal field appears anywhere in the captured payload.
5. Only then call it done — and write the implementation-log entry describing what the tool caught and what it
   did not.

If the crash from job 2 is already fixed by then, deliberately throw a test error on a throwaway route rather
than skipping the verification.

---

# Non-negotiables (all jobs)

- `nvm use v24.18.0` first, always — other versions break Vitest's config loader.
- `npm run lint && npm run typecheck && npm run test && npm run build` must all pass before anything ships.
- Conventional commits. Add tests for behavior changes. Keep changes vertical and small.
- **Spanish is the default UX language.** All new user-facing copy in Spanish. (English is scaffolded and is a
  planned iteration — issue #9 — but that is not this task.)
- **The three original athletes are anonymized as Athlete A/B/C throughout the docs, permanently.** No real
  names, relationships, gym name, city, or absolute body measurements — left/right gaps only. Two of them have
  a medical condition recorded. The git history was rewritten to scrub this; do not reintroduce any of it,
  including in a log entry describing a crash on someone's account.
- If you change `src/db/schema.ts`, update `docs/architecture/data-model.md` in the same change.
- Migrations apply automatically during the Vercel build (`vercel.json` chains `db:migrate && build`).
- Present findings before implementing anything structural. Small, well-scoped fixes can just be done and
  explained afterward. The user wants to be asked before large pivots, but is comfortable with a clear
  recommendation on smaller calls.
- Update `docs/product/implementation-log.md` after every iteration so the work can be paused and resumed.
