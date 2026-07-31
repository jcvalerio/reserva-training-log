# Kickoff prompt: mobile expert critical assessment (round 2)

Paste everything below into a new Claude Code session in this repo to start the work. It's written to be self-contained — you shouldn't need the prior conversation.

---

Act as a senior mobile UI/UX expert for sports/fitness apps and do a **critical assessment** of this app as it stands today. This is a follow-up to an earlier audit — the previously-flagged issues are already fixed and confirmed working well by the real user on their real iPhone. Your job this round is different: form your own independent judgment about what's still weak, inconsistent, or could be meaningfully better, across the *whole* app, not just the screens touched last time. Don't assume anything is fine just because it wasn't flagged before — look for yourself.

## What this app actually is

Read `docs/product/next-task.md` and `docs/product/implementation-log.md` (newest entries first) before touching anything — they're the source of truth and always current. Short version: a Spanish-first, iPhone-only web app (`https://gym.jcvalerio.com`) for building a workout plan manually (a small template catalog or a custom day-by-day builder), logging every set in the gym with RIR (reps in reserve) and pain, and getting RIR-based progression suggestions from that real logged history. No AI generation anywhere — don't reintroduce that framing.

Bottom nav (`src/app/home-nav.ts`): Inicio, Perfil, Plan, Entrenar, Progreso — 5 items (Mediciones was moved under Perfil in the last audit). Single-column `max-w-md` layout, dark theme (zinc-950 background, emerald-300 accent), no charting library, no design system beyond hand-written Tailwind classes.

## What happened in the previous audit — read before assessing

Full detail is in `docs/product/implementation-log.md`'s 2026-07-31 entries, but the headline: the user's "some buttons unreadable" complaint turned out to be a genuine CSS bug, not a design inconsistency — `globals.css` had `a { color: inherit }` declared outside any Tailwind `@layer`, and per the CSS cascade-layer spec, unlayered rules always beat layered ones regardless of specificity, so every primary button built as a `<Link>` silently lost its dark text while `<button>`-based ones didn't. It was invisible from a source-code grep and only surfaced by checking `getComputedStyle` on the live rendered page. Take this as a standing lesson for this round too: **read the real rendered page and its real computed styles, not just the JSX/Tailwind classes** — a class being present in the source doesn't mean it's winning the cascade.

Also fixed last round: `/plan` was trimmed heavily (dropped a stale pre-plan gate that kept showing after a plan was already active, cut filler copy, moved the day-by-day breakdown into a new `/plan/rutina` route paginated by day with tap-to-jump pills instead of one long scroll of nested `<details>`), Mediciones moved from the bottom nav into a Perfil link, a stale `grid-cols-7`-for-6-items nav bug, and Editar/Duplicar de-emphasized to text links. All deployed and working. Don't re-litigate these unless you find something has actually regressed.

## How to work

1. `nvm use v24.18.0`, then `npm run dev`.
2. Use the Playwright MCP tools at an iPhone viewport (390×844). This app only supports Google OAuth — when you hit the real sign-in screen, **stop and ask the user to complete the login themselves** in that browser window (or ask how they'd like to authenticate); don't attempt to log in with credentials you don't have, and don't fabricate a bypass without asking first.
3. Screenshot every screen, not just the ones flagged last time — go broader. At minimum: `/`, `/perfil`, `/mediciones`, `/plan`, `/plan/rutina`, `/plan/templates`, `/plan/templates/[templateId]`, `/plan/builder` and its session editor, `/entrenar`, `/entrenar/[sessionId]` (both mid-session and a completed-session summary), `/progreso`.
4. For anything that looks visually off, check `getComputedStyle` on the actual element before concluding it's a design choice vs. a bug — the pattern that caught the real bug last time.
5. Present findings before implementing broad or structural changes. Small, well-scoped fixes (copy trims, spacing, a button style, a clear bug) can just be done and explained afterward. Anything structural (new routes, nav changes, page restructuring) should be confirmed with the user first — they've been clear they want to be asked before large pivots but are comfortable with a clear recommendation on smaller calls.

## Specific areas worth a close look (not exhaustive — form your own view too)

- **`/plan/templates` and `/plan/templates/[templateId]`**: these still use the original always-collapsible per-day pattern (tap "Ver ejercicios y objetivos" to expand), which `/plan`'s active-plan view moved away from last round in favor of day-pagination. That was a deliberate call at the time ("review everything before committing" is a different use case from "ongoing reference for an active plan") — now that both patterns exist side by side in the app, re-evaluate whether that reasoning actually holds up, or whether the template preview should adopt the same day-pagination pattern for consistency.
- **`/plan/builder`** and its session editor (`session-editor-form.tsx`): the day-by-day custom-plan-creation flow hasn't been critically assessed at all yet.
- **`/perfil`**: a long single-scroll form with no progressive disclosure. Separately from the already-known fact that most of its fields are currently unused data (a deliberate, out-of-scope decision — see `next-task.md`'s "Perfil form simplification" backlog item, don't re-open that question unless asked), is the form itself well-organized as a piece of mobile UI regardless of what happens to the data?
- **`/mediciones`**: dense form + trend cards + history list stacked on one page. Only its nav placement was assessed last round, not its own internal layout/UX quality.
- **Consistency pass**: badge/pill styling, spacing rhythm, heading hierarchy, and button conventions across all screens — does the app read as one coherent designed system, or as a patchwork that accumulated across many small sessions? (It's the latter, structurally — the question is whether it *feels* that way to a user.)
- **Accessibility**: focus rings, tap-target sizing (44px minimum is the usual bar), color contrast beyond the specific bug already fixed, semantic roles/labels — a systematic pass, not just what you happen to notice.
- **Empty and error states**: what does a brand-new user with no plan, no logged sets, and no measurements actually see on `/progreso` and `/mediciones`? What does a genuinely broken/error state look like anywhere in the app?

## Working conventions (same repo, same rules)

- `nvm use v24.18.0` before any `npm run` command.
- Before committing: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, all green.
- Prefer editing existing files/patterns over introducing a new UI library — there's no component library today; flag it explicitly to the user if you think one is warranted rather than adding it unilaterally.
- If a change touches `src/db/schema.ts`: `npm run db:generate`, review the SQL, `npm run db:migrate` against dev, verify, then it applies automatically on deploy (see below). Avoid deploying while a workout session might be actively in progress.
- **Deploying**: this checkout has no git remote configured, so deploys don't go through git push/PR — see `docs/architecture/release-workflow.md`'s "How deploys actually happen today" section for the exact, verified steps (`npx vercel deploy --prod --yes`, not a bare `vercel` command, after `nvm use v24.18.0`). Only deploy when the user asks you to.
- **Committing**: only commit when the user explicitly asks, per their stated preference from the last session.
- Update `docs/product/implementation-log.md` (newest entry first) and `docs/product/next-task.md` after each meaningful change.
- This is a real production app with a real active plan and real logged history for the user and their spouse — treat any visual/structural change to `/entrenar` and `/plan` with real care; verify it doesn't break the actual daily-use flow, not just that it typechecks.
- No AI plan generation — plans are manual only. Spanish-first UX; English support fields must not be removed even though unused. Preserve pain-aware framing: pain >2 blocks aggressive progression, pain >3 flags reduce/modify, pain ≥7 flags stop/professional-guidance.

Start by looking at the real, current screens (screenshots and computed styles, not just source) before proposing anything — that's what caught the real bug last time, and there's no reason to assume everything else is clean just because it hasn't been checked yet.
