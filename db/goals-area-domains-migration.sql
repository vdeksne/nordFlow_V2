-- Migrate goal `area` to six domains (Self, Work, Money, Relationships, Meaning, Body).
-- Safe to run after prior pillar or eight-layer migrations; maps all historical keys.

ALTER TABLE public.app_goals DROP CONSTRAINT IF EXISTS app_goals_area_check;

UPDATE public.app_goals
SET area = CASE area
  WHEN 'self' THEN 'self'
  WHEN 'work' THEN 'work'
  WHEN 'money' THEN 'money'
  WHEN 'relationships' THEN 'relationships'
  WHEN 'meaning' THEN 'meaning'
  WHEN 'body' THEN 'body'
  WHEN 'revenue' THEN 'money'
  WHEN 'delivery' THEN 'work'
  WHEN 'growth' THEN 'meaning'
  WHEN 'health' THEN 'body'
  WHEN 'learning' THEN 'self'
  WHEN 'outreach' THEN 'work'
  WHEN 'pipeline' THEN 'money'
  WHEN 'brand' THEN 'meaning'
  WHEN 'distribution' THEN 'work'
  WHEN 'experimentation' THEN 'self'
  WHEN 'follow_up' THEN 'relationships'
  WHEN 'positioning' THEN 'meaning'
  ELSE NULL
END
WHERE area IS NOT NULL;

ALTER TABLE public.app_goals
  ADD CONSTRAINT app_goals_area_check CHECK (
    area IS NULL
    OR area IN (
      'self',
      'work',
      'money',
      'relationships',
      'meaning',
      'body'
    )
  );
