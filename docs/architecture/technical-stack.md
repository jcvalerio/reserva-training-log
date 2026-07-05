# Technical Stack

Recommended 2026 Web MVP stack.

## App

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS
- shadcn/ui or Radix primitives for accessible mobile components
- next-intl for Spanish/English

## Data

- PostgreSQL
- Drizzle ORM recommended for a lean fresh MVP
- Prisma is acceptable if familiarity/speed matters more than schema-lightness
- Zod for runtime validation and AI structured output validation

## Auth

Recommended for speed:
- Clerk

Alternative:
- Better Auth if avoiding hosted auth dependency is more important.

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
- Neon or Supabase Postgres
- Managed auth provider

## Deferred technical capabilities

- Offline-first local persistence/sync
- Native Apple app
- watchOS companion
- HealthKit integration
- Push notifications
- Automatic rep detection
