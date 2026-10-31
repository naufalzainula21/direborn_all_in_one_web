/**
 * Direborn API Worker.
 * - /api/*  → JSON API backed by Cloudflare D1 (binding: DB)
 * - else    → the React app (static assets, binding: ASSETS)
 *
 * Optional secret TEAM_KEY: when set, creating or deleting events
 * requires the header `X-Team-Key: <TEAM_KEY>`.
 */

// Minimal Cloudflare types so this file needs no extra packages.
interface D1Result<T> { results: T[] }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = unknown>(): Promise<D1Result<T>>
  first<T = unknown>(): Promise<T | null>
  run(): Promise<{ meta: { changes: number } }>
}
interface D1Database {
  prepare(query: string): D1PreparedStatement
}
interface Fetcher { fetch(request: Request): Promise<Response> }

interface Env {
  DB?: D1Database
  ASSETS: Fetcher
  TEAM_KEY?: string
}

const TYPES = ['tournament', 'scrim', 'practice', 'other'] as const
const STATUSES = ['confirmed', 'pending', 'played'] as const

interface EventRow {
  id: string
  date: string
  time: string
  type: string
  title: string
  detail: string
  opponent: string | null
  status: string | null
  notes: string | null
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
]

let schemaReady: Promise<unknown> | null = null
/** Create the table on first use, once per Worker instance. */
function ensureSchema(db: D1Database) {
  schemaReady ??= (async () => {
    for (const sql of SCHEMA) await db.prepare(sql).run()
  })().catch((err) => {
    schemaReady = null
    throw err
  })
  return schemaReady
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

const error = (status: number, message: string) => json({ error: message }, status)

function toEvent(r: EventRow) {
  return {
    id: r.id,
    date: r.date,
    time: r.time,
    type: r.type,
    title: r.title,
    detail: r.detail,
    ...(r.opponent ? { opponent: r.opponent } : {}),
    ...(r.status ? { status: r.status } : {}),
    ...(r.notes ? { notes: r.notes } : {}),
  }
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length <= max ? s : null
}

/** Validate a POST body; returns the row or an error message. */
function parseEvent(body: unknown): Omit<EventRow, 'id'> | string {
  if (!body || typeof body !== 'object') return 'Invalid body.'
  const b = body as Record<string, unknown>
  const type = b.type as (typeof TYPES)[number]
  if (!TYPES.includes(type)) return 'Unknown event type.'
  const date = str(b.date, 10)
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date must be YYYY-MM-DD.'
  const time = str(b.time, 5)
  if (!time || !(time === 'TBD' || /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return 'Time must be HH:MM or TBD.'
  const title = str(b.title, 100)
  if (!title) return 'Title is required (max 100 characters).'
  const detail = b.detail == null ? '' : str(b.detail, 200)
  if (detail === null) return 'Detail is too long.'
  const opponent = b.opponent == null ? null : str(b.opponent, 60)
  if (b.opponent != null && opponent === null) return 'Opponent is too long.'
  const status = b.status == null ? null : (b.status as string)
  if (status !== null && !STATUSES.includes(status as (typeof STATUSES)[number])) return 'Unknown status.'
  const notes = b.notes == null ? null : str(b.notes, 500)
  if (b.notes != null && notes === null) return 'Notes are too long (max 500 characters).'
  return { date, time, type, title, detail, opponent: opponent || null, status, notes: notes || null }
}

function authorized(request: Request, env: Env): boolean {
  if (!env.TEAM_KEY) return true
  return request.headers.get('X-Team-Key') === env.TEAM_KEY
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return error(503, 'Database not connected.')
  await ensureSchema(env.DB)

  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean) // ['api', 'events', id?]
  if (parts[1] !== 'events' || parts.length > 3) return error(404, 'Not found.')
  const id = parts[2]

  if (request.method === 'GET' && !id) {
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let sql = 'SELECT * FROM events'
    const binds: string[] = []
    if (from && to) { sql += ' WHERE date BETWEEN ? AND ?'; binds.push(from, to) }
    sql += ' ORDER BY date, time LIMIT 2000'
    const { results } = await env.DB.prepare(sql).bind(...binds).all<EventRow>()
    return json({ events: results.map(toEvent) })
  }

  if (request.method === 'POST' && !id) {
    if (!authorized(request, env)) return error(401, 'Team code required.')
    let body: unknown
    try { body = await request.json() } catch { return error(400, 'Body must be JSON.') }
    const parsed = parseEvent(body)
    if (typeof parsed === 'string') return error(400, parsed)
    const newId = crypto.randomUUID()
    await env.DB.prepare(
      'INSERT INTO events (id, date, time, type, title, detail, opponent, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(newId, parsed.date, parsed.time, parsed.type, parsed.title, parsed.detail, parsed.opponent, parsed.status, parsed.notes).run()
    return json({ event: toEvent({ id: newId, ...parsed }) }, 201)
  }

  if (request.method === 'DELETE' && id) {
    if (!authorized(request, env)) return error(401, 'Team code required.')
    const { meta } = await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run()
    if (!meta.changes) return error(404, 'Event not found.')
    return json({ ok: true })
  }

  return error(405, 'Method not allowed.')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url)
      } catch (err) {
        console.error(err)
        return error(500, 'Something went wrong on the server.')
      }
    }
    return env.ASSETS.fetch(request)
  },
}
