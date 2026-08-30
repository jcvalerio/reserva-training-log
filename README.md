# Reserva

**A Spanish-first iPhone training log where pain can veto progression.**

Live at **[gym.jcvalerio.com](https://gym.jcvalerio.com)** · three real users, in the gym, since July 2026.

Build a hypertrophy plan by hand, log every set with weight, reps and RIR (*reps en reserva*), and get a
next-session load suggestion computed from your own logged history — one that a pain score is allowed to
override. Commercial trackers ([Hevy](https://www.hevyapp.com/), [Strong](https://www.strong.app/)) don't
autoregulate at all; the ones that do (Alpha Progression, RP Hypertrophy) progress on effort alone. This one
has a brake, and the brake is the point.

---

## Why this repo is worth a look

**There is no AI in this product, and that is the interesting part.**

This app was designed, built, reviewed and operated almost entirely through AI coding agents. One of the
things that process produced was the decision to **delete the AI feature the project was originally named
after**. Milestone M3 — "AI plan generation" — was specced, evaluated, and
[dropped](docs/product/milestones.md); the provider stub and its dependencies were removed; and
[`AGENTS.md`](AGENTS.md) now opens by instructing future agents not to reintroduce the framing. Manual plan
creation turned out to serve three real intermediate lifters better than generated plans would have.

So the AI is in the **engineering process**, not the feature list. If that's what you came to see, these three
files are the substance — not the app code:

| File | What it demonstrates |
|---|---|
| [`docs/product/implementation-log.md`](docs/product/implementation-log.md) | Append-only decision log. Every entry states the root cause, the measured before/after, and what was *deliberately not* built. |
| [`AGENTS.md`](AGENTS.md) + [`docs/product/project-status.md`](docs/product/project-status.md) | The harness: standing constraints, each annotated with the rework that earned it. |
| [`docs/product/*-kickoff-prompt.md`](docs/product/) | Reproducible, role-scoped agent briefs — mobile UX critique, competitor benchmark, user-feedback triage. |

### Three entries worth reading

- **[An irreversible button that moved under your thumb](docs/product/implementation-log.md)** (2026-08-18) —
  "Completar entrenamiento" was being hit by accident. Restyling could not have fixed it, because the cluster
  was not stationary: three separate unmounts slid it under a habituated thumb, two with no user action at
  all, and WebKit implements no scroll anchoring. Fixed with a reveal-then-confirm panel, a reopen path for
  sessions already ended by mistake — which turned out to be a **data-correctness** bug, one workout counting
  twice in every report — and a target shrunk from 350px wide to 207×44 (46% less area, centre-to-centre
  separation 124px → 267px).
- **A CSS bug invisible to `grep`** (2026-07-31) — "some buttons are unreadable" was not a design
  inconsistency. `globals.css` declared `a { color: inherit }` *outside* any Tailwind `@layer`, and per the
  cascade-layer spec unlayered rules beat layered ones regardless of specificity. Every primary button built
  as a `<Link>` silently lost its dark text; every `<button>` one was fine. Only `getComputedStyle` on the
  live rendered page could find it. It is now a standing rule in the audit prompts.
- **Why the reporting layer counts sets the way it does** ([project-status.md](docs/product/project-status.md))
  — unilateral effective sets are `max(left, right) + bilateral`, never a distinct-`setNumber` count, because
  set numbering runs across the whole exercise regardless of side. Four such rules exist; each was arrived at
  by getting it wrong against real data first.

---

## What it does

1. **Profile** — goals, limitations, muscle priorities, target training days.
2. **Plan** — activate a template or build one day by day. Plans can be shared to another account by invite.
3. **Train** — run a session, log every set (weight / reps / RIR / pain / where it hurt), take a pain-aware
   progression suggestion prefilled from last time, log bonus sets, correct or delete a set, or substitute an
   exercise mid-session when a machine is busy.
4. **Progress** — weekly effective sets per muscle group against reference ranges, a front/back body map,
   balance ratios, pain grouped by location, per-exercise progression charts, consistency, measurement trends.
5. **Guide** — what RIR means, what AMRAP is, and the progression math, in plain Spanish.

### The training model

Effort is logged as **RIR**, not RPE — reps you could still have completed with good form. Progression is
computed per exercise from the previous session and then **gated on pain**: above 2 blocks aggressive
progression outright, above 3 forces a reduction or modification, 7 or above stops the pattern and recommends
professional guidance. Suggested increments vary by equipment class, because +5% on a selectorized stack is
often a plate that does not exist. Full rules: [`progression-rules.md`](docs/product/progression-rules.md).

## Stack

Next.js 16 · React 19 · TypeScript (strict) · Tailwind 4 · Drizzle + Neon Postgres · better-auth · next-intl ·
Vitest + Playwright · Vercel. Charts are hand-rolled inline SVG — a charting library
[was evaluated and declined](docs/product/project-status.md); Recharts pulls Redux Toolkit and d3 transitively
into a mobile app.

## Scope, stated honestly

Spanish-first by default (English scaffolding exists and is unused). iPhone-only responsive web — no Apple
Watch, no native app, no offline sync, no social features, no nutrition tracking, and no automatic rep
detection. Three users is the entire user base, on purpose: the product decisions in the log are worth
something *because* they came from real friction rather than imagined personas.

---

## Running it locally

```bash
nvm use            # v24.18.0 — other versions break Vitest's config loader
npm install
cp .env.example .env.local
npm run dev
```

Checks — all four must pass before anything ships:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Database migrations read `DATABASE_URL` from `.env.local` and apply automatically during the Vercel build, so
schema and code ship together:

```bash
npm run db:generate
npm run db:migrate
```

### Testing on a real iPhone over the local network

Allow the Mac's LAN host in `.env.local`, then bind the dev server to the network interface:

```env
NEXT_ALLOWED_DEV_ORIGINS="192.168.68.69"
```

```bash
npm run dev -- --hostname 0.0.0.0
```

Google OAuth is the only sign-in method, so `BETTER_AUTH_URL` and the Google redirect URL must match the host
you open. Google will not accept a private LAN IP as a redirect, so interactive phone login needs a stable
HTTPS preview or the production URL.

## Docs

Three docs, three jobs: [`project-status.md`](docs/product/project-status.md) is durable state and standing
constraints, [`next-task.md`](docs/product/next-task.md) is the rolling next thing, and
[`implementation-log.md`](docs/product/implementation-log.md) is the append-only record of how and why.

Also: [MVP plan](docs/product/mvp-plan.md) · [Milestones](docs/product/milestones.md) ·
[Data model](docs/architecture/data-model.md) · [Progression rules](docs/product/progression-rules.md) ·
[Session logging UX](docs/product/session-logging-ux.md) · [Technical stack](docs/architecture/technical-stack.md) ·
[Release workflow](docs/architecture/release-workflow.md) · [Open questions](docs/product/open-questions.md)

## A note on privacy

The three testers appear throughout these docs as *Athlete A/B/C*. Ages are given as bands, body measurements
only as left/right gaps, and the gym is unnamed. The clinical reasoning is fully preserved — the identities
are not mine to publish.

## Licence

MIT — see [LICENSE](LICENSE).
