# Generated Plan Contract

Authoritative MVP interface between AI plan generation and app persistence.

The app must treat AI output as an untrusted draft. Persist only after parsing with `src/plans/generated-plan-schema.ts` and applying deterministic guardrails.

## Runtime schema

Code source of truth:
- `generatedWorkoutPlanSchema` in `src/plans/generated-plan-schema.ts`

Top-level requirements:
- `schemaVersion`: `1`
- `locale`: `es` or `en`
- `goal`: `hypertrophy`
- `durationWeeks`: exactly `4`
- `daysPerWeek`: exactly `5`
- `sessionDurationMinutes`: exactly `60`
- `weeks`: exactly 4 weeks
- each week has exactly 5 sessions
- each session has estimated duration `<= 60`
- RIR is numeric `0 | 1 | 2 | 3 | 4`, where `4` means `4+`

Exercise prescription requirements:
- Spanish exercise name is required.
- Phase must be `warmup`, `main`, `accessory`, or `mobility`.
- Side mode must be `bilateral`, `unilateral_separate`, or `unilateral_matched`.
- Target sets: 1-6.
- Rep range: 1-30, with min <= max.
- Rest seconds: 30-240.
- Spanish notes are required.
- `painSensitive` must be true for risky/pain-relevant exercise choices.
- Up to 3 Spanish substitution options are allowed.

## Deterministic guardrails before persistence

Reject or require review when:
- plan is not 4 weeks / 5 days / 60 minutes,
- any session exceeds 60 estimated minutes,
- target RIR is outside 0-4,
- any target rep min is greater than target rep max,
- shoulder bursitis profile receives painful overhead-heavy work without substitution notes,
- lower-body asymmetry profile lacks unilateral/matched lower-body work,
- plan lacks every-set logging targets needed for kg, reps, RIR, pain, and notes.

## AI failure fallback

AI generation must not block field testing or set logging.

If AI generation fails, times out, or returns invalid JSON:
1. Show a Spanish error message.
2. Offer the seeded fallback plan from `createSeededHypertrophyPlan()` in `src/plans/seeded-plan.ts`.
3. Let the tester edit or accept the fallback.
4. Allow manual plan/session creation later if the fallback is not appropriate.

## Prompting rule

Prompt the model to return only JSON matching the schema. Do not rely on prompt wording for safety; always validate with Zod and deterministic guardrails.
