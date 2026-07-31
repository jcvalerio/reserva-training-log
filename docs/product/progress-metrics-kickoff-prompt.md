# Kickoff prompt: base set of charts, metrics, and KPIs for /progreso

Paste everything below into a new Claude Code session in this repo to start the work. It's written to be self-contained — you shouldn't need the prior conversation.

---

Act as a product-minded data/fitness-analytics thinker for this app. The goal of this session is to **design** (not necessarily build yet) a base set of charts, metrics, and KPIs for `/progreso` that would genuinely help the real user understand whether their training is working — not to add visualizations for their own sake. Propose a plan, get it confirmed, then implement what's agreed.

## What this app actually is

Read `docs/product/next-task.md` and `docs/product/implementation-log.md` (newest entries first) before proposing anything — they're the source of truth and always current. Short version: a Spanish-first, iPhone-only web app (`https://gym.jcvalerio.com`) for building a workout plan manually (a small template catalog or a custom day-by-day builder), logging every set in the gym with RIR (reps in reserve) and pain, and getting RIR-based progression suggestions from that real logged history. No AI generation anywhere — don't reintroduce that framing. Single-column `max-w-md` layout, dark theme (zinc-950 background, emerald-300 accent), **no charting library currently installed**, no design system beyond hand-written Tailwind classes.

## What `/progreso` already shows today

Read `src/app/progreso/progreso-page-content.tsx` directly — this summary will drift, that file won't:

- A **body-measurement trend card** (`src/measurements/measurement-trend.ts`): weight/waist delta, thigh/calf asymmetry gap — but only **oldest vs. latest of a fetched window**, not a real time series.
- **Improvement cards per exercise** (`src/workouts/improvement.ts`): volume load, avg weight/reps, estimated 1RM, asymmetry gap — again, only **latest vs. immediately-previous instance**, a 2-point comparison, not a series.
- A **training-load trend line** (`src/workouts/session-load.ts`): Foster's session-RPE method (RPE × duration), only as a single "average of last 5 sessions" number, not plotted over time.
- A **session history list**: date, duration, training load per completed session.

**The important architectural fact for this work**: every one of these is a pairwise (latest-vs-previous) comparison computed fresh on each render — there is no repository function anywhere that returns an ordered time series for a metric. Real charts (a line over the last N sessions, a per-exercise weight-progression curve, etc.) will likely need new query functions, not just new UI on top of what exists. Confirm this by reading the actual repository files (`src/workouts/workout-repository.ts`, `src/measurements/measurement-repository.ts`) rather than trusting this summary.

## Raw data already being captured (what you have to work with)

Per set (`setLog`): weight, reps, RIR, pain (0-10), optional notes, timestamp (via its session).
Per session (`workoutSession`): start/complete timestamps → duration, optional session RPE (Borg CR10, 1-10), optional notes, which day/template it was.
Per measurement (`bodyMeasurement`): weight, waist, thigh/calf (left+right, so asymmetry is derivable), optional notes, timestamp — user logs these every ~2 weeks, not every session.
`docs/product/progression-rules.md` defines the existing "5% improvement" signal set (volume load, pain, reps-at-load, load-at-reps, estimated 1RM, asymmetry) — read it before inventing new signal definitions from scratch; extend or reuse this vocabulary rather than duplicating it.

## How to work

1. `nvm use v24.18.0`, then `npm run dev`. Use the Playwright MCP tools at an iPhone viewport (390×844) to look at the real `/progreso` (and `/mediciones`) as they render today, logged in as the real user against the real dev DB — don't design against a mental model of the page, look at it.
2. This is fundamentally a design/prioritization task before an implementation task. Come with a proposed **short list** (not an exhaustive catalog) of charts/metrics/KPIs, each with: what question it answers for the user, what data it needs (and whether that data already exists or needs a new query), and roughly how much new code it implies (a new repository query vs. a new chart-rendering approach vs. both).
3. Think about **chart rendering approach** explicitly and present it as a real decision, not an assumption: no charting library exists yet. Options include a lightweight library (recharts, visx, etc.), hand-rolled inline SVG (matches this app's "no dependencies beyond what's justified" pattern so far — check `docs/product/mvp-plan.md`/`docs/architecture/technical-stack.md` for the project's stated dependency philosophy), or something else. Recommend one with reasoning; don't add a dependency unilaterally.
4. Present the proposed set of charts/metrics + the rendering-approach decision to the user before implementing — this is exactly the kind of "structural" addition (new visual pattern, possibly a new dependency, new queries) that this project's convention says to confirm first, not just a copy trim or bug fix.
5. Once confirmed, implement incrementally and verify each addition against real dev-DB data via Playwright screenshots — this user's actual training history is sparse in places (some days have zero real logged sets, only smoke-test completions), so check that empty/sparse-data states for any new chart look intentional, not broken.

## Starting angles to think about (not a fixed checklist — form your own view too)

- **Per-exercise weight/volume progression over time** — the single most obvious "is this working" chart for a strength app, and currently entirely absent (only 2-point comparisons exist today).
- **Training consistency** — sessions per week over time, adherence to the plan's target days/week (`athleteProfile.targetTrainingDaysPerWeek` already exists, is captured, and is currently unused for this purpose).
- **Pain trend** — given how central pain-aware progression is to this app's whole premise, is pain-over-time (overall, or per exercise/muscle group) worth surfacing as its own chart rather than only a per-set/per-comparison value?
- **Training load over time** (already computed as a single average — worth plotting as a real trend line?).
- **Body-measurement time series** — real multi-point trend lines instead of oldest-vs-latest, now that `/mediciones` history exists.
- Consider explicitly which of these are **KPIs** (a small number of headline numbers worth a dashboard-style summary at the top of `/progreso`) vs. **charts** (worth their own visual, further down or on a dedicated view) — don't assume everything needs to be a chart.

## Working conventions (same repo, same rules)

- `nvm use v24.18.0` before any `npm run` command.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, all green.
- Prefer editing existing files/patterns; if you recommend a charting library, justify it explicitly rather than adding it unilaterally.
- If a change touches `src/db/schema.ts`: `npm run db:generate`, review the SQL, `npm run db:migrate` against dev, verify, then it applies automatically on deploy. Avoid deploying while a workout session might be actively in progress.
- **Deploying**: this checkout has no git remote configured, so deploys don't go through git push/PR — see `docs/architecture/release-workflow.md`'s "How deploys actually happen today" section for the exact, verified steps (`npx vercel deploy --prod --yes`, not a bare `vercel` command, after `nvm use v24.18.0`). Only deploy when the user asks you to.
- **Committing**: only commit when the user explicitly asks.
- Update `docs/product/implementation-log.md` (newest entry first) and `docs/product/next-task.md` after each meaningful change.
- This is a real production app with a real active plan and real logged history for the user and their spouse — any throwaway data created while testing (e.g. draft plans, test measurements) must be cleaned up immediately after and verified via `git diff`/live checks, never left behind.
- No AI plan generation — plans are manual only. Spanish-first UX; English support fields must not be removed even though unused. Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain ≥7 flags stop/professional-guidance.

Start by reading the current `/progreso` code and screenshotting the real page before proposing anything — ground the proposal in what actually exists today (both in the data and on screen), not assumptions about either.
