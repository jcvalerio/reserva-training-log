# AGENTS.md

## Project identity

Web MVP for an iPhone-first gym training log: build a plan by hand, log every set with weight, reps, RIR and pain, and read progress back per muscle group.

**Not an "AI personal trainer" despite the repo name** — AI plan generation was evaluated and dropped (milestone M3, 2026-07-31), and there is no AI anywhere in the product. Start at `docs/product/project-status.md` for where things stand and what constrains a new feature.

## Product rules

1. Keep MVP scope narrow: profile, baseline, plan generation, session execution, progression, measurements.
2. Spanish is the default UX language; English must remain supported.
3. Optimize active workout screens for iPhone first.
4. Do not add Apple Watch/native/offline features until explicitly prioritized.
5. Do not treat users as beginners; testers are intermediate recreational lifters.
6. Pain-aware progression is mandatory. Aggressive progression must not ignore pain.
7. Every set log must preserve kg, reps, RIR, pain score, and optional notes.

## Engineering rules

1. Use TypeScript strict mode.
2. Add tests for behavior changes.
3. Keep changes vertical and small.
4. Prefer deterministic validation/guardrails around AI output.
5. Never commit secrets or `.env*` files.
6. Use conventional commits.
