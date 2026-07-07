# Open Questions

Resolve these before or during early implementation.

## Product

1. Should the first generated plan use Push/Pull/Legs/Upper/Lower or a body-part split?
2. Which exact baseline exercises should be mandatory vs optional?
3. Should shoulder pain tracking be required for all upper-body exercises for bursitis profiles, or only shoulder-tagged exercises?
4. Resolved: pain >2 blocks aggressive progression; pain >3 triggers reduce/modify/swap suggestion; pain >=7 should stop/avoid the pattern and recommend professional guidance if persistent.
5. Should final sets ever intentionally target RIR 0 for experienced users?
6. How should skipped sessions affect progression suggestions?
7. Should measurement reminders be every 2 weeks inside MVP?

## Technical

Resolved on 2026-07-06:
1. ORM: Drizzle ORM + Drizzle Kit. Prisma is only a fallback if Drizzle slows field-testing progress.
2. Auth: Better Auth with Google OAuth first. Clerk is only a fallback if auth blocks progress.
3. Database: Neon Postgres. Supabase is deferred unless storage/realtime/Supabase Auth becomes valuable.
4. AI provider/model chain: Vercel AI SDK with a Gemini Flash-class model behind an adapter, with Zod validation and deterministic guardrails before persistence.

Still open:
5. Should we build a tiny exercise catalog manually first or seed from a larger public source?

## UX

1. One-exercise-at-a-time flow or compact exercise list first?
2. Should set logging use steppers, keypad, or both?
3. Should pain score be a slider, segmented control, or number buttons?
4. Should the app support dark mode in MVP?
5. Should notes be per set only, per exercise, per session, or all three?
