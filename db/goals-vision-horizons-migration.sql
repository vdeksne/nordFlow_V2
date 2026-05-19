-- Add 5 / 10 / 20-year vision horizons to app_goals (super long-term, no DB parent FK).
-- Run once on Neon after db/goals-schema.sql (and any older parent-link migrations).
-- Re-run safe: DROP IF EXISTS constraint names below.

ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_long_term_parent_ck;
ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_horizon_check;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_horizon_check CHECK (
    horizon IN (
      'short_term',
      'long_term',
      'vision_5',
      'vision_10',
      'vision_20'
    )
  );

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_long_term_parent_ck CHECK (
    (horizon = 'short_term' AND long_term_goal_id IS NOT NULL)
    OR (horizon <> 'short_term' AND long_term_goal_id IS NULL)
  );
