-- Link short-term goals to a long-term parent. Run after db/goals-schema.sql (or equivalent table).

ALTER TABLE public.app_goals
  ADD COLUMN IF NOT EXISTS long_term_goal_id uuid REFERENCES public.app_goals (id) ON DELETE CASCADE;

-- Attach existing shorts to each user's first long-term goal (by sort_order).
UPDATE public.app_goals AS g
SET long_term_goal_id = sub.parent_id
FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    id AS parent_id
  FROM public.app_goals
  WHERE horizon = 'long_term'
  ORDER BY user_id, sort_order ASC, updated_at DESC
) AS sub
WHERE g.horizon = 'short_term'
  AND g.long_term_goal_id IS NULL
  AND g.user_id = sub.user_id;

-- Fails if any short_term rows lack a long-term anchor (create long-term goals first, or delete orphans).
ALTER TABLE public.app_goals
  DROP CONSTRAINT IF EXISTS app_goals_long_term_parent_ck;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_long_term_parent_ck CHECK (
    (horizon = 'long_term' AND long_term_goal_id IS NULL)
    OR (horizon = 'short_term' AND long_term_goal_id IS NOT NULL)
  );
