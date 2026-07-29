# Session Logging UX

## Implemented (Slice 2)

The one-exercise-at-a-time flow described below is implemented at `/entrenar` (session picker, `src/app/entrenar/`) and `/entrenar/[sessionId]` (`src/app/entrenar/[sessionId]/session-runner.tsx`). Notes on where implementation diverges slightly from this doc:
- No rest timer yet.
- No exercise swap/modify action yet (substitution options are shown as read-only text on the exercise card).
- "Weight defaults from plan or last set": the plan has no weight target field, so weight only defaults from the exercise's last logged set in the current session, otherwise blank.
- `docs/architecture/data-model.md`'s `WorkoutSession`/`ExerciseLog`/`SetLog` field lists (e.g. `scheduledDate`, `plannedWeightKg`) are conceptual; the actual shipped schema in `src/db/schema.ts` is leaner — see `src/workouts/workout-repository.ts` for the real shape.

## UX principle

The gym screen must be faster than a spreadsheet and usable with one hand on iPhone.

## Primary screen: today's workout

Show:
- Session name.
- Estimated duration.
- Rest timer when applicable.
- Progress through exercises/sets.
- Current exercise.
- Previous performance.
- Planned target.
- Set logging controls.
- Exercise swap/modify action for pain or equipment conflicts.
- Sticky bottom action.

## Set logging form

Required fields:
- kg
- reps
- RIR
- pain score

Optional:
- notes

Defaults:
- Weight defaults from plan or last set.
- Reps defaults from target or last set.
- RIR defaults to target RIR 2.
- Pain defaults to 0, except pain-sensitive exercises may force confirmation.

## Control design

- Large numeric controls for kg/reps.
- RIR as big segmented buttons; persist as numeric 0-4, where 4 displays as `4+`.
- Pain as quick 0-10 selector.
- Notes field supports iPhone dictation.
- Main action: `Guardar set` / `Save set`.
- Secondary action: `Siguiente ejercicio` / `Next exercise`.
- Context action: `Cambiar ejercicio` / `Swap exercise`.

## Spanish labels

- Entrenar
- Iniciar sesión
- Guardar set
- Siguiente set
- Siguiente ejercicio
- Completar entrenamiento
- Peso
- Repeticiones
- Reps en reserva
- Dolor
- Notas
- Última vez
- Sugerido para hoy

## Friction constraints

- No dense tables during active workout.
- No required long text.
- No hidden save actions.
- Avoid multi-step modals while training.
- Tap targets should be large enough for tired hands.
- Critical actions should be clear and reversible when possible.

## Pain-aware UX

When pain score is high:
- Ask for optional note.
- Show warning after save.
- Suggest reducing load or changing exercise next time.
- Preserve the pain event for future exercise selection.

Pain score interpretation:
- 0: no pain
- 1-2: acceptable awareness; progression may be allowed if performance supports it
- 3: caution; block aggressive progression
- 4+: warning; hold/reduce/modify next time
- 7+: stop/avoid and seek professional guidance if persistent

## iPhone MVP validation checklist

During real gym use, confirm:
- Can log a default set in under 5 seconds.
- Can edit weight/reps quickly.
- RIR and pain controls are easy to tap.
- Notes via dictation are usable.
- Previous performance is visible without scrolling too much.
- Completing workout is obvious.
