# Kickoff prompt: mobile UI/UX audit

Paste everything below into a new Claude Code session in this repo to start the work. It's written to be self-contained — you shouldn't need the prior conversation.

---

I want you to act as an expert mobile UI/UX designer for sports/fitness apps and challenge this app's current mobile UI, then implement the improvements we agree on.

## What this app actually is

Read `docs/product/next-task.md` and `docs/product/implementation-log.md` (newest entries first) before touching anything — they're the source of truth. Short version: this is **not** an AI personal trainer. It's a Spanish-first, iPhone-only web app (`https://gym.jcvalerio.com`) for:

1. Building a workout plan manually — either a small template catalog (`/plan/templates`, currently a hypertrophy split and a fat-loss A/B circuit) or a custom day-by-day builder (`/plan/builder`).
2. Logging every set in the gym (`/entrenar`) — weight, reps, RIR (reps in reserve), pain score, notes.
3. Getting RIR-based progression suggestions and improvement signals from that real logged history (`/progreso`).

There is no AI generation anywhere (that framing was deliberately removed 2026-07-31 — don't reintroduce it). The whole point of the app is: build a plan once, then the RIR/pain-aware logging + progression loop is the actual daily-use product.

Current nav (`src/app/home-nav.ts`): Inicio, Perfil, Mediciones, Plan, Entrenar, Progreso — 6 items, bottom tab bar (`src/app/mobile-bottom-nav.tsx`), single-column `max-w-md` layout (`src/app/app-shell.tsx`), dark theme (zinc-950 background, emerald-300 accent), no charting library, no design system beyond hand-written Tailwind classes.

## Specific things to challenge

The user (who actually uses this app daily on an iPhone) flagged these directly — investigate each for real, don't just take the framing at face value:

### 1. `/plan` is one long scroll that mixes too much

`src/app/plan/plan-page-content.tsx`'s `ActivePlanSummary` stacks, on one page, in one scroll: plan name, status badges, 2 stat tiles, the plan's full safety/progression summary text, a "logging fields" tag list, then `PlanSessionsList` — a card *per training day*, each with its own expandable `<details>` full of every exercise's sets/reps/RIR/notes — then edit/duplicate buttons, then (below all of that) a whole separate "¿Prefieres tu propia rutina?" custom-builder entry point, then a generic pain-safety disclaimer box. For a 5-day plan with 15-18 exercises per day (the fat-loss template), this is a *lot* of vertical content even before expanding anything.

Evaluate: would a summary view (plan name, key stats, maybe today's/next session) + navigating to a separate detail view for "see all sessions and exercises" reduce scroll fatigue and make the page easier to scan? You're the mobile UX expert here — form your own opinion on the right split, don't just do the literal first idea. Consider: does the active-plan summary need the full exercise-level detail at all, given `/entrenar` already shows exercise detail in context while training?

### 2. Button/nav color contrast — investigate before assuming a fix

The user's impression: "some buttons are white text on green (hard to read), others are green/black (much better)." I checked the source with a grep pass and found every primary `bg-emerald-300` button/link consistently uses `text-zinc-950` (near-black) — no literal white-on-green Tailwind class combination exists in the codebase today. So either:
- It's the **secondary/outline buttons** (`bg-zinc-950` with pale `text-emerald-300`/`text-emerald-200` text) that read as low-contrast or "whitish" at a glance on an actual phone screen, or
- It's something about real-device rendering (font smoothing, screen brightness, dark-mode interaction) that a static code read can't catch.

**Don't trust my grep — take real screenshots** (Playwright MCP tools are available) of the key screens on an iPhone-sized viewport and actually look. Then design one consistent, accessible button color system (primary/secondary/destructive or however you want to categorize it) and apply it everywhere, rather than patching individual spots.

### 3. Confirmed small bug: bottom nav grid is `grid-cols-7` with 6 items

`src/app/mobile-bottom-nav.tsx` line 24: `<div className="grid grid-cols-7 gap-1">` — stale from before "Pesos base" was removed from the nav (there were 7 items then). Now there are 6 (`src/app/home-nav.ts`), so there's a dead empty 7th column. Fix this regardless of anything else.

### 4. Emoji/icons for nav items

Evaluate whether adding an emoji or icon per nav item (Inicio/Perfil/Mediciones/Plan/Entrenar/Progreso) improves scannability at the current tiny bottom-tab size (`text-[0.68rem]`), or whether it'd feel unpolished/inconsistent given there's no icon system in place today. If you recommend it, pick a consistent visual language (all emoji, or all one icon set — not mixed).

### 5. Information architecture: does Mediciones belong under Perfil?

The user's idea: fold `/mediciones` into the Perfil/account area instead of keeping it as its own top-level nav destination. Evaluate honestly — `/mediciones` has real standalone value (body measurement history + asymmetry gaps, and it now feeds a training-load-adjacent trend card on `/progreso`), so moving it isn't free. Consider: does it get used often enough to deserve a permanent bottom-tab slot, or would it fit better as a link from Perfil (freeing a nav slot, or letting nav items breathe more at 6 → fewer)? Also consider whether `/progreso`'s existing body-measurement trend card makes a dedicated nav slot for `/mediciones` less necessary day-to-day.

## Also worth a look while you're in here

- `src/app/plan/templates/templates-page-content.tsx` and the builder pages (`src/app/plan/builder/`) — same mobile-scroll questions likely apply.
- `/entrenar`'s session-runner (`src/app/entrenar/[sessionId]/session-runner.tsx`) is the highest-frequency screen (used every single workout) — if you only have time to deeply polish one screen, this is probably it.
- Check whether `PlanSessionsList`'s nested `<details>`-in-`<details>` pattern (session card → expand → exercise list) is actually good progressive disclosure or just adds tap friction.

## Working conventions (same repo, same rules)

- `nvm use v24.18.0` before any `npm run` command — the ambient shell may default to a Node version that breaks Vitest's config loader.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, all green.
- Prefer editing existing files/patterns over introducing a new UI library — there's no component library today (hand-written Tailwind), and pulling one in mid-project is a bigger call than a UX polish pass; flag it to the user explicitly if you think it's warranted rather than doing it unilaterally.
- If a change touches `src/db/schema.ts`, follow the existing migration discipline: `npm run db:generate`, review the SQL, `npm run db:migrate` against dev, verify, then it auto-applies on `vercel deploy --prod --yes` (migrations run as part of the Vercel build command). Avoid deploying while a workout session might be in progress.
- Update `docs/product/implementation-log.md` (newest entry first) and `docs/product/next-task.md` after each meaningful change — this is how work stays resumable across sessions in this project.
- This is a real production app with a real active plan and real logged history for the user and their spouse — treat any visual/structural change to `/entrenar` and `/plan` with the same care as a data-model change; verify it doesn't break the actual daily-use flow, not just that it typechecks.
- The user prefers being asked before large structural pivots (e.g., adopting a component library, fundamentally restructuring `/plan`'s navigation) but is comfortable with you making and implementing a clear recommendation for smaller, well-scoped calls (like the button color system) rather than presenting every option.

Start by looking at the real, current screens (screenshots, not just source) before proposing anything — several of the user's complaints may map to different actual causes than the first guess, the same way the "button color" one likely does.
