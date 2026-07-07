# Release Workflow

MVP workflow optimized for low complexity and safe personal testing.

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
