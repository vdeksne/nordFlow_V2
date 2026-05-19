-- Optional link from strategic (`long_term`) goals to ultra-long vision rows (5/10/20y).
-- Safe to run on existing Neon DBs (additive column + CK).
-- Apps validate that `vision_parent_goal_id` references a vision horizon.

ALTER TABLE public.app_goals
  ADD COLUMN IF NOT EXISTS vision_parent_goal_id uuid REFERENCES public.app_goals (id) ON DELETE SET NULL;

ALTER TABLE public.app_goals
  DROP CONSTRAINT IF EXISTS app_goals_vision_parent_ck;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_vision_parent_ck CHECK (
    horizon = 'long_term' OR vision_parent_goal_id IS NULL
  );

CREATE INDEX IF NOT EXISTS app_goals_user_vision_parent_idx
  ON public.app_goals (user_id, vision_parent_goal_id)
  WHERE horizon = 'long_term' AND vision_parent_goal_id IS NOT NULL;
