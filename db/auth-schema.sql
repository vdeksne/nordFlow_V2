-- Neon / Postgres: run once in the SQL editor (or migrate) before using login/register.
-- Requires pgcrypto for gen_random_uuid().

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_idx
  ON public.app_users (lower(email));

CREATE INDEX IF NOT EXISTS app_users_created_at_idx ON public.app_users (created_at DESC);
