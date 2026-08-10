CREATE TYPE "public"."muscle_group" AS ENUM('pecho', 'deltoides_lateral', 'triceps', 'dorsal', 'espalda_alta', 'deltoides_posterior', 'biceps', 'cuadriceps', 'femorales', 'gluteos', 'abductores_aductores', 'pantorrillas', 'core');--> statement-breakpoint
DROP INDEX "exercise_slug_unique";--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "athlete_profile_id" text;--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "primary_muscle_group" "muscle_group";--> statement-breakpoint
ALTER TABLE "exercise" ADD COLUMN "secondary_muscle_groups" "muscle_group"[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD COLUMN "exercise_id" text;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_athlete_profile_id_athlete_profile_id_fk" FOREIGN KEY ("athlete_profile_id") REFERENCES "public"."athlete_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_prescription" ADD CONSTRAINT "exercise_prescription_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_seeded_slug_unique" ON "exercise" USING btree ("slug") WHERE "exercise"."athlete_profile_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_profile_slug_unique" ON "exercise" USING btree ("athlete_profile_id","slug");--> statement-breakpoint
CREATE INDEX "exercise_prescription_exercise_id_idx" ON "exercise_prescription" USING btree ("exercise_id");--> statement-breakpoint
-- Seeds the exercise catalog from src/training/muscle-taxonomy.ts (generated
-- from that module, not hand-typed). The seed lives inside the migration
-- rather than a separate script because vercel.json's buildCommand runs
-- "npm run db:migrate && npm run build" — this is the only path that reaches
-- the production Neon branch.
--
-- Catalog ids ARE slugs, so this produces byte-identical rows on the dev and
-- production branches.
--
-- is_active defaults to false (see schema.ts), so the 12 legacy rows left by
-- the removed "Pesos base" flow — still referenced by baseline_lift with
-- onDelete:"restrict", hence never deletable — stay hidden from every picker
-- without this migration having to name them, and so does any legacy row on
-- production that has never been inspected from a dev machine.
--
-- ON CONFLICT DO UPDATE rather than DO NOTHING so a divergent branch
-- converges instead of failing the build.
INSERT INTO "exercise" ("id", "slug", "name_es", "name_en", "primary_muscle_group", "secondary_muscle_groups", "equipment_type", "movement_pattern", "joint_stress_tags", "is_active") VALUES
  ('press-de-pecho-en-maquina', 'press-de-pecho-en-maquina', 'Press de pecho en máquina', 'Machine chest press', 'pecho'::"public"."muscle_group", ARRAY['triceps','deltoides_lateral']::"public"."muscle_group"[], 'machine', 'empuje_horizontal', '["hombro","codo"]'::jsonb, true),
  ('press-de-pecho-en-cable', 'press-de-pecho-en-cable', 'Press de pecho en cable', 'Cable chest press', 'pecho'::"public"."muscle_group", ARRAY['triceps','deltoides_lateral']::"public"."muscle_group"[], 'machine', 'empuje_horizontal', '["hombro","codo"]'::jsonb, true),
  ('press-inclinado-en-maquina', 'press-inclinado-en-maquina', 'Press inclinado en máquina', 'Machine incline press', 'pecho'::"public"."muscle_group", ARRAY['triceps','deltoides_lateral']::"public"."muscle_group"[], 'machine', 'empuje_horizontal', '["hombro","codo"]'::jsonb, true),
  ('press-inclinado-con-mancuernas', 'press-inclinado-con-mancuernas', 'Press inclinado con mancuernas', 'Incline dumbbell press', 'pecho'::"public"."muscle_group", ARRAY['triceps','deltoides_lateral']::"public"."muscle_group"[], 'dumbbell', 'empuje_horizontal', '["hombro","codo"]'::jsonb, true),
  ('flexiones', 'flexiones', 'Flexiones', 'Push-ups', 'pecho'::"public"."muscle_group", ARRAY['triceps','deltoides_lateral','core']::"public"."muscle_group"[], 'bodyweight', 'empuje_horizontal', '["hombro","codo","muneca"]'::jsonb, true),
  ('press-de-hombros-en-maquina', 'press-de-hombros-en-maquina', 'Press de hombros en máquina', 'Machine shoulder press', 'deltoides_lateral'::"public"."muscle_group", ARRAY['triceps']::"public"."muscle_group"[], 'machine', 'empuje_vertical', '["hombro","codo"]'::jsonb, true),
  ('press-de-hombro-con-mancuernas', 'press-de-hombro-con-mancuernas', 'Press de hombro con mancuernas', 'Dumbbell shoulder press', 'deltoides_lateral'::"public"."muscle_group", ARRAY['triceps']::"public"."muscle_group"[], 'dumbbell', 'empuje_vertical', '["hombro","codo"]'::jsonb, true),
  ('push-press', 'push-press', 'Push press', 'Push press', 'deltoides_lateral'::"public"."muscle_group", ARRAY['triceps','cuadriceps']::"public"."muscle_group"[], 'barbell', 'empuje_vertical', '["hombro","codo"]'::jsonb, true),
  ('elevaciones-laterales-en-cable', 'elevaciones-laterales-en-cable', 'Elevaciones laterales en cable', 'Cable lateral raise', 'deltoides_lateral'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["hombro"]'::jsonb, true),
  ('vuelos-posteriores-en-maquina', 'vuelos-posteriores-en-maquina', 'Vuelos posteriores en máquina', 'Machine rear delt fly', 'deltoides_posterior'::"public"."muscle_group", ARRAY['espalda_alta']::"public"."muscle_group"[], 'machine', 'aislamiento', '["hombro"]'::jsonb, true),
  ('face-pull', 'face-pull', 'Face pull', 'Face pull', 'deltoides_posterior'::"public"."muscle_group", ARRAY['espalda_alta']::"public"."muscle_group"[], 'machine', 'tiron_horizontal', '["hombro"]'::jsonb, true),
  ('triceps-en-polea', 'triceps-en-polea', 'Tríceps en polea', 'Cable triceps extension', 'triceps'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["codo"]'::jsonb, true),
  ('press-frances-con-mancuerna', 'press-frances-con-mancuerna', 'Press francés con mancuerna', 'Dumbbell skull crusher', 'triceps'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'dumbbell', 'aislamiento', '["codo"]'::jsonb, true),
  ('fondos-en-banco', 'fondos-en-banco', 'Fondos en banco', 'Bench dips', 'triceps'::"public"."muscle_group", ARRAY['pecho','deltoides_lateral']::"public"."muscle_group"[], 'bodyweight', 'empuje_vertical', '["hombro","codo"]'::jsonb, true),
  ('jalon-al-pecho-agarre-neutro', 'jalon-al-pecho-agarre-neutro', 'Jalón al pecho agarre neutro', 'Neutral-grip lat pulldown', 'dorsal'::"public"."muscle_group", ARRAY['biceps','espalda_alta']::"public"."muscle_group"[], 'machine', 'tiron_vertical', '["hombro","codo"]'::jsonb, true),
  ('jalon-al-pecho-agarre-ancho', 'jalon-al-pecho-agarre-ancho', 'Jalón al pecho agarre ancho', 'Wide-grip lat pulldown', 'dorsal'::"public"."muscle_group", ARRAY['biceps','espalda_alta']::"public"."muscle_group"[], 'machine', 'tiron_vertical', '["hombro","codo"]'::jsonb, true),
  ('pullover-en-cable', 'pullover-en-cable', 'Pullover en cable', 'Cable pullover', 'dorsal'::"public"."muscle_group", ARRAY['pecho','triceps']::"public"."muscle_group"[], 'machine', 'aislamiento', '["hombro"]'::jsonb, true),
  ('remo-sentado-en-maquina', 'remo-sentado-en-maquina', 'Remo sentado en máquina', 'Seated machine row', 'espalda_alta'::"public"."muscle_group", ARRAY['dorsal','biceps','deltoides_posterior']::"public"."muscle_group"[], 'machine', 'tiron_horizontal', '["hombro","codo"]'::jsonb, true),
  ('remo-pecho-apoyado', 'remo-pecho-apoyado', 'Remo pecho apoyado', 'Chest-supported row', 'espalda_alta'::"public"."muscle_group", ARRAY['dorsal','biceps','deltoides_posterior']::"public"."muscle_group"[], 'machine', 'tiron_horizontal', '["hombro","codo"]'::jsonb, true),
  ('remo-unilateral-en-polea', 'remo-unilateral-en-polea', 'Remo unilateral en polea', 'Single-arm cable row', 'espalda_alta'::"public"."muscle_group", ARRAY['dorsal','biceps']::"public"."muscle_group"[], 'machine', 'tiron_horizontal', '["hombro","codo"]'::jsonb, true),
  ('extension-de-espalda-en-maquina', 'extension-de-espalda-en-maquina', 'Extensión de espalda en máquina', 'Machine back extension', 'core'::"public"."muscle_group", ARRAY['gluteos','femorales']::"public"."muscle_group"[], 'machine', 'bisagra_cadera', '["columna_lumbar","cadera"]'::jsonb, true),
  ('curl-de-biceps-en-cable', 'curl-de-biceps-en-cable', 'Curl de bíceps en cable', 'Cable biceps curl', 'biceps'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["codo"]'::jsonb, true),
  ('curl-martillo', 'curl-martillo', 'Curl martillo', 'Hammer curl', 'biceps'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'dumbbell', 'aislamiento', '["codo","muneca"]'::jsonb, true),
  ('prensa-de-piernas', 'prensa-de-piernas', 'Prensa de piernas', 'Leg press', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','femorales']::"public"."muscle_group"[], 'machine', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('prensa-pies-bajos', 'prensa-pies-bajos', 'Prensa (pies bajos)', 'Leg press (low foot position)', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('prensa-unilateral', 'prensa-unilateral', 'Prensa unilateral', 'Single-leg press', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('extension-de-cuadriceps', 'extension-de-cuadriceps', 'Extensión de cuádriceps', 'Leg extension', 'cuadriceps'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["rodilla"]'::jsonb, true),
  ('extension-de-cuadriceps-unilateral', 'extension-de-cuadriceps-unilateral', 'Extensión de cuádriceps unilateral', 'Single-leg extension', 'cuadriceps'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["rodilla"]'::jsonb, true),
  ('hack-squat', 'hack-squat', 'Hack squat controlado', 'Controlled hack squat', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('sentadilla-trasera', 'sentadilla-trasera', 'Sentadilla trasera (Back Squat)', 'Back squat', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','femorales']::"public"."muscle_group"[], 'barbell', 'dominante_rodilla', '["rodilla","cadera","columna_lumbar"]'::jsonb, true),
  ('sentadilla', 'sentadilla', 'Sentadilla', 'Bodyweight squat', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'bodyweight', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('goblet-squat', 'goblet-squat', 'Goblet squat', 'Goblet squat', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','core']::"public"."muscle_group"[], 'dumbbell', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('sentadilla-sumo', 'sentadilla-sumo', 'Sentadilla sumo', 'Sumo squat', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','abductores_aductores']::"public"."muscle_group"[], 'bodyweight', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('sentadilla-bulgara', 'sentadilla-bulgara', 'Sentadilla búlgara con apoyo', 'Bulgarian split squat', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','femorales']::"public"."muscle_group"[], 'machine', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('walking-lunges', 'walking-lunges', 'Walking lunges', 'Walking lunges', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','femorales']::"public"."muscle_group"[], 'bodyweight', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('step-ups', 'step-ups', 'Step-ups por pierna', 'Step-ups', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'bodyweight', 'dominante_rodilla', '["rodilla","cadera"]'::jsonb, true),
  ('box-jumps', 'box-jumps', 'Box jumps', 'Box jumps', 'cuadriceps'::"public"."muscle_group", ARRAY['gluteos','pantorrillas']::"public"."muscle_group"[], 'bodyweight', 'dominante_rodilla', '["rodilla","tobillo"]'::jsonb, true),
  ('curl-femoral-sentado', 'curl-femoral-sentado', 'Curl femoral sentado', 'Seated leg curl', 'femorales'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'aislamiento', '["rodilla"]'::jsonb, true),
  ('curl-femoral-sentado-unilateral', 'curl-femoral-sentado-unilateral', 'Curl femoral sentado unilateral', 'Single-leg seated curl', 'femorales'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'aislamiento', '["rodilla"]'::jsonb, true),
  ('curl-femoral-acostado', 'curl-femoral-acostado', 'Curl femoral acostado', 'Lying leg curl', 'femorales'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'aislamiento', '["rodilla"]'::jsonb, true),
  ('peso-muerto-rumano', 'peso-muerto-rumano', 'Peso muerto rumano', 'Romanian deadlift', 'femorales'::"public"."muscle_group", ARRAY['gluteos','espalda_alta']::"public"."muscle_group"[], 'machine', 'bisagra_cadera', '["cadera","columna_lumbar"]'::jsonb, true),
  ('peso-muerto', 'peso-muerto', 'Peso muerto (Deadlift)', 'Deadlift', 'femorales'::"public"."muscle_group", ARRAY['gluteos','espalda_alta','cuadriceps']::"public"."muscle_group"[], 'barbell', 'bisagra_cadera', '["cadera","columna_lumbar"]'::jsonb, true),
  ('hip-thrust', 'hip-thrust', 'Hip thrust en máquina', 'Machine hip thrust', 'gluteos'::"public"."muscle_group", ARRAY['femorales']::"public"."muscle_group"[], 'machine', 'bisagra_cadera', '["cadera"]'::jsonb, true),
  ('kb-swing', 'kb-swing', 'KB swing', 'Kettlebell swing', 'gluteos'::"public"."muscle_group", ARRAY['femorales','espalda_alta']::"public"."muscle_group"[], 'dumbbell', 'bisagra_cadera', '["cadera","columna_lumbar"]'::jsonb, true),
  ('abduccion-de-cadera-en-maquina', 'abduccion-de-cadera-en-maquina', 'Abducción de cadera en máquina', 'Machine hip abduction', 'abductores_aductores'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'machine', 'aduccion_abduccion', '["cadera"]'::jsonb, true),
  ('pantorrilla-sentada', 'pantorrilla-sentada', 'Pantorrilla sentada', 'Seated calf raise', 'pantorrillas'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["tobillo"]'::jsonb, true),
  ('pantorrilla-sentada-unilateral', 'pantorrilla-sentada-unilateral', 'Pantorrilla sentada unilateral', 'Single-leg seated calf raise', 'pantorrillas'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["tobillo"]'::jsonb, true),
  ('pantorrilla-de-pie-unilateral', 'pantorrilla-de-pie-unilateral', 'Pantorrilla de pie unilateral', 'Single-leg standing calf raise', 'pantorrillas'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["tobillo"]'::jsonb, true),
  ('pantorrilla-en-la-prensa', 'pantorrilla-en-la-prensa', 'Pantorrilla en la prensa', 'Calf raise on leg press', 'pantorrillas'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'aislamiento', '["tobillo"]'::jsonb, true),
  ('core-generico', 'core-generico', 'Core', 'Core', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'core_flexion', '["columna_lumbar"]'::jsonb, true),
  ('crunch-en-maquina', 'crunch-en-maquina', 'Crunch en máquina', 'Machine crunch', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'core_flexion', '["columna_lumbar"]'::jsonb, true),
  ('pallof-press-en-polea', 'pallof-press-en-polea', 'Pallof press en polea', 'Cable Pallof press', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'machine', 'core_antirrotacion', '["columna_lumbar"]'::jsonb, true),
  ('elevacion-de-rodillas-en-paralelas', 'elevacion-de-rodillas-en-paralelas', 'Elevación de rodillas en paralelas', 'Captain''s chair knee raise', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'bodyweight', 'core_flexion', '["columna_lumbar","cadera"]'::jsonb, true),
  ('plancha', 'plancha', 'Plancha', 'Plank', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'bodyweight', 'core_antiextension', '["columna_lumbar","hombro"]'::jsonb, true),
  ('plancha-lateral', 'plancha-lateral', 'Plancha lateral', 'Side plank', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'bodyweight', 'core_antiflexion_lateral', '["columna_lumbar","hombro"]'::jsonb, true),
  ('reverse-crunch', 'reverse-crunch', 'Reverse crunch', 'Reverse crunch', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'bodyweight', 'core_flexion', '["columna_lumbar"]'::jsonb, true),
  ('russian-twist', 'russian-twist', 'Russian twist', 'Russian twist', 'core'::"public"."muscle_group", '{}'::"public"."muscle_group"[], 'bodyweight', 'core_rotacion', '["columna_lumbar"]'::jsonb, true),
  ('bird-dog', 'bird-dog', 'Bird dog', 'Bird dog', 'core'::"public"."muscle_group", ARRAY['gluteos']::"public"."muscle_group"[], 'bodyweight', 'core_antiextension', '["columna_lumbar"]'::jsonb, true),
  ('escaladores', 'escaladores', 'Escaladores', 'Mountain climbers', 'core'::"public"."muscle_group", ARRAY['cuadriceps']::"public"."muscle_group"[], 'bodyweight', 'core_antiextension', '["columna_lumbar","hombro"]'::jsonb, true),
  ('inchworms', 'inchworms', 'Inchworms (gusanos)', 'Inchworms', 'core'::"public"."muscle_group", ARRAY['pecho']::"public"."muscle_group"[], 'bodyweight', 'core_antiextension', '["columna_lumbar","hombro"]'::jsonb, true),
  ('farmer-carry', 'farmer-carry', 'Farmer carry', 'Farmer carry', 'core'::"public"."muscle_group", ARRAY['espalda_alta','pantorrillas']::"public"."muscle_group"[], 'dumbbell', 'core_antiflexion_lateral', '["columna_lumbar","hombro"]'::jsonb, true),
  ('caminata-en-banda', 'caminata-en-banda', 'Caminata en banda', 'Treadmill walk', NULL, '{}'::"public"."muscle_group"[], 'machine', 'cardio', '[]'::jsonb, true),
  ('bici-estatica', 'bici-estatica', 'Bici estática', 'Stationary bike', NULL, '{}'::"public"."muscle_group"[], 'machine', 'cardio', '[]'::jsonb, true),
  ('remo-maquina-cardio', 'remo-maquina-cardio', 'Remo (máquina)', 'Rowing erg', NULL, '{}'::"public"."muscle_group"[], 'machine', 'cardio', '[]'::jsonb, true),
  ('jumping-jacks', 'jumping-jacks', 'Jumping jacks', 'Jumping jacks', NULL, '{}'::"public"."muscle_group"[], 'bodyweight', 'cardio', '[]'::jsonb, true),
  ('burpees', 'burpees', 'Burpees', 'Burpees', NULL, '{}'::"public"."muscle_group"[], 'bodyweight', 'cardio', '[]'::jsonb, true),
  ('escalera-finalizador', 'escalera-finalizador', 'Escalera (finalizador)', 'Stair finisher', NULL, '{}'::"public"."muscle_group"[], 'machine', 'cardio', '[]'::jsonb, true)
ON CONFLICT ("id") DO UPDATE SET
  "name_es" = EXCLUDED."name_es",
  "name_en" = EXCLUDED."name_en",
  "primary_muscle_group" = EXCLUDED."primary_muscle_group",
  "secondary_muscle_groups" = EXCLUDED."secondary_muscle_groups",
  "equipment_type" = EXCLUDED."equipment_type",
  "movement_pattern" = EXCLUDED."movement_pattern",
  "joint_stress_tags" = EXCLUDED."joint_stress_tags",
  "is_active" = true;
