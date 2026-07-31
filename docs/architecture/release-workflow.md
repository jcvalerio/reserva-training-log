# Release Workflow

MVP workflow optimized for low complexity and safe personal testing.

## How deploys actually happen today (read this first)

**As of 2026-07-31, this local checkout has no git remote configured** (`git remote -v` is empty) — everything below this section describes the intended/aspirational branching model (feature branches, PRs, Vercel's git integration), which is **not** how deploys currently happen. There's also a `.github/workflows/ci.yml` that would run lint/typecheck/test/build on push/PR, but it can't trigger without a connected GitHub remote.

What actually ships a change to production right now:

1. Get a clean `main` locally: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all green (`nvm use v24.18.0` first — the ambient shell may default to a Node version that breaks Vitest's config loader).
2. Commit if the user has asked for a commit (commits are local-only history here, not required for the deploy itself since there's no git remote to push to).
3. Deploy straight from the local working directory:
   ```bash
   nvm use v24.18.0
   npx vercel deploy --prod --yes
   ```
   Use `npx vercel`, not a bare `vercel` — the Vercel CLI binary on this machine is installed under a different nvm Node version (v22.11.0), so after `nvm use v24.18.0` a bare `vercel` invocation fails with "command not found." `npx` resolves it correctly regardless of the active Node version.
4. The project is already linked (`.vercel/project.json` has the real `projectId`/`orgId`), so this deploys and aliases straight to production at `https://gym.jcvalerio.com` — no interactive linking prompt.
5. `vercel.json`'s `buildCommand` runs `npm run db:migrate && npm run build`, so any pending Drizzle migration applies automatically as part of this same command — there is no separate migration step to run by hand.
6. Avoid running this while a workout session might be actively in progress, per the standing constraint in `docs/product/next-task.md` — lower risk on a deploy with no schema change, but still the rule.

This section describes what's actually happened in practice (verified 2026-07-31 deploying the mobile UI/UX audit). If a git remote gets connected later, prefer switching to the branching model below instead of this direct-CLI path, and update this note accordingly rather than leaving it stale.

## Branching model

Do not add a long-lived `develop` branch yet.

- `main` is always releasable and deploys to production on Vercel.
- Feature work happens on short-lived branches named `feature/*`.
- Fixes happen on short-lived branches named `fix/*`.
- Merge to `main` only after local checks pass and the change is ready for real use.

Rationale:
- One-person/personal MVP does not need the extra merge and environment overhead of `develop`.
- Small feature branches keep work reviewable and reversible.
- Production release remains simple: merge to `main`.

Revisit a `develop` branch only if:
- more contributors join,
- migrations become risky,
- production data requires a formal staging sign-off,
- release cadence becomes slower or more coordinated.

## Environment model

Keep branch strategy simple, but keep data environments separate.

| Purpose | Branch/deployment | Vercel environment | Database |
|---|---|---|---|
| Real app | `main` | Production | Neon production database/branch |
| Local development | local checkout of `feature/*` or `fix/*` | Local `.env.local` | Neon development database/branch |
| Preview checks | Vercel preview from feature/fix branch | Preview | Neon development database/branch |

## Environment variable rules

Production Vercel env vars must point to production resources:

```env
DATABASE_URL=neon-production-url
BETTER_AUTH_URL=https://production-domain
BETTER_AUTH_SECRET=production-secret
GOOGLE_CLIENT_ID=production-or-shared-client-id
GOOGLE_CLIENT_SECRET=production-or-shared-client-secret
GOOGLE_GENERATIVE_AI_API_KEY=production-or-shared-key
```

Local env vars must point to development resources:

```env
DATABASE_URL=neon-development-url
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=local-secret
GOOGLE_CLIENT_ID=development-or-shared-client-id
GOOGLE_CLIENT_SECRET=development-or-shared-client-secret
GOOGLE_GENERATIVE_AI_API_KEY=development-or-shared-key
```

Vercel preview env vars should also use development resources. If interactive OAuth is enabled for a stable preview URL, `BETTER_AUTH_URL` must match that preview URL:

```env
DATABASE_URL=neon-development-url
BETTER_AUTH_URL=https://stable-preview-domain
BETTER_AUTH_SECRET=preview-secret
GOOGLE_CLIENT_ID=development-or-shared-client-id
GOOGLE_CLIENT_SECRET=development-or-shared-client-secret
GOOGLE_GENERATIVE_AI_API_KEY=development-or-shared-key
```

Never commit `.env*` files. Keep `.env.example` as the documented template only.

## OAuth redirect URLs

Google OAuth must include redirect URLs for the environments where interactive sign-in is expected:

```txt
http://localhost:3000/api/auth/callback/google
https://production-domain/api/auth/callback/google
```

For Vercel previews, prefer one stable preview/testing URL if possible. Dynamic per-branch preview URLs are optional for this MVP and can be skipped unless full OAuth testing is needed before merge.

## Migration rule

- Generate migrations in feature/fix branches with `npm run db:generate`.
- Apply migrations to the development database first with `npm run db:migrate`.
- Merge to `main` only after checks pass and the development database migration is validated.
- Apply the same migration to production during/after the `main` deployment.

## Required checks before merging to `main`

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run Playwright for critical mobile flows once those flows exist and browsers are installed:

```bash
npm run test:e2e
```
