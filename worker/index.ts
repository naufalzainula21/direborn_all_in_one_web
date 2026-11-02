/**
 * Direborn API Worker.
 * - /api/*  → JSON API backed by Cloudflare D1 (binding: DB). Everything needs a login.
 * - else    → the React app (static assets, binding: ASSETS)
 * - cron    → refreshes imported Liquipedia tournaments (times, scores, standings)
 */
import {
  canAddType, canEditEvent, canEditTeamGoals, canEnterResults, canImport, canSeeAllPersonalGoals, hasPersonalGoals, type EventKind,
} from '../src/lib/permissions'
import { bootstrapAdmin, currentUser, handleAuth, handleUsers, type User } from './auth'
import { ensureSchema, error, json, readJson, str, type D1Database, type Env } from './db'
import { fetchTournament, LiquipediaError, pageFromInput, searchTournaments, setApiBase, type TournamentData } from './liquipedia'

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
  score_us?: number | null
  score_them?: number | null
  match_ids?: string | null
  created_by?: string | null
  updated_by?: string | null
  source_page?: string | null
  source_key?: string | null
  added_by_name?: string | null
}

const EVENT_SELECT = 'SELECT e.*, u.name AS added_by_name FROM events e LEFT JOIN users u ON u.id = e.created_by'

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
    ...(r.score_us != null && r.score_them != null ? { scoreUs: r.score_us, scoreThem: r.score_them } : {}),
    ...(r.match_ids ? { matchIds: r.match_ids.split(',') } : {}),
    ...(r.created_by ? { createdBy: r.created_by } : {}),
    ...(r.added_by_name ? { addedBy: r.added_by_name } : {}),
    ...(r.source_page ? { importedFrom: r.source_page } : {}),
  }
}

/** Validate a PATCH body: status, result (scoreUs/scoreThem), matchIds, notes. null clears a field. */
function parsePatch(b: Record<string, unknown>): Record<string, unknown> | string {
  const out: Record<string, unknown> = {}
  if ('status' in b) {
    if (b.status !== null && !STATUSES.includes(b.status as (typeof STATUSES)[number])) return 'Unknown status.'
    out.status = b.status
  }
  if ('scoreUs' in b || 'scoreThem' in b) {
    const us = b.scoreUs, them = b.scoreThem
    if (us === null && them === null) { out.score_us = null; out.score_them = null }
    else {
      const ok = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 9
      if (!ok(us) || !ok(them)) return 'Scores must be whole numbers from 0 to 9.'
      out.score_us = us; out.score_them = them
    }
  }
  if ('matchIds' in b) {
    if (b.matchIds === null) out.match_ids = null
    else {
      if (!Array.isArray(b.matchIds) || b.matchIds.length > 9) return 'Up to 9 match IDs.'
      const ids = b.matchIds.map((x) => String(x).trim()).filter(Boolean)
      if (!ids.every((x) => /^\d{6,12}$/.test(x))) return 'Match IDs must be numbers (6–12 digits).'
      out.match_ids = ids.length ? ids.join(',') : null
    }
  }
  if ('notes' in b) {
    const notes = b.notes == null ? null : str(b.notes, 500)
    if (b.notes != null && notes === null) return 'Notes are too long (max 500 characters).'
    out.notes = notes || null
  }
  if (Object.keys(out).length === 0) return 'Nothing to update.'
  return out
}

/** Validate a POST body; returns the row or an error message. */
function parseEvent(b: Record<string, unknown>): Omit<EventRow, 'id'> | string {
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

async function handleEvents(request: Request, db: D1Database, me: User, id: string | undefined, url: URL): Promise<Response> {
  if (request.method === 'GET' && !id) {
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let sql = EVENT_SELECT
    const binds: string[] = []
    if (from && to) { sql += ' WHERE e.date BETWEEN ? AND ?'; binds.push(from, to) }
    sql += ' ORDER BY e.date, e.time LIMIT 2000'
    const { results } = await db.prepare(sql).bind(...binds).all<EventRow>()
    return json({ events: results.map(toEvent) })
  }

  if (request.method === 'POST' && !id) {
    const body = await readJson(request)
    if (!body) return error(400, 'Body must be JSON.')
    const parsed = parseEvent(body)
    if (typeof parsed === 'string') return error(400, parsed)
    if (!canAddType(me.role, parsed.type as EventKind)) {
      return error(403, me.role === 'creative' ? 'The creative team can add activities only.' : 'Your role can’t add schedule entries.')
    }
    const newId = crypto.randomUUID()
    await db.prepare(
      'INSERT INTO events (id, date, time, type, title, detail, opponent, status, notes, created_by, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))',
    ).bind(newId, parsed.date, parsed.time, parsed.type, parsed.title, parsed.detail, parsed.opponent, parsed.status, parsed.notes, me.id, me.id).run()
    const row = await db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).bind(newId).first<EventRow>()
    return json({ event: toEvent(row!) }, 201)
  }

  if (!id) return error(405, 'Method not allowed.')
  const row = await db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<EventRow>()
  if (!row) return error(404, 'Event not found.')
  const allowed = canEditEvent(me, { type: row.type, createdBy: row.created_by })

  if (request.method === 'PATCH') {
    const body = await readJson(request)
    if (!body) return error(400, 'Body must be JSON.')
    const patch = parsePatch(body)
    if (typeof patch === 'string') return error(400, patch)
    const touchesResult = 'score_us' in patch || 'match_ids' in patch
    if (touchesResult ? !canEnterResults(me.role) : !allowed) {
      return error(403, touchesResult ? 'Only the manager and coach can enter results.' : 'You can only change entries you added.')
    }
    const cols = Object.keys(patch)
    await db.prepare(`UPDATE events SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(...cols.map((c) => patch[c]), me.id, id).run()
    const updated = await db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).bind(id).first<EventRow>()
    return json({ event: updated ? toEvent(updated) : null })
  }

  if (request.method === 'DELETE') {
    if (!allowed) return error(403, 'You can only delete entries you added.')
    // An imported match that is deleted should not come back on the next refresh.
    if (row.source_page && row.source_key) {
      const t = await db.prepare('SELECT skipped FROM tournaments WHERE page = ?').bind(row.source_page).first<{ skipped: string }>()
      if (t) {
        const skipped = new Set<string>(JSON.parse(t.skipped))
        skipped.add(row.source_key)
        await db.prepare('UPDATE tournaments SET skipped = ? WHERE page = ?').bind(JSON.stringify([...skipped]), row.source_page).run()
      }
    }
    await db.prepare('DELETE FROM events WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }

  return error(405, 'Method not allowed.')
}

// ---------- Goals ----------

interface GoalRow { id: string; scope: string; user_id: string | null; title: string; detail: string; due: string | null; status: string; created_at: string; updated_at: string; owner_name?: string | null }
interface CommentRow { id: string; goal_id: string; user_id: string; body: string; created_at: string; author?: string | null; author_role?: string | null }

async function handleGoals(request: Request, db: D1Database, me: User, id: string | undefined, sub: string | undefined): Promise<Response> {
  const seeAll = canSeeAllPersonalGoals(me.role)

  if (request.method === 'GET' && !id) {
    const personalFilter = seeAll ? "OR g.scope = 'personal'" : hasPersonalGoals(me.role) ? "OR (g.scope = 'personal' AND g.user_id = ?)" : ''
    const sql = `SELECT g.*, u.name AS owner_name FROM goals g LEFT JOIN users u ON u.id = g.user_id WHERE g.scope = 'team' ${personalFilter} ORDER BY g.status, COALESCE(g.due, '9999'), g.created_at`
    const stmt = db.prepare(sql)
    const { results } = await (personalFilter.includes('?') ? stmt.bind(me.id) : stmt).all<GoalRow>()
    const ids = results.filter((g) => g.scope === 'personal').map((g) => g.id)
    let comments: CommentRow[] = []
    if (ids.length) {
      const q = `SELECT c.*, u.name AS author, u.role AS author_role FROM goal_comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.goal_id IN (${ids.map(() => '?').join(',')}) ORDER BY c.created_at`
      comments = (await db.prepare(q).bind(...ids).all<CommentRow>()).results
    }
    return json({
      goals: results.map((g) => ({
        id: g.id, scope: g.scope, userId: g.user_id, owner: g.owner_name ?? null, title: g.title, detail: g.detail, due: g.due, status: g.status, updatedAt: g.updated_at,
        comments: comments.filter((c) => c.goal_id === g.id).map((c) => ({ id: c.id, author: c.author ?? 'Someone', authorRole: c.author_role, body: c.body, createdAt: c.created_at, mine: c.user_id === me.id })),
      })),
    })
  }

  const parseGoal = (b: Record<string, unknown>, partial: boolean) => {
    const out: Record<string, unknown> = {}
    if (!partial || 'title' in b) {
      const t = str(b.title, 120)
      if (!t) return 'Write the goal (max 120 characters).'
      out.title = t
    }
    if ('detail' in b) {
      const d = b.detail == null ? '' : str(b.detail, 600)
      if (d === null) return 'Details are too long (max 600 characters).'
      out.detail = d
    }
    if ('due' in b) {
      if (b.due !== null && b.due !== '' && !(typeof b.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.due))) return 'Deadline must be a date.'
      out.due = b.due || null
    }
    if ('status' in b) {
      if (b.status !== 'active' && b.status !== 'done') return 'Unknown status.'
      out.status = b.status
    }
    return out
  }

  if (request.method === 'POST' && !id) {
    const body = await readJson(request)
    if (!body) return error(400, 'Body must be JSON.')
    const scope = body.scope
    if (scope === 'team' && !canEditTeamGoals(me.role)) return error(403, 'Only the manager and coach set team goals.')
    if (scope === 'personal' && !hasPersonalGoals(me.role)) return error(403, 'Personal goals are for players.')
    if (scope !== 'team' && scope !== 'personal') return error(400, 'Unknown goal type.')
    const g = parseGoal(body, false)
    if (typeof g === 'string') return error(400, g)
    const newId = crypto.randomUUID()
    await db.prepare('INSERT INTO goals (id, scope, user_id, title, detail, due, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(newId, scope, scope === 'personal' ? me.id : null, g.title, g.detail ?? '', g.due ?? null, me.id).run()
    return json({ id: newId }, 201)
  }

  if (!id) return error(405, 'Method not allowed.')
  const goal = await db.prepare('SELECT * FROM goals WHERE id = ?').bind(id).first<GoalRow>()
  const canSee = goal && (goal.scope === 'team' || goal.user_id === me.id || seeAll)
  if (!goal || !canSee) return error(404, 'Goal not found.')
  const canEdit = goal.scope === 'team' ? canEditTeamGoals(me.role) : goal.user_id === me.id

  if (sub === 'comments' && request.method === 'POST') {
    if (goal.scope !== 'personal') return error(400, 'Comments are for personal goals.')
    const body = await readJson(request)
    const text = str(body?.body, 600)
    if (!text) return error(400, 'Write a comment (max 600 characters).')
    await db.prepare('INSERT INTO goal_comments (id, goal_id, user_id, body) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), id, me.id, text).run()
    return json({ ok: true }, 201)
  }

  if (request.method === 'PATCH' && !sub) {
    if (!canEdit) return error(403, goal.scope === 'team' ? 'Only the manager and coach edit team goals.' : 'Only the player can edit their own goal.')
    const body = await readJson(request)
    if (!body) return error(400, 'Body must be JSON.')
    const g = parseGoal(body, true)
    if (typeof g === 'string') return error(400, g)
    const cols = Object.keys(g)
    if (!cols.length) return error(400, 'Nothing to update.')
    await db.prepare(`UPDATE goals SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...cols.map((c) => g[c]), id).run()
    return json({ ok: true })
  }

  if (request.method === 'DELETE' && !sub) {
    if (!canEdit) return error(403, 'You can’t delete this goal.')
    await db.batch([db.prepare('DELETE FROM goal_comments WHERE goal_id = ?').bind(id), db.prepare('DELETE FROM goals WHERE id = ?').bind(id)])
    return json({ ok: true })
  }

  return error(405, 'Method not allowed.')
}

// ---------- Tournaments (Liquipedia import) ----------

const userAgent = (env: Env) => {
  if (env.LP_API) setApiBase(env.LP_API)
  return `DirebornTeamApp/1.0 (${env.LP_CONTACT || 'https://github.com/naufalzainula21/direborn_all_in_one_web'})`
}

/** Short-lived cache so preview → import doesn't fetch the page twice. */
const cache = new Map<string, { at: number; data: TournamentData }>()
async function getTournament(env: Env, page: string, fresh = false): Promise<TournamentData> {
  const hit = cache.get(page)
  if (!fresh && hit && Date.now() - hit.at < 10 * 60_000) return hit.data
  const data = await fetchTournament(page, userAgent(env))
  cache.set(data.page, { at: Date.now(), data })
  if (data.page !== page) cache.set(page, { at: Date.now(), data })
  return data
}

const matchDetail = (stage: string, opponent: string, bestOf: number) => `${stage} vs ${opponent} · Bo${bestOf}`

function summaryOf(data: TournamentData) {
  const { matches: _all, ...summary } = data
  void _all
  return summary
}

/** Save the tournament and add/update Direborn's matches. `pick` = keys chosen in the preview (first import only). */
export async function syncTournament(db: D1Database, data: TournamentData, userId: string | null, pick: string[] | null) {
  const stored = await db.prepare('SELECT skipped FROM tournaments WHERE page = ?').bind(data.page).first<{ skipped: string }>()
  const skipped = new Set<string>(stored ? JSON.parse(stored.skipped) : [])
  if (pick) for (const m of data.direborn) { if (pick.includes(m.key)) skipped.delete(m.key); else skipped.add(m.key) }
  const stmts = [
    db.prepare(`INSERT INTO tournaments (page, name, start_date, end_date, data, skipped, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(page) DO UPDATE SET name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date, data = excluded.data, skipped = excluded.skipped, updated_at = datetime('now')`)
      .bind(data.page, data.name, data.startDate, data.endDate, JSON.stringify(summaryOf(data)), JSON.stringify([...skipped]), userId),
  ]
  const { results: existing } = await db.prepare('SELECT id, source_key FROM events WHERE source_page = ?').bind(data.page).all<{ id: string; source_key: string }>()
  const byKey = new Map(existing.map((e) => [e.source_key, e.id]))
  let added = 0, updated = 0
  for (const m of data.direborn) {
    const status = m.finished ? 'played' : null
    const detail = matchDetail(m.stage, m.opponent, m.bestOf)
    const opponent = m.opponent === 'TBD' ? null : m.opponent
    const id = byKey.get(m.key)
    if (id) {
      stmts.push(db.prepare('UPDATE events SET date = ?, time = ?, title = ?, detail = ?, opponent = ?, status = ?, score_us = ?, score_them = ? WHERE id = ?')
        .bind(m.date, m.time, data.name, detail, opponent, status, m.scoreUs, m.scoreThem, id))
      updated++
    } else if (!skipped.has(m.key)) {
      stmts.push(db.prepare(`INSERT INTO events (id, date, time, type, title, detail, opponent, status, score_us, score_them, created_by, updated_by, updated_at, source_page, source_key)
        VALUES (?, ?, ?, 'tournament', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`)
        .bind(crypto.randomUUID(), m.date, m.time, data.name, detail, opponent, status, m.scoreUs, m.scoreThem, userId, userId, data.page, m.key))
      added++
    }
  }
  await db.batch(stmts)
  return { added, updated }
}

interface TournamentRow { page: string; name: string; start_date: string | null; end_date: string | null; data: string; skipped: string; updated_at: string }

async function handleTournaments(request: Request, env: Env, db: D1Database, me: User, url: URL, parts: string[]): Promise<Response> {
  const action = parts[2]

  // Imported tournaments with standings and bracket (everyone).
  if (parts[1] === 'tournaments' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM tournaments ORDER BY COALESCE(start_date, updated_at) DESC LIMIT 20').all<TournamentRow>()
    return json({ tournaments: results.map((r) => ({ ...JSON.parse(r.data), updatedAt: r.updated_at })) })
  }
  if (parts[1] === 'tournaments' && request.method === 'DELETE' && action) {
    if (!canImport(me.role)) return error(403, 'Your role can’t change imported tournaments.')
    await db.prepare('DELETE FROM tournaments WHERE page = ?').bind(decodeURIComponent(action)).run()
    return json({ ok: true })
  }

  if (parts[1] !== 'lp') return error(404, 'Not found.')
  if (!canImport(me.role)) return error(403, 'Your role can’t import tournaments.')

  try {
    if (action === 'search' && request.method === 'GET') {
      const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100)
      if (q.length < 2) return json({ results: [] })
      if (/liquipedia\.net/.test(q)) {
        const page = pageFromInput(q)
        return json({ results: page ? [{ page, title: page.replace(/_/g, ' ').split('/').join(' · ') }] : [] })
      }
      return json({ results: await searchTournaments(q, userAgent(env)) })
    }

    if (action === 'preview' && request.method === 'GET') {
      const page = pageFromInput(url.searchParams.get('page') ?? '')
      if (!page) return error(400, 'Pick a tournament.')
      const data = await getTournament(env, page)
      const { results } = await db.prepare('SELECT source_key FROM events WHERE source_page = ?').bind(data.page).all<{ source_key: string }>()
      return json({ tournament: summaryOf(data), imported: results.map((r) => r.source_key) })
    }

    if (action === 'import' && request.method === 'POST') {
      const body = await readJson(request)
      const page = pageFromInput(String(body?.page ?? ''))
      const keys = Array.isArray(body?.keys) ? body.keys.filter((k): k is string => typeof k === 'string').slice(0, 100) : null
      if (!page || !keys) return error(400, 'Pick a tournament and the matches to add.')
      const data = await getTournament(env, page)
      return json(await syncTournament(db, data, me.id, keys))
    }

    if (action === 'refresh' && request.method === 'POST') {
      const body = await readJson(request)
      const page = pageFromInput(String(body?.page ?? ''))
      if (!page) return error(400, 'Pick a tournament.')
      const known = await db.prepare('SELECT page FROM tournaments WHERE page = ?').bind(page).first()
      if (!known) return error(404, 'That tournament isn’t imported.')
      return json(await syncTournament(db, await getTournament(env, page, true), null, null))
    }
  } catch (err) {
    if (err instanceof LiquipediaError) return error(502, err.message)
    throw err
  }

  return error(404, 'Not found.')
}

/** Cron: refresh tournaments that are running (or about to). Max 4 per run to stay polite. */
async function refreshActive(env: Env) {
  if (!env.DB) return
  const db = env.DB
  await ensureSchema(db, () => bootstrapAdmin(db))
  const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
  const { results } = await db.prepare(
    `SELECT page FROM tournaments WHERE (start_date IS NULL OR start_date <= date(?, '+3 day')) AND (end_date IS NULL OR end_date >= date(?, '-2 day'))
     ORDER BY updated_at LIMIT 4`,
  ).bind(today, today).all<{ page: string }>()
  for (const { page } of results) {
    try { await syncTournament(db, await getTournament(env, page, true), null, null) }
    catch (err) { console.error('refresh failed', page, err) }
  }
}

// ---------- Router ----------

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.DB) return error(503, 'Database not connected.')
  const db = env.DB
  await ensureSchema(db, () => bootstrapAdmin(db))

  // Writes must be JSON (blocks plain cross-site form posts).
  if (['POST', 'PATCH'].includes(request.method) && !request.headers.get('Content-Type')?.includes('application/json')) {
    return error(415, 'Send JSON.')
  }

  const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean) // ['api', resource, id?, sub?]
  if (parts[1] === 'auth') return handleAuth(request, db, parts[2])

  const me = await currentUser(db, request)
  if (!me) return error(401, 'Please log in.')
  if (me.mustChange) return error(403, 'Change your password first.')

  switch (parts[1]) {
    case 'events': return parts.length > 3 ? error(404, 'Not found.') : handleEvents(request, db, me, parts[2], url)
    case 'users': return handleUsers(request, db, me, parts[2])
    case 'goals': return handleGoals(request, db, me, parts[2], parts[3])
    case 'tournaments':
    case 'lp': return handleTournaments(request, env, db, me, url, parts)
  }
  return error(404, 'Not found.')
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
  async scheduled(_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    ctx.waitUntil(refreshActive(env))
  },
}
