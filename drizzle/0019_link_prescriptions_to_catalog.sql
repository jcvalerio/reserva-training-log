-- Links existing prescriptions to the catalog seeded in 0018, and replaces the
-- five generic "Core" rows with one specific abdominal exercise per training
-- day.
--
-- IMPORTANT: this backfill is an OPTIMIZATION, not a correctness requirement.
-- Reads resolve classification as: exercise_id -> findCatalogEntryByName ->
-- "sin clasificar" (see src/training/muscle-taxonomy.ts). The TS name matcher
-- is accent/case/block-prefix/alias tolerant, so accounts whose plans were
-- never inspected from a dev machine still classify correctly even if the
-- lower()-equality below matches none of their rows. Nothing here can fail a
-- deploy: every statement is additive or guarded.

-- Pass 1: exact name match. Catalog name_es values are the verbatim template
-- names, so plain lower() equality is enough and no unaccent extension is
-- needed (Neon does not guarantee one, and a hand-rolled translate() would
-- duplicate normalizeExerciseName in a second language).
UPDATE "exercise_prescription" ep
SET "exercise_id" = e."id"
FROM "exercise" e
WHERE e."is_active"
  AND ep."exercise_id" IS NULL
  AND lower(trim(ep."exercise_name_es")) = lower(trim(e."name_es"));--> statement-breakpoint

-- Pass 2: fat-loss-plan.ts prefixes every name with its circuit block
-- ("Bloque 1 · Flexiones") because the app has no grouping field to put it in.
UPDATE "exercise_prescription" ep
SET "exercise_id" = e."id"
FROM "exercise" e
WHERE e."is_active"
  AND ep."exercise_id" IS NULL
  AND lower(trim(ep."exercise_name_es")) LIKE '% · ' || lower(trim(e."name_es"));--> statement-breakpoint

-- The five "Core" rows.
--
-- "Core" appears on all five days of the real plan as one generic label, so it
-- is five different exercises sharing a name: one progression line mixing five
-- movements, and no way to see that only trunk flexion is ever trained. The
-- user (who is the athlete) confirmed the work is abdominal on every day, and
-- these five were chosen against each day's load — trunk flexion where the
-- lumbar spine is otherwise unloaded, antirotation on the hip-hinge day where
-- Romanian deadlift and hip thrust already loaded it into extension, and
-- antilateral flexion on the frontal-plane unilateral day.
--
-- Keyed on day_index + name rather than on prescription ids: ids differ
-- between the dev and production branches, and matching this way correctly
-- reaches cloned copies of the same plan in the other two accounts.

-- Día 1 · Cuádriceps y pantorrillas — flexión cargada, el día no carga lumbar.
UPDATE "exercise_prescription" ep
SET "exercise_name_es" = 'Crunch en máquina', "exercise_id" = 'crunch-en-maquina'
FROM "plan_session_template" st
WHERE st."id" = ep."plan_session_template_id"
  AND st."day_index" = 1
  AND lower(trim(ep."exercise_name_es")) = 'core';--> statement-breakpoint

-- Día 2 · Tren superior A — matches what was actually logged (2 series, 40kg x 10).
UPDATE "exercise_prescription" ep
SET "exercise_name_es" = 'Crunch en máquina', "exercise_id" = 'crunch-en-maquina'
FROM "plan_session_template" st
WHERE st."id" = ep."plan_session_template_id"
  AND st."day_index" = 2
  AND lower(trim(ep."exercise_name_es")) = 'core';--> statement-breakpoint

-- Día 3 · Femorales, glúteos — antirrotación instead of more loaded flexion.
-- Relabels 2 already-logged sets; accepted by the user as the cost of a plan
-- that is correct going forward.
UPDATE "exercise_prescription" ep
SET "exercise_name_es" = 'Pallof press en polea', "exercise_id" = 'pallof-press-en-polea'
FROM "plan_session_template" st
WHERE st."id" = ep."plan_session_template_id"
  AND st."day_index" = 3
  AND lower(trim(ep."exercise_name_es")) = 'core';--> statement-breakpoint

-- Día 4 · Tren superior B — hip flexors are fresh on an upper-body day.
UPDATE "exercise_prescription" ep
SET "exercise_name_es" = 'Elevación de rodillas en paralelas', "exercise_id" = 'elevacion-de-rodillas-en-paralelas'
FROM "plan_session_template" st
WHERE st."id" = ep."plan_session_template_id"
  AND st."day_index" = 4
  AND lower(trim(ep."exercise_name_es")) = 'core';--> statement-breakpoint

-- Día 5 · Pierna completa — antiflexión lateral, same frontal plane as the
-- abduction and unilateral work. Isometric, so it becomes duration-type.
--
-- Guarded by "has no logged sets": flipping prescription_type on a row with
-- strength history would make those sets vanish from /progreso, which filters
-- on prescription_type = 'strength'. On the dev branch día 5 has no logs; the
-- guard means that at worst this no-ops on another account rather than
-- corrupting its history.
UPDATE "exercise_prescription" ep
SET "exercise_name_es" = 'Plancha lateral',
    "exercise_id" = 'plancha-lateral',
    "prescription_type" = 'duration',
    "duration_seconds" = 30,
    "target_rep_min" = NULL,
    "target_rep_max" = NULL,
    "target_rir" = NULL
FROM "plan_session_template" st
WHERE st."id" = ep."plan_session_template_id"
  AND st."day_index" = 5
  AND lower(trim(ep."exercise_name_es")) = 'core'
  AND NOT EXISTS (
    SELECT 1 FROM "exercise_log" el
    JOIN "set_log" sl ON sl."exercise_log_id" = el."id"
    WHERE el."exercise_prescription_id" = ep."id"
  );
