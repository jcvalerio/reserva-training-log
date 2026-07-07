# Progression Rules

## Effort model

Use RIR in the UI. Store RIR numerically as `0 | 1 | 2 | 3 | 4`; `4` represents `4+` for calculations and UI labels.

| Value | Spanish label | Meaning |
|---:|---|---|
| 4+ | Fácil | Could perform 4 or more additional good reps |
| 3 | 3 reps en reserva | Challenging but comfortable |
| 2 | 2 reps en reserva | Ideal hypertrophy zone |
| 1 | 1 rep en reserva | Very hard |
| 0 | Fallo | No more good reps possible |

Primary working-set target for hypertrophy:
- Most sets: RIR 1-3.
- Default target: RIR 2.
- Failure: occasional only, never when pain or technique risk is high.

## Pain thresholds

Authoritative MVP thresholds:
- `pain <= 2`: progression is allowed if performance and notes also support it.
- `pain > 2`: aggressive progression is blocked automatically; hold, repeat, or reduce depending on context.
- `pain > 3`: next-session suggestion should reduce load, modify range, or swap exercise.
- `pain >= 7`: stop/avoid the pattern and recommend professional guidance if persistent.

## Basic progression algorithm v1

For each exercise repeated in a future session:

### Increase load

Suggest increasing load when:
- All planned sets were completed.
- Actual reps reached the top of the target rep range or exceeded target reps.
- Average RIR is >= 2.
- Pain score is <= 2.
- Notes do not include a negative flag.

Suggested increase:
- Machines / lower body: +5% to +10%.
- Upper body compound: +2.5% to +5%.
- Isolation exercises: smallest available jump or add reps first.
- Dumbbells: follow available dumbbell increments.

### Keep same load

Suggest repeating the same load when:
- Reps were within target range but not at the top.
- Average RIR is 0-1 but pain is acceptable.
- Technique notes suggest the weight was challenging.

Goal next time:
- Add reps.
- Improve control.
- Reduce RIR slightly only if safe.

### Reduce load or modify

Suggest reducing or changing the exercise when:
- Pain score > 3.
- Reps dropped sharply across sets.
- RIR hit 0 too early.
- User notes indicate joint discomfort or poor control.

Possible actions:
- Reduce load 5-10%.
- Reduce range of motion temporarily.
- Swap to a safer machine/cable variation.
- Add warm-up/mobility.
- Avoid repeated painful pattern.

## Aggressive but pain-aware rule

Aggressive progression is allowed only when recovery and pain allow it.

The app should never suggest an aggressive increase when:
- pain score > 2,
- shoulder bursitis is aggravated,
- unilateral asymmetry is worsening,
- technique notes indicate poor control,
- previous session was incomplete.

## Unilateral/asymmetry rules

For weaker-side priority, especially right leg:

1. Start unilateral exercises with the weaker/right side.
2. Stronger side should match the weaker side's reps/sets/load unless coach/user overrides.
3. Add extra weaker-side accessory volume only when pain and fatigue are low.
4. Do not let the stronger side progress faster while asymmetry is a priority.
5. Track left/right set logs separately.

For Athlete A initial measurement gaps:
- Thigh: left +2 cm.
- Calf: left +3 cm.

Progress goal:
- Reduce gap over time while both sides remain pain-free and functional.

## 5% improvement definition

Default comparison window:
- Compare the latest completed session for an exercise/side against the previous completed session of the same exercise/side.
- For measurements, compare the latest measurement against the previous measurement, normally on a 2-week cadence.

The app can count improvement when one or more signals improve by at least 5%:

- Total volume load: `(sum of actual reps × kg)` increases by >= 5% while max pain does not increase above 2.
- Reps at the same load and similar RIR: reps increase by >= 5% when load is unchanged and average RIR changes by no more than 1.
- Load at same reps and similar RIR: load increases by >= 5% when reps are unchanged or higher and average RIR changes by no more than 1.
- Estimated performance score: estimated 1RM or comparable score increases by >= 5% for compatible rep ranges.
- Pain improvement: pain decreases by >= 2 points at the same or higher workload.
- Asymmetry improvement: left/right measurement or performance gap shrinks by >= 5% without increasing pain.

Do not require every exercise to improve every week.
