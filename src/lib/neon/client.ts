import { neon } from "@neondatabase/serverless";

/**
 * Neon HTTP driver - use from Server Components, Route Handlers, or server actions.
 * Set `DATABASE_URL` in `.env.local` (Neon pooled connection string).
 */
export function getNeonSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return null;
  }
  return neon(url);
}
