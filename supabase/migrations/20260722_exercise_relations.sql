-- ============================================================================
-- 20260722_exercise_relations.sql — Step 4.4 prerequisite
-- ============================================================================
-- Populates exercise_relations dynamically based on catalog metadata.
--
-- Heuristic (deterministic, no external data, no guessing beyond structured
-- columns): exercises sharing target_muscle and category are related;
-- same equipment -> 'variation', different equipment -> 'alternative'.
-- Capped at 6 per exercise per relation_type, chosen alphabetically by the
-- related exercise's name for reproducibility.
-- ============================================================================

WITH ranked_relations AS (
  SELECT
    e1.id AS exercise_id,
    e2.id AS related_exercise_id,
    CASE
      WHEN e1.equipment = e2.equipment THEN 'variation'
      ELSE 'alternative'
    END AS relation_type,
    ROW_NUMBER() OVER (
      PARTITION BY e1.id, (CASE WHEN e1.equipment = e2.equipment THEN 'variation' ELSE 'alternative' END)
      ORDER BY e2.name ASC
    ) AS rank
  FROM public.exercises e1
  JOIN public.exercises e2
    ON e1.target_muscle = e2.target_muscle
   AND e1.category = e2.category
   AND e1.id <> e2.id
  WHERE e1.source = 'free-exercise-db'
    AND e2.source = 'free-exercise-db'
    AND e1.equipment IS NOT NULL
    AND e2.equipment IS NOT NULL
    AND e1.target_muscle IS NOT NULL
    AND e1.category IS NOT NULL
)
INSERT INTO public.exercise_relations (exercise_id, related_exercise_id, relation_type)
SELECT exercise_id, related_exercise_id, relation_type
FROM ranked_relations
WHERE rank <= 6
ON CONFLICT (exercise_id, related_exercise_id, relation_type) DO NOTHING;
