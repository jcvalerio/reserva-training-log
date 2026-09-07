# Progression Rules

## Implemented (Slice 3, extended in Slice 6)

`suggestProgression()` in `src/training/progression.ts` implements the "Basic progression algorithm v1" below and is now surfaced in the UI at `/entrenar/[sessionId]` (`session-runner.tsx`, via `src/workouts/progression-view.ts`), showing previous performance + a suggestion before the first set of a repeated exercise.

`exercisePrescription.incrementCategory` (nullable enum: `machine_or_lower_body | upper_compound | isolation | dumbbell`) now drives the suggested-increase percentage per the table below, using the conservative low end of each range:
- `machine_or_lower_body`: +5% (low end of +5-10%).
- `upper_compound`: +2.5% (low end of +2.5-5%). Unused by the current seeded plan (no barbell work in it) but supported for future plans.
- `isolation`: weight unchanged — the UI instead suggests "Añade una repetición" (add a rep first), per "smallest available jump or add reps first."
- `dumbbell`: a fixed +2kg step rather than a percentage (the app doesn't model a specific gym's available dumbbell increments, so this is an approximation, not "follow available dumbbell increments" literally).
- Reduce (`reduce_or_modify`) stays a flat -5% for every category — the docs don't vary the reduce range by category.
- `null`/missing category (plans activated before this field existed) falls back to the original flat ±5%.

The 20 seeded-plan exercises were hand-classified in `src/plans/seeded-plan.ts` by equipment type (see the comment above `baseSessions` there for the exact rationale per exercise) — this is a judgment call given the source doc's category names aren't a perfectly clean partition (e.g. "machines" spans both upper and lower body movements); treat it as a defensible starting point, not an authoritative taxonomy.

## What to put on the bar

Added 2026-09-06. `suggestNextWeightKg` returns a number; a number is not an instruction when the athlete has to build it from discs.

**The convention, measured rather than chosen.** All three athletes log plate-loaded lifts as the **total mass of the discs across both sides, excluding the bar**, and dumbbells as **one** dumbbell. A hip thrust with 6 × 45 lb is logged 122; it is 122.47, and the 0.47 is hand-conversion drift compounding into every volume-load and estimated-1RM number. See invariant 13 in `data-model.md` — nothing reinterprets a logged weight.

**Two questions, and they are not the same one.** `buildFromScratch` answers *"which discs make this number"* — the reverse-engineering being done by hand today. `chooseLoadStep` answers *"what do I add to what is already on"* — which is what progressing actually looks like.

**Minimum change, not minimum plates.** Snapping a suggestion to the nearest buildable total and rendering its fewest-disc recipe is arithmetically correct and physically absurd: on the real inventory, moving a 122.47 kg hip thrust to the nearest rung above +5% prescribes `1×45lb + 1×35lb + 1×25lb + 1×15kg` per side — stripping the bar and rebuilding it from four denominations across two unit families, to add three kilos. The same error appears one level down in `buildFromScratch`: asked for 122 kg, closest-total returns 122.06 as six discs of four denominations, where the honest answer is `3 × 45 lb` at 122.47. Practicality is the objective; arithmetic proximity is only the constraint.

**The band is now a range, not a point.** The tables above have always specified 5–10% (machine, lower body) and 2.5–5% (upper compound); the code collapsed each to its conservative low end and rounded. That was reasonable while any weight was reachable — with a discrete set of discs it throws away every rung but one. The low end remains the **target**, so the conservative bias is unchanged and `suggestNextWeightKg` returns exactly what it always did; `high` only bounds what else may win. Selection is closest-to-target, then fewest discs, then fewest distinct denominations.

That order is load-bearing. On the real hip-thrust numbers, sorting by disc count first picks `1×10lb` (+7.4%) over `1×5lb + 1×2.5lb` (+5.6%). Both are one line of instruction and neither is harder to load, so paying nearly two extra percent of load for one fewer disc is the wrong trade — on a hinge, for a 47-year-old, twice over. Pinned by a test.

**When no disc pair fits the band, that is an answer.** Verified live: an exercise at 20 kg earned an increase and the app suggested **21 kg**, which cannot be built — the smallest pair this gym stocks is 2.5 lb (1.13 kg), so the next rung is 22.27 kg, +11.3% and outside the band. The runner now says there is no appropriate load jump and to add a rep instead, rather than naming a weight that does not exist. This is the shape issue #5 should be re-scoped to: *suggest a load change the athlete can actually perform, or suggest reps instead* — which subsumes impossible, impractical and too-large.

**Silent when it does not know.** The assistant renders only for an exercise explicitly marked `plate_loaded` and a gym with discs recorded. `loadMechanism = "machine"` covers both a pin stack and a plate-loaded machine, and inferring would show a disc recipe for a selector pin.

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

Authoritative MVP thresholds. **Since 2026-08-31 these apply to `painLocation` other than `muscular`** — see "Soreness is not injury" below.

- `pain <= 2`: progression is allowed if performance and notes also support it.
- `pain > 2`: aggressive progression is blocked automatically; hold, repeat, or reduce depending on context.
- `pain > 3`: next-session suggestion should reduce load, modify range, or swap exercise.
- `pain >= 7`: stop/avoid the pattern and recommend professional guidance if persistent. **Applies at any location, muscular included** — someone calling an 8 "agujetas" does not make it one. This is the one rule location cannot soften, and it is now enforced in `suggestProgression` rather than only shown as a banner in the runner.

### How pain is collected

Pain is asked **once per exercise**, as a binary, and only a "sí" escalates to the 0–10 scale and a location. It is not asked per set.

That changed on 2026-08-31 because the previous design — a required 0–10 field, pre-filled with 0, on every single set — produced **58 of 58 real sets at exactly 0** across three athletes and a month of training, and not one recorded pain location. A scale that is always asked stops being answered, and a field that arrives pre-filled with the answer is not a question. Fewer data points, far more true ones.

`setLog.painScore` is therefore nullable, and `null` means *not asked* — never `0`. See note 10 in `docs/architecture/data-model.md`.

### Soreness is not injury

`painLocation = "muscular"` (agujetas / DOMS) no longer blocks progression the way joint pain does. DOMS is the expected response to effective hypertrophy work; forcing a load reduction on it teaches an athlete to stop reporting it, which is the exact failure the collection change above is undoing.

Concretely, in `suggestProgression`:
- Any report at `neural` → `reduce_or_modify`, **at any score** (see below).
- `>= 7` at **any** location → `reduce_or_modify`.
- `> 3` at a **non-muscular** location → `reduce_or_modify`.
- `> 2` at a **non-muscular** location → `hold`.
- Muscular soreness from 1–6 vetoes nothing; performance signals decide.

A reported pain with **no location** is treated as joint pain, not as soreness — an unanswered "where" takes the conservative side.

### Nerve symptoms are read off the quality, never the number

Added 2026-09-06 (issue #2). `neural` — radiating pain, tingling, numbness — is the tenth `painLocation` value and the only one whose rule ignores the 0–10 scale entirely.

Intensity is the wrong axis for it. A 2/10 tingling down an arm matters more than 6/10 of agujetas, so ranking the two by their scores inverts them, and the number an athlete puts on a symptom they cannot name is the least reliable part of the report. The rule is therefore **presence**: a set carrying `painLocation = "neural"` escalates. That is safe to key on because all three write paths (`saveSet`, `recordExercisePain`, `updateSetForSession`) drop the location when the score is 0 or null, so a location only ever exists alongside a real report.

It runs **ahead of** the `>= 7` branch. Both return `reduce_or_modify` — there is no more severe action — so the only difference is the message, and for a radiating symptom the *what* is more useful than the *how much*.

The asymmetry is deliberate, the same shape as the weekly load guardrail: a false positive costs one held session plus a sentence suggesting a professional look at it; a false negative means loading a compressed nerve.

The joint-load inference used for pre-2026-08-09 sets can only produce joints, so it can never invent a `neural` row. Every one is an athlete's own report.

On `/progreso` the same asymmetry applies to presentation: a `neural` row sorts above every other row regardless of score, and opens the pain section and colours it as an alert on its own. It deliberately does **not** reuse the "N series sobre 2" clause, which would be false for a report at 1.

### A note on how long this rule was inert

`painLocation` became a progression input on 2026-08-31, but `buildProgressionSuggestion` — the only production path into `suggestProgression` — did not forward the field until 2026-09-06. Every reported pain therefore arrived with an undefined location and was read as joint pain: agujetas kept blocking progression exactly as before, and the whole "soreness is not injury" rule above was documented, tested and dead.

`suggestProgression`'s own unit tests passed throughout, because they call it directly. The pin for this now lives in `progression-view.test.ts`, one layer up, on purpose — a rule about an input is only proven by a test that goes through whatever assembles that input.

## Between-session load management

Added 2026-09-02 (issue #7). Progression is computed per exercise, session to session, so five exercises hitting one muscle group could each independently earn "+5%, go" in the same week with no code path noticing the aggregate. The risk being managed is not a single heavy session; it is rapid week-over-week escalation.

`buildWeeklyLoadGuardrail` (`src/workouts/weekly-load.ts`) compares the **in-progress week** against the **trailing average of completed weeks**, per muscle group. When the ratio exceeds **1.3**, `suggestProgression` downgrades an earned `increase` to a `hold` with `riskFlag: "load"`.

**The threshold is a heuristic and is not presented as validated.** The IOC consensus repeats a 10–20%-per-week rule of thumb while noting the evidence for specific thresholds is limited; the acute:chronic workload ratio literature treats spikes past ~1.5 as likely risky and has itself been criticised — no intervention trial has shown that applying ACWR reduces injuries. 1.3 sits between the two, and the cost of being wrong is deliberately asymmetric: **this guardrail can only withhold an increase.** It never adds load, never forces a reduction, and never overrides the pain gate, which keeps its own more specific message.

Three rules keep it from firing when it would be wrong:

- **Three completed weeks minimum.** The first weeks of training are all "escalation" against a near-empty history; vetoing there fights the athlete instead of protecting them.
- **A group with no trailing history is never flagged.** Otherwise adding an exercise would veto its own progression until a full week passed — punishing adding an exercise rather than escalating one.
- **The unclassified bucket is never flagged.** It is not a muscle, and a ratio over it would veto exercises whose only problem is a name the catalog does not recognise.

Measured on the week **so far**, not on a forecast of the week ahead: which sessions an athlete completes is a choice they have not made yet, so a prediction would be a guess dressed as a safeguard. A consequence is that nothing can flag early in a week — correct, since an aggregate only becomes visible as it accumulates.

A rest week legitimately lowers the trailing average, so returning to normal volume can flag. That is intended rather than a false positive: the literature is explicit that a large jump *from a low base* is the riskier case.

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
