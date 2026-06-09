-- Align an older app_goals table with the current app (additive, safe to re-run).
-- Fixes: GET /api/goals failing with "column long_term_goal_id does not exist"
-- when the table was created before that column existed.

ALTER TABLE public.app_goals
  ADD COLUMN IF NOT EXISTS long_term_goal_id uuid REFERENCES public.app_goals (id) ON DELETE CASCADE;

-- Attach shorts to each user's first long-term goal where parent is still null.
UPDATE public.app_goals AS g
SET long_term_goal_id = sub.parent_id
  FROM (
  SELECT DISTINCT ON (user_id)
    user_id,
    id AS parent_id
  FROM public.app_goals
  WHERE horizon IN ('one_year', 'long_term')
  ORDER BY user_id,
    CASE horizon WHEN 'one_year' THEN 0 ELSE 1 END,
    sort_order ASC,
    updated_at DESC
) AS sub
WHERE g.horizon = 'short_term'
  AND g.long_term_goal_id IS NULL
  AND g.user_id = sub.user_id;

-- Short-term rows still missing a parent cannot satisfy the CHECK below (no long-term goal for that user).
DELETE FROM public.app_goals AS g
WHERE g.horizon = 'short_term'
  AND g.long_term_goal_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.app_goals AS p
    WHERE p.user_id = g.user_id
      AND p.horizon = 'long_term'
  );

-- Enforce parent rule when possible (drops first so re-run is safe).
ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_long_term_parent_ck;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_long_term_parent_ck CHECK (
    (horizon = 'short_term' AND long_term_goal_id IS NOT NULL)
    OR (horizon <> 'short_term' AND long_term_goal_id IS NULL)
  );

-- Keep horizon check aligned with the app (includes one_year).
ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_horizon_check;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_horizon_check CHECK (
    horizon IN (
      'short_term',
      'one_year',
      'long_term',
      'vision_5',
      'vision_10',
      'vision_20'
    )
  );

ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_vision_parent_ck;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_vision_parent_ck CHECK (
    (horizon IN ('long_term', 'one_year') OR vision_parent_goal_id IS NULL)
  );
