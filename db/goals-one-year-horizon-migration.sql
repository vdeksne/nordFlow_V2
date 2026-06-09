-- Fix goal save failures after adding the one_year horizon.
-- Run in Neon SQL editor (safe to re-run).

-- 1) Allow one_year in horizon enum check
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

-- 2) Fix parent rule (goals-ensure-columns.sql used an overly strict version)
ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_long_term_parent_ck;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_long_term_parent_ck CHECK (
    (horizon = 'short_term' AND long_term_goal_id IS NOT NULL)
    OR (horizon <> 'short_term' AND long_term_goal_id IS NULL)
  );

-- 3) Allow optional vision anchors on one_year rows too
ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_vision_parent_ck;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_vision_parent_ck CHECK (
    (horizon IN ('long_term', 'one_year') OR vision_parent_goal_id IS NULL)
  );
