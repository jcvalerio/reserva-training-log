# Kickoff prompt: letting a user log more sets than the plan configured

Paste everything below into a new Claude Code session in this repo to start the work. It's written to be self-contained — you shouldn't need the prior conversation.

---

This session has two phases, in order. **Do not skip phase 1** — the user explicitly wants a real training-science judgment call before any UX/engineering work starts.

**Phase 1 — act as an expert strength & conditioning coach.** The user's ask: an exercise is configured for 2 sets, but mid-session they want to do 3 (or more), and today the app won't let them. Evaluate whether letting a user exceed the plan's configured set count is something that should actually be supported, or whether there's a real training-science reason to keep it constrained. Form a real opinion — this is not a rhetorical step before phase 2, it should change scope if the honest answer is "sometimes yes, sometimes no, here's the distinction."

**Phase 2 — if phase 1 says yes (probably, with caveats)**, act as a principal mobile product designer and design the UX for it, then get it confirmed before implementing. Two distinct asks to design for, which may need different answers:
1. **Add a set for this session only** — a one-off, doesn't change the plan.
2. **Add a set and update the plan** — persist the new set count so future sessions of this exercise default to it too.

## What this app actually is

Read `docs/product/next-task.md` and `docs/product/implementation-log.md` (newest entries first) before proposing anything — they're the source of truth and always current. Short version: a Spanish-first, iPhone-only web app (`https://gym.jcvalerio.com`) for building a workout plan manually (a small template catalog or a custom day-by-day builder), logging every set in the gym with RIR (reps in reserve) and pain, and getting RIR-based progression suggestions from that real logged history. No AI generation anywhere. Single-column `max-w-md` layout, dark theme (zinc-950 background, emerald-300 accent), no design system beyond hand-written Tailwind classes.

## The exact current mechanic — verified, not assumed

- `exercisePrescription.targetSets` (an integer column, part of whichever plan/day this exercise belongs to) is the planned set count. For a unilateral exercise it means sets *per side*, not a shared total (see the doc comment on `isExerciseComplete` in `session-runner.tsx` and on `buildProgressionSuggestion` in `progression-view.ts`).
- **The backend has no cap.** `saveSetForSession` (`src/workouts/workout-repository.ts`) just inserts a new `setLog` row with `setNumber = existingSets.length + 1` — nothing there checks against `targetSets`. The block is purely in the UI.
- **The actual gate**: `isExerciseComplete()` in `session-runner.tsx` returns true once `loggedSets.length >= targetSets` (or, for unilateral, once *both* sides individually reach `targetSets`). Once true, the logging `<form>` is replaced entirely by a static "Series objetivo completadas para este ejercicio." paragraph — no button, no way back in. That's the exact thing to fix.
- **A real, non-obvious interaction with progression suggestions** — this is the part phase 1 needs to reckon with, not just phase 2: `buildProgressionSuggestion` passes *every* logged set for the exercise into `suggestProgression` (`src/training/progression.ts`), which computes `maxPain = Math.max(...)` across all of them, `averageRir = average(...)` across all of them, and `reachedTopOfRange = sets.every(set => actualReps >= plannedRepMax)` across all of them. Concretely: if someone adds a bonus 3rd set that's lighter, or a fun AMRAP-to-failure set, or just has one twinge of pain on it, that set changes the average RIR, can flip `reachedTopOfRange` to false, or can trip the pain flag — for the *whole exercise's* next-session recommendation, even though the two *planned* sets were completed perfectly. Whatever UX gets designed needs an explicit answer for this: do bonus sets count toward the progression calculation the same as planned sets, or are they excluded/flagged differently? Don't guess — trace through `suggestProgression`'s actual logic yourself and form a view.
- Separately, `previousLastSet = previousPerformance.sets.at(-1)` in `session-runner.tsx` anchors the *next suggested weight* to the literal last logged set of the previous session. If a bonus set was a deliberately lighter backoff set, that becomes the anchor for next time's weight suggestion — worth the same scrutiny.

## What to actually design (phase 2, once phase 1 gives a clear yes/no/it-depends)

1. **Adding a set this session only**: some UI affordance to keep logging past `targetSets` without it silently becoming the new plan. Think about exactly where this lives relative to the existing "Series objetivo completadas" message and the rest of the exercise flow (`session-runner.tsx`), and how it interacts with the unilateral per-side completion logic specifically (adding a bonus set to one side only, both sides, either?).
2. **Adding a set *and* updating the plan**: this needs a real decision on mechanism — is it automatic (finish a bonus set, get offered "hacer esto tu nuevo objetivo?"), or does it just point the user at the existing builder edit flow (`/plan/builder` → session editor) where `targetSets` is already an editable field? Check `src/plans/plan-builder-repository.ts` and `session-editor-form.tsx` for what already exists before designing something new — this might already be 90% solved by linking to what's there rather than building a second way to edit the same field.
3. **Other pros/cons worth thinking through, not a fixed checklist**:
   - Does allowing arbitrary bonus sets undercut the app's whole "the plan is a deliberate, trackable structure" premise, or is it exactly the kind of autoregulation (some days you have more in the tank) the RIR/pain framing already assumes?
   - Unilateral asymmetry: does a bonus set on the thinner side only (matching the app's own "lead with the thinner side" logic, see the 2026-08-02 implementation-log entries on `determineSmallerSide`) need different handling than a bonus set added symmetrically to both sides?
   - Does the fix belong in `session-runner.tsx` alone, or does `isExerciseComplete` need to change meaning app-wide (it's also read elsewhere — check call sites before assuming it's local to one file)?
   - Is there a risk of this becoming a "just add sets forever" pattern that erodes the plan's meaning over weeks, and if so, is that a UX nudge problem (e.g., a soft confirmation) or a non-problem?

## How to work

1. `nvm use v24.18.0`, then `npm run dev`. Use the Playwright MCP tools at an iPhone viewport (390×844) against the real dev DB, logged in as the real user — this app is Google-OAuth-only; if you hit the sign-in screen, stop and ask the user to complete it, don't fabricate a bypass. Screenshot the exact "Series objetivo completadas" dead-end live before proposing a fix for it.
2. Phase 1's conclusion should be a short, direct written judgment — not hedged into oblivion — before phase 2 starts.
3. Present the phase 2 proposal (both the one-off and persist-to-plan mechanisms) via `AskUserQuestion` for the genuine forks, then build what's agreed. Small, well-scoped pieces can be implemented directly once confirmed; anything touching `src/db/schema.ts` (unlikely here — `targetSets` already exists) or adding a new dependency needs explicit sign-off first.
4. Verify against real dev-DB data, including at least one unilateral exercise (the app's own logic treats unilateral completion differently — don't only test a bilateral exercise and assume it generalizes).

## Working conventions (same repo, same rules)

- `nvm use v24.18.0` before any `npm run` command.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, all green.
- Prefer editing existing files/patterns over introducing a new UI library or dependency; flag it explicitly and get confirmation rather than adding one unilaterally.
- If a change touches `src/db/schema.ts`: `npm run db:generate`, review the SQL, `npm run db:migrate` against dev, verify, then it applies automatically on deploy. Avoid deploying while a workout session might be actively in progress.
- **Deploying**: this checkout has no git remote configured, so deploys don't go through git push/PR — see `docs/architecture/release-workflow.md`'s "How deploys actually happen today" section for the exact steps (`npx vercel deploy --prod --yes` after `nvm use v24.18.0`). Only deploy when the user asks.
- **Committing**: only commit when the user explicitly asks. Note: this repo signs commits via 1Password's SSH agent (`commit.gpgsign=true`) — if a commit fails with a 1Password/signing error, that's the agent needing to be unlocked, not something to route around with `--no-gpg-sign`.
- Update `docs/product/implementation-log.md` (newest entry first) and `docs/product/next-task.md` after each meaningful change.
- This is a real production app with a real active plan and real logged history for the user (and family members with their own accounts via plan sharing) — verify any change to `/entrenar` doesn't break the actual daily-use flow, not just that it typechecks. Clean up any throwaway data created while testing, verified via `git diff`/a direct DB check afterward.
- No AI plan generation — plans are manual only. Spanish-first UX; English support fields must not be removed even though unused. Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain ≥7 flags stop/professional-guidance.

Start with phase 1 — a real coaching judgment, grounded in how `suggestProgression` actually works today — before designing anything.
