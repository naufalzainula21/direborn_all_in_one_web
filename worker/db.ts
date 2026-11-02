// Minimal Cloudflare types so the Worker needs no extra packages.
export interface D1Result<T> { results: T[] }
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = unknown>(): Promise<D1Result<T>>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ meta: { changes: number } }>
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>
}
export interface Fetcher { fetch(request: Request): Promise<Response> }

export interface Env {
  DB?: D1Database
  ASSETS: Fetcher
  /** Contact shown to Liquipedia in the User-Agent (a URL or email). */
  LP_CONTACT?: string
  /** Local testing only: stand-in for Liquipedia's api.php. */
  LP_API?: string
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    opponent TEXT,
    status TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  'CREATE INDEX IF NOT EXISTS events_date ON events (date, time)',
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    pass_hash TEXT NOT NULL,
    must_change INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    failed INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)',
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    due TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS goal_comments (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tournaments (
    page TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    data TEXT NOT NULL,
    skipped TEXT NOT NULL DEFAULT '[]',
    created_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
]

/** Columns added after the first release; ALTER fails harmlessly if they already exist. */
const MIGRATIONS = [
  'ALTER TABLE events ADD COLUMN score_us INTEGER',
  'ALTER TABLE events ADD COLUMN score_them INTEGER',
  'ALTER TABLE events ADD COLUMN match_ids TEXT',
  'ALTER TABLE events ADD COLUMN created_by TEXT',
  'ALTER TABLE events ADD COLUMN updated_by TEXT',
  'ALTER TABLE events ADD COLUMN updated_at TEXT',
  /** Liquipedia page + match key for imported tournament matches. */
  'ALTER TABLE events ADD COLUMN source_page TEXT',
  'ALTER TABLE events ADD COLUMN source_key TEXT',
]

let schemaReady: Promise<unknown> | null = null
/** Create tables on first use, once per Worker instance. */
export function ensureSchema(db: D1Database, onFirstRun: () => Promise<void>) {
  schemaReady ??= (async () => {
    for (const sql of SCHEMA) await db.prepare(sql).run()
    for (const sql of MIGRATIONS) {
      try { await db.prepare(sql).run() } catch { /* column already exists */ }
    }
    await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS events_source ON events (source_page, source_key)').run()
    await onFirstRun()
  })().catch((err) => {
    schemaReady = null
    throw err
  })
  return schemaReady
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

export const error = (status: number, message: string) => json({ error: message }, status)

export function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length <= max ? s : null
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json()
    return b && typeof b === 'object' && !Array.isArray(b) ? b as Record<string, unknown> : null
  } catch { return null }
}
