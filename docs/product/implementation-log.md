# Implementation Log

Living checkpoint for small iterations. Update this after every task iteration so the project can be paused and resumed with context.

## 2026-07-06 — Stack decision locked

Status: completed.

Decisions:
- Hosting: Vercel.
- App: Next.js App Router, React, TypeScript strict, Tailwind.
- Database: Neon Postgres.
- ORM/migrations: Drizzle ORM + Drizzle Kit.
- Auth: Better Auth, starting with Google OAuth only for the tester group.
- AI: Vercel AI SDK with a Gemini Flash-class model behind an adapter.
- Validation/guardrails: Zod plus deterministic server-side validation before persistence.

Rationale:
- Prioritizes free/low-cost personal use over fastest SaaS setup.
- Keeps data and auth tables in owned Postgres.
- Avoids Supabase platform features until storage/realtime/Auth are actually needed.
- Favors explicit TypeScript/SQL-shaped code that coding agents can modify safely.

Next iteration:
- Bootstrap the Next.js app in the repository.
- Add initial dependencies and scripts.
- Verify local build/lint/test where possible.
