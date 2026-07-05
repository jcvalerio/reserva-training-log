# Open Questions

Resolve these before or during early implementation.

## Product

1. Should the first generated plan use Push/Pull/Legs/Upper/Lower or a body-part split?
2. Which exact baseline exercises should be mandatory vs optional?
3. Should shoulder pain tracking be required for all upper-body exercises for bursitis profiles, or only shoulder-tagged exercises?
4. What pain threshold should block progression automatically: >2, >3, or user-configurable?
5. Should final sets ever intentionally target RIR 0 for experienced users?
6. How should skipped sessions affect progression suggestions?
7. Should measurement reminders be every 2 weeks inside MVP?

## Technical

1. Drizzle or Prisma for final ORM choice?
2. Clerk or Better Auth?
3. Neon or Supabase for Postgres?
4. Which AI provider/model chain for initial MVP?
5. Should we build a tiny exercise catalog manually first or seed from a larger public source?

## UX

1. One-exercise-at-a-time flow or compact exercise list first?
2. Should set logging use steppers, keypad, or both?
3. Should pain score be a slider, segmented control, or number buttons?
4. Should the app support dark mode in MVP?
5. Should notes be per set only, per exercise, per session, or all three?
