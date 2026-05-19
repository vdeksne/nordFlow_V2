-- Goals (per user). Run after db/auth-schema.sql so app_users exists.

CREATE TABLE IF NOT EXISTS public.app_goals (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  horizon text NOT NULL,
  long_term_goal_id uuid REFERENCES public.app_goals (id) ON DELETE CASCADE,
  vision_parent_goal_id uuid REFERENCES public.app_goals (id) ON DELETE SET NULL,
  title text NOT NULL,
  metric text,
  target_date text,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'archived')
  ),
  area text CHECK (
    area IS NULL
    OR area IN (
      'self',
      'work',
      'money',
      'relationships',
      'meaning',
      'body'
    )
  ),
  review_note text,
  sort_order int NOT NULL DEFAULT 0,
  updated_at date NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT app_goals_horizon_check CHECK (
    horizon IN (
      'short_term',
      'long_term',
      'vision_5',
      'vision_10',
      'vision_20'
    )
  ),
  CONSTRAINT app_goals_long_term_parent_ck CHECK (
    (horizon = 'short_term' AND long_term_goal_id IS NOT NULL)
    OR (horizon <> 'short_term' AND long_term_goal_id IS NULL)
  ),
  CONSTRAINT app_goals_vision_parent_ck CHECK (
    (horizon = 'long_term' OR vision_parent_goal_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS app_goals_user_horizon_sort_idx
  ON public.app_goals (user_id, horizon, sort_order);

CREATE INDEX IF NOT EXISTS app_goals_user_updated_idx
  ON public.app_goals (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS app_goals_user_long_term_parent_idx
  ON public.app_goals (user_id, long_term_goal_id)
  WHERE horizon = 'short_term';

CREATE INDEX IF NOT EXISTS app_goals_user_vision_parent_idx
  ON public.app_goals (user_id, vision_parent_goal_id)
  WHERE horizon = 'long_term' AND vision_parent_goal_id IS NOT NULL;

