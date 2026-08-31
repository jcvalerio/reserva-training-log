# Kickoff prompt: continue Reserva after the 2026-08-31 session

Paste everything below into a new Claude Code session in this repo. It's written to be self-contained — you shouldn't need the prior conversation.

---

Pick up work on Reserva. Read these three, in order, before touching anything: `docs/product/project-status.md` (where things stand and what constrains a new feature), `docs/product/next-task.md` (the immediate next thing), then the newest entries of `docs/product/implementation-log.md` (how decisions were reached). They are the source of truth and are current as of 2026-08-31.

## What this is, in one paragraph

**Reserva** (`https://gym.jcvalerio.com`, public repo `jcvalerio/reserva-training-log`) is a Spanish-first, iPhone-only web app for building a hypertrophy plan by hand, logging every set with weight, reps, RIR and a pain score, and getting a progression suggestion that a pain score can veto. Next.js 16 (Turbopack), React 19, TypeScript strict, Tailwind 4, Drizzle + Neon, better-auth, Vercel. **There is no AI in the product and that is deliberate** — plan generation was evaluated and dropped at milestone M3. Do not reintroduce that framing.

## How work ships now — this changed on 2026-08-31

**Code goes through a pull request. Never push code straight to `main`.** Use the `/pr` command, which encodes the whole workflow. In short: branch as `<type>/<short-kebab-summary>`, run `nvm use v24.18.0` then `npm run lint && npm run typecheck && npm run test && npm run build` **before** committing, conventional signed commit, then `gh pr create` with a body that carries the reasoning plus a concrete "what to check on the preview". Docs-only changes still go straight to `main`.

**Merging to `main` deploys to production automatically.** Treat a merge as a deploy. Never merge a PR you were not asked to merge, and never while a workout session may be `status = 'active'` — real people train on this.

**Every PR gets a Vercel preview.** Report the preview URL alongside the PR link; it is the only way the work can be checked on a real iPhone. To test anything behind auth on a preview, alias it first — Google OAuth needs an exact redirect URI and preview URLs are dynamic:

```
npx vercel alias <preview-url> preview.gym.jcvalerio.com
```

Then open `https://preview.gym.jcvalerio.com`. Unauthenticated pages (`/`, `/privacidad`) work on any preview URL. The preview runs against its own Neon branch, so its data is disposable and separate from production.

**If a commit fails with `1Password: failed to fill whole buffer`, the vault is locked.** The fix is unlocking it — never `--no-gpg-sign`. Every commit in this repo is signed.

## Start here: ask what happened in the session

The owner's wife trained on 2026-08-31 using features shipped the night before. **Before starting anything else, ask how it went**, specifically:

1. Did the **reassign / swap** correction work on her real mis-filed history? She was repairing a day where every exercise held its neighbour's work.
2. Did **"+ Agregar una serie que falta"** work on a completed session — the one that shipped broken and was fixed in `193a142`?
3. Does `/progreso` read correctly now for the exercises she repaired?

Her feedback has been the most reliable bug-finding instrument on this project. Three separate defects were found by her using the app, including one that every local check passed.

## Known gaps, in the order I would take them

### 1. Nothing shipped on 2026-08-31 was checked in a real browser

The finish screen (`/entrenar/[sessionId]/finalizar`), the reassign panel, the add-set panel and `/privacidad` all went out without a 390×844 pass. jsdom does not measure geometry and **this repo has been caught by that twice** — a finish control that rendered 350px wide despite its class list, and a `{/* */}` comment that passed `tsc` and was rejected by SWC. Check tap targets (44px minimum), horizontal overflow (`scrollWidth === clientWidth` at 390), and the unfinished list with a long exercise name. Use the Playwright MCP tools at 390×844; **this app only supports Google OAuth, so when you reach a sign-in screen, stop and ask the owner to complete it themselves.**

### 2. Issue #1 — pain is prompted on every set, and every logged value is 0

The highest-value item on the roadmap. The app's most differentiated feature — progression that a pain score can veto — has **never produced a signal**, because asking for a 0–10 score on every set is how you train someone to answer 0. The proposal is in the issue: no prompt by default, one post-exercise binary, escalating to the 0–10 scale and location only on a yes. Fewer data points, far more true ones.

### 3. Issues #2–#8 — the rest of the physiotherapy review

Ranked by value in `next-task.md`. After #1, the two worth doing are **#3** (tape-measure asymmetry is aimed at an anatomically unreachable target; use a performance-based limb symmetry index from the left/right sets already logged) and **#6** ("mobility for healthy aging" is a stated primary goal with zero outcome measures — either measure it or cut the claim).

### 4. Issue #9 — turn on English

Scaffolding has been carried unused since M0. The work is mostly populating `exerciseNameEn` across the ~67-entry catalog and extracting hardcoded Spanish, not the locale switch.

## Standing constraints a new feature must respect

Read the full list in `project-status.md` — each has cost real rework. The ones most likely to bite:

- **Spanish-first.** All UI copy in Spanish.
- **Pain is never just another metric.** `pain > 2` blocks aggressive progression, `> 3` reduces, `>= 7` stops and recommends guidance.
- **`targetSets` means sets per side** for unilateral exercises.
- **Unilateral effective sets are `max(left, right) + bilateral`**, never a distinct-`setNumber` count.
- **Colour is reserved for pain.** Emerald accent, violet secondary, zinc neutral; a below-target bar is grey, not red.
- **The type scale is deliberately raised** for readability at 47+.
- **Charts are hand-rolled inline SVG.** A charting library was evaluated and declined.
- **No new dependency without asking.**
- If you change `src/db/schema.ts`, update `docs/architecture/data-model.md` in the same PR.

## Two things that are true of production data

**Athlete B's pre-2026-08-30 history is corrupted** by a plan-reorder bug that rewrote prescription rows in place. She chose to keep the records and correct them by hand using the reassign/swap feature. Eighteen sets are structurally detectable; an unknown number of strength-to-strength swaps are **undetectable by any query** — she confirmed one exercise recorded at 5–7.5 kg when she pressed 40. Treat all her pre-2026-08-30 strength history as suspect. The inventory and unrun repair SQL live in `~/jcvalerio/dev/github/reserva-data-notes/`, deliberately outside this public repo because it is one athlete's real training data.

**The three athletes are anonymized as Athlete A/B/C, permanently.** No real names, relationships, gym name, city, or absolute body measurements — left/right gaps only. Two of them have a medical condition recorded. The git history was rewritten to scrub this. Do not reintroduce any of it, including in a log entry describing a bug on someone's account.

## Reading production

`npx vercel logs <deployment-url>` for runtime errors. Sentry is live with source maps at org `jcvalerio`, project `javascript-nextjs` — a client-side crash appears there with real file names and line numbers, which is how the last one was diagnosed. The production `DATABASE_URL` is marked Sensitive in Vercel and cannot be pulled; get it from the Neon console if you genuinely need it. **Never** `grep DATABASE_URL | xargs` — it also matches a commented-out stale branch and silently queries the wrong database.

## Working conventions

Update `docs/product/implementation-log.md` after every iteration — root cause, measured before/after, and what was **deliberately not** built. Present findings before implementing anything structural; small well-scoped fixes can just be done and explained afterward. State known gaps rather than letting someone discover them.
