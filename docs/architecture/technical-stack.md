# Technical Stack

Locked 2026 Web MVP stack for the personal-use-first implementation.

## App

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS
- shadcn/ui or Radix primitives for accessible mobile components
- next-intl for Spanish/English

## Data

- Neon Postgres
- Drizzle ORM + Drizzle Kit for schema and migrations
- Zod for runtime validation and AI structured output validation

Why Drizzle over Prisma for this MVP:
- More explicit SQL-shaped TypeScript for small vertical changes.
- Lightweight schema layer with less generated-client ceremony.
- Easier for coding agents to inspect and modify safely.
- Fits a small personal/tester app where transparent queries matter more than a fully guided ORM workflow.

Fallback:
- Prisma remains acceptable only if Drizzle materially slows implementation.

## Auth

- Better Auth
- Start with Google OAuth only for the tester group.

Why Better Auth over Clerk for this MVP:
- Avoids a hosted auth vendor dependency and potential SaaS cost.
- Keeps auth-related data in owned Postgres.
- Good fit for personal use with a small number of testers.
- Easier to inspect in local development and for coding-agent changes.

Fallback:
- Clerk is the fallback if auth setup becomes the blocker to field testing.

MVP requirement:
- Separate login per tester.
- Strict ownership on all profile/plan/session data.

## AI

- Vercel AI SDK
- Google Gemini or other selected provider behind an adapter
- Structured JSON outputs validated by Zod
- Rule-based guardrails before persistence

Important:
- AI can generate plan drafts.
- Deterministic code should validate session duration, volume, limitations, pain-sensitive substitutions, and schema correctness.
- Rule-based progression should come before AI explanations.

## Testing

- Vitest for unit/service tests
- React Testing Library for components
- Playwright for critical mobile flows

Critical E2E flows:
- Sign in
- Create profile
- Enter baseline
- Generate plan
- Start workout
- Log set
- Complete session
- See previous performance/progression suggestion

## Deployment

- Vercel for app hosting
- Neon Postgres for the database
- Better Auth running inside the Next.js app
- Branching: `main` deploys to production; short-lived `feature/*` and `fix/*` branches use local/preview checks.
- Environments: keep production and development databases separate, but avoid a long-lived `develop` branch for the MVP.

Why Neon over Supabase for this MVP:
- The app currently needs Postgres, not storage/realtime/Supabase Auth.
- Simple Vercel + Postgres deployment path.
- Keeps the backend surface area narrow until field use proves more needs.

See [Release Workflow](release-workflow.md) for branch, environment, OAuth, and migration rules.

## Deferred technical capabilities

- Offline-first local persistence/sync
- Native Apple app
- watchOS companion
- HealthKit integration
- Push notifications
- Automatic rep detection
