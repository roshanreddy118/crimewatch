/**
 * Unified DB adapter.
 * - Local dev  → better-sqlite3 (in-process, zero config, stores at ./local.db)
 * - Production → pg / Postgres (POSTGRES_URL env var set in Vercel dashboard)
 *
 * All queries use positional params: $1, $2, $3 …
 */

import path from 'path';

type Row    = Record<string, unknown>;
export type QueryResult = { rows: Row[] };
export type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

/* ─── Detect environment ──────────────────────────────────────
   Production = POSTGRES_URL is set to a real connection string.
   The placeholder in .env.local starts with 'postgresql://user:password'
   so it's treated as local.
───────────────────────────────────────────────────────────── */
const POSTGRES_URL = process.env.POSTGRES_URL ?? '';
export const isProduction =
  POSTGRES_URL.length > 0 &&
  !POSTGRES_URL.startsWith('postgresql://user:password');

/* ─── Guard: prevent SQLite from running on Vercel ───────────
   Vercel's serverless functions have no persistent filesystem.
   If somehow POSTGRES_URL is missing in production, crash loudly
   rather than silently failing with an empty SQLite DB.
───────────────────────────────────────────────────────────── */
if (process.env.VERCEL && !isProduction) {
  throw new Error(
    'Running on Vercel but POSTGRES_URL is not set or is still the placeholder. ' +
    'Set POSTGRES_URL in your Vercel project environment variables.'
  );
}

/* ─── SQLite adapter (local dev only) ────────────────────────
   Converts $1 $2 … positional params to ? for better-sqlite3.
───────────────────────────────────────────────────────────── */
function buildSQLiteAdapter(): QueryFn {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Database = require('better-sqlite3');
  const dbPath   = path.join(process.cwd(), 'local.db');
  const db       = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return async (sql: string, params: unknown[] = []) => {
    const sqliteSql = sql.replace(/\$\d+/g, '?');
    const upper     = sqliteSql.trimStart().toUpperCase();
    try {
      if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA')) {
        const rows = db.prepare(sqliteSql).all(...params) as Row[];
        return { rows };
      } else {
        db.prepare(sqliteSql).run(...params);
        return { rows: [] };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already exists') || msg.includes('UNIQUE constraint failed')) {
        return { rows: [] };
      }
      console.error('[SQLite] Error:', msg, '\nSQL:', sqliteSql, '\nParams:', params);
      throw err;
    }
  };
}

/* ─── Postgres adapter (production) ──────────────────────────
   Uses a connection pool for efficiency across serverless invocations.
───────────────────────────────────────────────────────────── */
function buildPostgresAdapter(): QueryFn {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false }, // required for Neon / Vercel Postgres
    max: 5,
  });

  return async (sql: string, params: unknown[] = []) => {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return { rows: res.rows };
    } finally {
      client.release();
    }
  };
}

export const query: QueryFn = isProduction
  ? buildPostgresAdapter()
  : buildSQLiteAdapter();

export const dbMode = isProduction ? 'postgres' : 'sqlite';
