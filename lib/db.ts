import { query, isProduction } from '@/lib/db-adapter';
import { CrimeCase, CaseUpdate, RSSFeed } from '@/types';

/* ─────────────────────────────────────────────────────────────
   SQL dialect helpers
   SQLite and Postgres differ on: UUID gen, timestamps, booleans,
   INSERT conflict syntax, and ILIKE (Postgres) vs LIKE (SQLite).
───────────────────────────────────────────────────────────── */
const sql = {
  // UUID default
  uuid: isProduction
    ? `gen_random_uuid()`
    : `lower(hex(randomblob(16)))`,

  // Current timestamp
  now: isProduction
    ? `NOW()`
    : `datetime('now')`,

  // Case-insensitive LIKE
  ilike: isProduction ? 'ILIKE' : 'LIKE',

  // Boolean true
  true: isProduction ? 'TRUE' : '1',

  // INSERT conflict: ignore duplicate
  insertIgnore: (table: string) => isProduction
    ? `INSERT INTO ${table}`
    : `INSERT OR IGNORE INTO ${table}`,

  // ON CONFLICT DO NOTHING (Postgres needs explicit clause; SQLite uses INSERT OR IGNORE)
  onConflictIgnore: isProduction
    ? `ON CONFLICT DO NOTHING`
    : ``,

  // Boolean active check
  activeCheck: isProduction ? `active = TRUE` : `active = 1`,
};

/* ─────────────────────────────────────────────────────────────
   Schema — safe to run on every boot (IF NOT EXISTS)
───────────────────────────────────────────────────────────── */
export async function initializeDatabase() {
  if (isProduction) {
    await query(`
      CREATE TABLE IF NOT EXISTS cases (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        TEXT NOT NULL,
        description  TEXT,
        case_type    TEXT,
        jurisdiction TEXT,
        parties      JSONB NOT NULL DEFAULT '{}',
        charges      JSONB NOT NULL DEFAULT '[]',
        status       TEXT NOT NULL DEFAULT 'ongoing',
        source_url   TEXT UNIQUE,
        source_feed  TEXT,
        published_at TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS case_updates (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id     UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        update_text TEXT NOT NULL,
        update_date TIMESTAMPTZ,
        source_url  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feed_url     TEXT UNIQUE NOT NULL,
        feed_name    TEXT NOT NULL,
        last_checked TIMESTAMPTZ,
        active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } else {
    // SQLite schema
    await query(`
      CREATE TABLE IF NOT EXISTS cases (
        id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title        TEXT NOT NULL,
        description  TEXT,
        case_type    TEXT,
        jurisdiction TEXT,
        parties      TEXT NOT NULL DEFAULT '{}',
        charges      TEXT NOT NULL DEFAULT '[]',
        status       TEXT NOT NULL DEFAULT 'ongoing',
        source_url   TEXT UNIQUE,
        source_feed  TEXT,
        published_at TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    try { await query(`ALTER TABLE cases ADD COLUMN published_at TEXT`); } catch { /* exists */ }
    await query(`
      CREATE TABLE IF NOT EXISTS case_updates (
        id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        case_id     TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        update_text TEXT NOT NULL,
        update_date TEXT,
        source_url  TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        feed_url     TEXT UNIQUE NOT NULL,
        feed_name    TEXT NOT NULL,
        last_checked TEXT,
        active       INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  await query(`CREATE INDEX IF NOT EXISTS idx_cases_status  ON cases(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_cases_updated ON cases(updated_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_updates_case  ON case_updates(case_id)`);
  console.log(`[db] Schema ready (${isProduction ? 'postgres' : 'sqlite'})`);
}

/* ─────────────────────────────────────────────────────────────
   Row mappers — handle both Postgres (native types) and
   SQLite (everything is a string)
───────────────────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function mapCase(r: Row): CrimeCase {
  let parties: CrimeCase['parties'] = {};
  let charges: string[] = [];

  const rawParties = r.parties;
  const rawCharges = r.charges;

  try {
    parties = typeof rawParties === 'string' ? JSON.parse(rawParties) : rawParties as CrimeCase['parties'];
  } catch { /* ignore */ }
  try {
    charges = typeof rawCharges === 'string' ? JSON.parse(rawCharges) : rawCharges as string[];
    if (!Array.isArray(charges)) charges = [];
  } catch { /* ignore */ }

  const publishedAt = r.published_at
    ? new Date(r.published_at as string)
    : new Date(r.created_at as string);

  return {
    id:           String(r.id),
    title:        String(r.title),
    description:  r.description  as string,
    caseType:     r.case_type    as string,
    jurisdiction: r.jurisdiction as string,
    parties,
    charges,
    status:       r.status as CrimeCase['status'],
    sourceUrl:    r.source_url  as string,
    sourcesFeed:  r.source_feed as string,
    publishedAt,
    createdAt:    new Date(r.created_at as string),
    updatedAt:    new Date(r.updated_at as string),
  };
}

function mapUpdate(r: Row): CaseUpdate {
  return {
    id:         String(r.id),
    caseId:     String(r.case_id),
    updateText: String(r.update_text),
    updateDate: new Date((r.update_date ?? r.created_at) as string),
    sourceUrl:  r.source_url as string,
    createdAt:  new Date(r.created_at as string),
  };
}

function mapFeed(r: Row): RSSFeed {
  return {
    id:          String(r.id),
    feedUrl:     String(r.feed_url),
    feedName:    String(r.feed_name),
    lastChecked: r.last_checked ? new Date(r.last_checked as string) : new Date(0),
    active:      r.active === 1 || r.active === true || r.active === 'true',
  };
}

/* ─────────────────────────────────────────────────────────────
   Cases — read
───────────────────────────────────────────────────────────── */
export async function getAllCases(limit = 60, offset = 0): Promise<CrimeCase[]> {
  const { rows } = await query(
    `SELECT * FROM cases ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows.map(mapCase);
}

export async function getCaseById(id: string): Promise<CrimeCase | null> {
  const { rows } = await query(`SELECT * FROM cases WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] ? mapCase(rows[0]) : null;
}

export async function getCaseBySourceUrl(url: string): Promise<CrimeCase | null> {
  const { rows } = await query(`SELECT * FROM cases WHERE source_url = $1 LIMIT 1`, [url]);
  return rows[0] ? mapCase(rows[0]) : null;
}

export async function searchCases(
  queryStr: string,
  filters?: { status?: string },
): Promise<CrimeCase[]> {
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (queryStr) {
    const like = '%' + queryStr + '%';
    conditions.push(`(title ${sql.ilike} $1 OR description ${sql.ilike} $2)`);
    params.push(like, like);
  }
  if (filters?.status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(filters.status);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await query(
    `SELECT * FROM cases ${where} ORDER BY updated_at DESC LIMIT 60`,
    params,
  );
  return rows.map(mapCase);
}

/* ─────────────────────────────────────────────────────────────
   Cases — write
───────────────────────────────────────────────────────────── */
export async function createCase(data: Partial<CrimeCase>): Promise<CrimeCase | null> {
  const publishedAt = data.publishedAt ? data.publishedAt.toISOString() : null;
  const dateStr     = publishedAt ?? new Date().toISOString();

  const insertSql = isProduction
    ? `INSERT INTO cases
         (title, description, case_type, jurisdiction, parties, charges,
          status, source_url, source_feed, published_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (source_url) DO NOTHING`
    : `INSERT OR IGNORE INTO cases
         (title, description, case_type, jurisdiction, parties, charges,
          status, source_url, source_feed, published_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`;

  await query(insertSql, [
    data.title        ?? '',
    data.description  ?? null,
    data.caseType     ?? null,
    data.jurisdiction ?? null,
    JSON.stringify(data.parties ?? {}),
    JSON.stringify(data.charges ?? []),
    data.status       ?? 'ongoing',
    data.sourceUrl    ?? null,
    data.sourcesFeed  ?? null,
    publishedAt,
    dateStr,
    dateStr,
  ]);

  if (data.sourceUrl) return getCaseBySourceUrl(data.sourceUrl);
  return null;
}

export async function updateCaseStatus(id: string, status: CrimeCase['status']): Promise<void> {
  await query(
    `UPDATE cases SET status=$1, updated_at=${sql.now} WHERE id=$2`,
    [status, id],
  );
}

export async function updateCaseDescription(id: string, description: string): Promise<void> {
  await query(
    `UPDATE cases SET description=$1, updated_at=${sql.now} WHERE id=$2`,
    [description, id],
  );
}

export async function touchCase(id: string): Promise<void> {
  await query(`UPDATE cases SET updated_at=${sql.now} WHERE id=$1`, [id]);
}

/* ─────────────────────────────────────────────────────────────
   Case updates (timeline)
───────────────────────────────────────────────────────────── */
export async function getCaseUpdates(caseId: string): Promise<CaseUpdate[]> {
  const { rows } = await query(
    `SELECT * FROM case_updates
     WHERE case_id = $1
     ORDER BY COALESCE(update_date, created_at) ASC`,
    [caseId],
  );
  return rows.map(mapUpdate);
}

export async function addCaseUpdate(
  caseId: string,
  update: Pick<CaseUpdate, 'updateText' | 'sourceUrl' | 'updateDate'>,
): Promise<CaseUpdate> {
  await query(
    `INSERT INTO case_updates (case_id, update_text, update_date, source_url)
     VALUES ($1, $2, $3, $4)`,
    [
      caseId,
      update.updateText,
      update.updateDate ? update.updateDate.toISOString() : null,
      update.sourceUrl ?? null,
    ],
  );
  await touchCase(caseId);
  const { rows } = await query(
    `SELECT * FROM case_updates WHERE case_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  return mapUpdate(rows[0]);
}

export async function updateExistsForCase(caseId: string, sourceUrl: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT 1 FROM case_updates WHERE case_id=$1 AND source_url=$2 LIMIT 1`,
    [caseId, sourceUrl],
  );
  return rows.length > 0;
}

/* ─────────────────────────────────────────────────────────────
   RSS feeds
───────────────────────────────────────────────────────────── */
export async function getActiveRSSFeeds(): Promise<RSSFeed[]> {
  const { rows } = await query(
    `SELECT * FROM rss_feeds WHERE ${sql.activeCheck} ORDER BY feed_name`,
  );
  return rows.map(mapFeed);
}

export async function addRSSFeed(feedUrl: string, feedName: string): Promise<RSSFeed> {
  const active = isProduction ? 'TRUE' : '1';
  await query(
    `INSERT INTO rss_feeds (feed_url, feed_name, active)
     VALUES ($1, $2, ${active})
     ON CONFLICT (feed_url) DO UPDATE SET feed_name = EXCLUDED.feed_name, active = ${active}`,
    [feedUrl, feedName],
  );
  const { rows } = await query(`SELECT * FROM rss_feeds WHERE feed_url=$1`, [feedUrl]);
  return mapFeed(rows[0]);
}

export async function updateFeedLastChecked(feedId: string): Promise<void> {
  await query(`UPDATE rss_feeds SET last_checked=${sql.now} WHERE id=$1`, [feedId]);
}
