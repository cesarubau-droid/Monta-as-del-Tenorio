/**
 * Database access for the booking system (cart + admin panel).
 *
 * Production: Neon Postgres over HTTP (DATABASE_URL, set by the Vercel ↔ Neon integration).
 * Local development without DATABASE_URL: PGlite, an in-process Postgres stored in .pglite/
 * (dev dependency only — never loaded in production).
 *
 * The schema is created on first use, so a fresh database needs no manual setup.
 */
type Row = Record<string, unknown>;
export type Query = <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]>;

let ready: Promise<Query> | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cabin_blocks (
  id serial PRIMARY KEY,
  cabin text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,          -- exclusive (the checkout day stays free)
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reservations (
  ref text PRIMARY KEY,
  status text NOT NULL DEFAULT 'new',   -- new | confirmed | cancelled
  lang text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  country text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  total numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reservation_cabins (
  id serial PRIMARY KEY,
  ref text NOT NULL REFERENCES reservations(ref) ON DELETE CASCADE,
  cabin text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL,
  amount numeric(10,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS reservation_tours (
  id serial PRIMARY KEY,
  ref text NOT NULL REFERENCES reservations(ref) ON DELETE CASCADE,
  tour text NOT NULL,
  date date NOT NULL,
  slot text NOT NULL,
  adults int NOT NULL,
  children int NOT NULL,
  amount numeric(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS reservation_cabins_cabin ON reservation_cabins (cabin, check_in);
CREATE INDEX IF NOT EXISTS reservation_tours_tour ON reservation_tours (tour, date);
CREATE INDEX IF NOT EXISTS cabin_blocks_cabin ON cabin_blocks (cabin, start_date);
`;

async function connect(): Promise<Query> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    const q: Query = async (text, params = []) => (await sql.query(text, params)) as never;
    for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) await q(stmt);
    return q;
  }
  if (!import.meta.env.DEV) throw new Error('DATABASE_URL is not configured');
  // Variable specifier so the bundler never pulls PGlite into the production function.
  const mod = '@electric-sql/pglite';
  const { PGlite } = await import(/* @vite-ignore */ mod);
  const db = new PGlite(process.env.PGLITE_DIR ?? './.pglite');
  await db.exec(SCHEMA);
  return async (text, params = []) => (await db.query(text, params)).rows as never;
}

/** Returns the query function, creating the schema on first call. */
export function db(): Promise<Query> {
  ready ??= connect().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

/** True when a database is available (configured in production, or local dev). */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL) || import.meta.env.DEV;
}
