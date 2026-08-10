-- Second backfill pass: the alias names.
--
-- 0019 matched on catalog name_es only, which leaves the cases where the four
-- plan templates use different names for the same movement — "Prensa
-- bilateral" vs "Prensa de piernas", "Extensión de tríceps en máquina o polea"
-- vs "Tríceps en polea", "Curl de bíceps en máquina" vs "...en cable". Those
-- aliases live on ExerciseCatalogEntry.aliases in
-- src/training/muscle-taxonomy.ts, which SQL cannot read, so this pass carries
-- them over explicitly. Generated from that module, not hand-typed.
--
-- Reads already resolved these through findCatalogEntryByName, so this only
-- makes the stored data agree with what the app was already showing.
UPDATE "exercise_prescription" ep
SET "exercise_id" = m.exercise_id
FROM (VALUES
  ('press inclinado con mancuernas neutras', 'press-inclinado-con-mancuernas'),
  ('push-ups inclinados', 'flexiones'),
  ('press militar sentado', 'press-de-hombros-en-maquina'),
  ('elevaciones posteriores', 'vuelos-posteriores-en-maquina'),
  ('tríceps en cuerda', 'triceps-en-polea'),
  ('extensión de tríceps en máquina o polea', 'triceps-en-polea'),
  ('dominadas (o jalón al pecho)', 'jalon-al-pecho-agarre-ancho'),
  ('jalón al pecho', 'jalon-al-pecho-agarre-ancho'),
  ('remo sentado en cable', 'remo-sentado-en-maquina'),
  ('remo con mancuerna', 'remo-unilateral-en-polea'),
  ('curl de bíceps en máquina', 'curl-de-biceps-en-cable'),
  ('curl martillo con mancuernas', 'curl-martillo'),
  ('prensa bilateral', 'prensa-de-piernas'),
  ('extensión de piernas', 'extension-de-cuadriceps'),
  ('extensión de cuádriceps bilateral', 'extension-de-cuadriceps'),
  ('extensión unilateral de pierna', 'extension-de-cuadriceps-unilateral'),
  ('sentadilla con giro', 'sentadilla'),
  ('sentadilla búlgara', 'sentadilla-bulgara'),
  ('bulgarian split squat', 'sentadilla-bulgara'),
  ('curl femoral', 'curl-femoral-sentado'),
  ('peso muerto rumano con mancuernas', 'peso-muerto-rumano'),
  ('peso muerto con kettlebell', 'peso-muerto'),
  ('hip thrust', 'hip-thrust'),
  ('pantorrilla sentado', 'pantorrilla-sentada'),
  ('elevación de pantorrillas', 'pantorrilla-sentada'),
  ('caminadora inclinada o bicicleta', 'caminata-en-banda'),
  ('remo 500m', 'remo-maquina-cardio')
) AS m(alias, exercise_id)
WHERE ep."exercise_id" IS NULL
  AND (
    lower(trim(ep."exercise_name_es")) = m.alias
    OR lower(trim(ep."exercise_name_es")) LIKE '% · ' || m.alias
  );
