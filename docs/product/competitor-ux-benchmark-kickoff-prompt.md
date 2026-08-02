# Kickoff prompt: competitor UX benchmark — routine definition & session recording

Paste everything below into a new Claude Code session in this repo to start the work. It's written to be self-contained — you shouldn't need the prior conversation.

---

Act as a Principal Product Designer doing a **competitive UX benchmark**, not a feature audit. The goal is to identify small, concrete improvements to how this app already does two things — **defining a routine** and **recording a session** — by comparing our real current screens against how well-regarded lifting-log apps handle the same two jobs. This is explicitly **not** a "find new features to add" exercise. We're not trying to become a bigger app; we're trying to make the two things this app already does feel as good as the best apps in this category make them feel.

## What this app actually is

Read `docs/product/next-task.md` and `docs/product/implementation-log.md` (newest entries first) before proposing anything — they're the source of truth and always current. Short version: a Spanish-first, iPhone-only web app (`https://gym.jcvalerio.com`) for building a workout plan manually (a small template catalog or a custom day-by-day builder), logging every set in the gym with RIR (reps in reserve) and pain, and getting RIR-based progression suggestions from that real logged history. No AI generation anywhere — don't reintroduce that framing. Single-column `max-w-md` layout, dark theme (zinc-950 background, emerald-300 accent), no design system beyond hand-written Tailwind classes.

## The two flows in scope — nothing else

**1. Routine definition** — the whole "build/adjust a plan" surface:
- `/plan/builder` + `/plan/builder/session/[dayIndex]` (`session-editor-form.tsx`) — the custom day-by-day builder, free-text exercise entry with an autocomplete datalist.
- `/plan/templates` + `/plan/templates/[templateId]` — the small fixed catalog (hypertrophy split, fat-loss circuit).
- `/plan`, `/plan/rutina`, `/plan/historial`, `/plan/historial/[planId]` — reviewing/editing/browsing plans once they exist.
- `/plan/compartir` — sharing a plan to another account (a recent addition, low-traffic, worth a glance but not the focus).

**2. Session recording** — the "actually training right now" surface:
- `/entrenar` (day picker/overview) and `/entrenar/[sessionId]` (`session-runner.tsx`) — the live logging screen: weight/reps/RIR/pain/notes per set, previous-performance display, progression suggestions, rest handling (or lack of it), completing a session with optional RPE/notes.

Everything else in the app (`/progreso`, `/mediciones`, `/perfil`) is out of scope for this pass.

## Competitors to research

Primary reference: **MyFitCoach** — [myfitcoach.app](https://www.myfitcoach.app/en) and its [Google Play listing](https://play.google.com/store/apps/details?id=de.myfitcoach.tim.mfc&hl=en). You can't install and use a native Android/iOS app directly, so lean on: the marketing site's own screenshots/copy, the Play Store listing's screenshots and description, and — if you can find them via web search — third-party reviews, walkthrough videos/blog posts, or Reddit/forum threads describing the actual in-app experience (r/fitness, r/formcheck-adjacent lifting-log discussions often compare Hevy/Strong/MyFitCoach/Boostcamp directly). Cite what you're basing a claim on; don't invent UI details you can't actually confirm from a source.

Feel free to bring in 1-2 other prominent lifting-log apps as secondary reference points **only if it sharpens a specific comparison** (e.g. Hevy and Strong are the most commonly cited "best in class" for this exact category — routine building + set-by-set logging). Don't turn this into a broad market survey; MyFitCoach is the named benchmark, others are supporting evidence at most.

## Method

1. **Ground yourself in the real current app first.** `nvm use v24.18.0`, `npm run dev`, then use the Playwright MCP tools at an iPhone viewport (390×844) to actually walk both flows against the real dev DB, logged in as the real user (this app is Google-OAuth-only — if you hit the sign-in screen, stop and ask the user to complete it, don't fabricate a bypass). Screenshot: the builder end to end (create a day, add an exercise, edit one with existing logged history), a template preview, `/plan`'s active-plan summary, and a live `/entrenar` session including logging a set and seeing the previous-performance/progression-suggestion display. You need to know exactly what exists today before you can say what's missing or clunky.
2. **Research the competitor(s)** using the sources above, specifically for how they handle routine definition and session recording — not their whole feature set. Look for concrete interaction patterns, not just visual style: how exercises get added/reordered/searched (autocomplete with an exercise library? images/videos? superset/circuit grouping?), how a set gets logged (rest timers, plate-math helpers, quick increment/decrement, keyboard vs. picker inputs, swipe gestures, previous-set pre-fill), how progression/history shows up in the moment, how much friction there is between "finish one set" and "start the next."
3. **Synthesize a short, prioritized list** of small, concrete improvements to *our* app — each one should name the specific friction point in our current UI it addresses, what the competitor(s) do differently, and a rough effort estimate. Bucket by the two flows. Favor genuinely small steps (a rest-timer affordance, better numeric input for weight/reps, a faster exercise-add path, clearer set-completion feedback) over anything that reads as a rebuild. If something you find is only fixable by a real structural change or a new dependency, say so explicitly rather than downscoping it to fit — but expect most of the list to be small.
4. **Present the shortlist and get it confirmed** before implementing anything — same pattern as recent sessions in this project (see `implementation-log.md`'s recent entries for how that's worked well: a clear recommendation, `AskUserQuestion` for genuine forks, then build what's agreed). Once confirmed, small well-scoped items can just be implemented directly; anything touching `src/db/schema.ts` or adding a new dependency needs explicit sign-off first.

## Working conventions (same repo, same rules)

- `nvm use v24.18.0` before any `npm run` command.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, all green.
- Prefer editing existing files/patterns over introducing a new UI library or dependency; flag it explicitly and get confirmation rather than adding one unilaterally.
- If a change touches `src/db/schema.ts`: `npm run db:generate`, review the SQL, `npm run db:migrate` against dev, verify, then it applies automatically on deploy. Avoid deploying while a workout session might be actively in progress.
- **Deploying**: this checkout has no git remote configured, so deploys don't go through git push/PR — see `docs/architecture/release-workflow.md`'s "How deploys actually happen today" section for the exact steps (`npx vercel deploy --prod --yes` after `nvm use v24.18.0`). Only deploy when the user asks.
- **Committing**: only commit when the user explicitly asks.
- Update `docs/product/implementation-log.md` (newest entry first) and `docs/product/next-task.md` after each meaningful change.
- This is a real production app with a real active plan and real logged history for the user (and family members who now have their own accounts via plan sharing) — verify any change to `/plan/builder` or `/entrenar` doesn't break the actual daily-use flow, not just that it typechecks. Clean up any throwaway data created while testing.
- No AI plan generation — plans are manual only. Spanish-first UX; English support fields must not be removed even though unused. Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain ≥7 flags stop/professional-guidance.

Start by screenshotting the real current app, then research the competitor(s) — ground the comparison in what actually exists on both sides, not assumptions about either.
