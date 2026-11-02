/**
 * Accounts and sessions.
 * - Passwords: PBKDF2-SHA256, 100,000 rounds, random salt per user.
 * - Sessions: random token in an HttpOnly cookie; only its SHA-256 hash is stored.
 * - Everyone starts with password "123" and must change it on first login.
 */
import { isRole, type Role } from '../src/lib/permissions'
import { error, json, readJson, str, type D1Database } from './db'

export const DEFAULT_PASSWORD = '123'
const COOKIE = 'direborn_session'
const SESSION_DAYS = 30
const ROUNDS = 100_000
const MAX_FAILS = 5
const LOCK_MINUTES = 10

export interface UserRow {
  id: string
  username: string
  name: string
  role: string
  pass_hash: string
  must_change: number
  active: number
  failed: number
  locked_until: number | null
  created_at: string
}

export interface User { id: string; username: string; name: string; role: Role; mustChange: boolean; active: boolean }

export const toUser = (r: UserRow): User => ({
  id: r.id, username: r.username, name: r.name, role: isRole(r.role) ? r.role : 'player', mustChange: !!r.must_change, active: !!r.active,
})

const enc = new TextEncoder()
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

async function derive(password: string, salt: Uint8Array, rounds: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${ROUNDS}$${b64(salt)}$${b64(await derive(password, salt, ROUNDS))}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, rounds, salt, hash] = stored.split('$')
  if (kind !== 'pbkdf2' || !rounds || !salt || !hash) return false
  const got = new Uint8Array(await derive(password, unb64(salt), Number(rounds)))
  const want = unb64(hash)
  if (got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i]
  return diff === 0
}

const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)))

function cookie(request: Request, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

function readCookie(request: Request): string | null {
  const raw = request.headers.get('Cookie') ?? ''
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === COOKIE) return v.join('=') || null
  }
  return null
}

/** First run: create the Admin account so someone can log in and add everyone else. */
export async function bootstrapAdmin(db: D1Database) {
  const any = await db.prepare('SELECT id FROM users LIMIT 1').first()
  if (any) return
  await db.prepare('INSERT INTO users (id, username, name, role, pass_hash, must_change) VALUES (?, ?, ?, ?, ?, 1)')
    .bind(crypto.randomUUID(), 'admin', 'Manager', 'admin', await hashPassword(DEFAULT_PASSWORD)).run()
}

/** The logged-in user for this request, or null. */
export async function currentUser(db: D1Database, request: Request): Promise<User | null> {
  const token = readCookie(request)
  if (!token) return null
  const row = await db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1',
  ).bind(await sha256(token), Math.floor(Date.now() / 1000)).first<UserRow>()
  return row ? toUser(row) : null
}

async function startSession(db: D1Database, request: Request, userId: string): Promise<string> {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!)
  const now = Math.floor(Date.now() / 1000)
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), userId, now + SESSION_DAYS * 86400),
  ])
  return cookie(request, token, SESSION_DAYS * 86400)
}

/** Rules for a new password. Returns an error message or null. */
export function passwordProblem(pw: string, username: string): string | null {
  if (pw.length < 6) return 'Use at least 6 characters.'
  if (pw.length > 100) return 'That password is too long.'
  if (pw === DEFAULT_PASSWORD || /^(\d)\1+$/.test(pw) || ['123456', '1234567', '12345678', 'password', 'direborn'].includes(pw.toLowerCase())) return 'That password is too easy to guess.'
  if (pw.toLowerCase() === username.toLowerCase()) return "Don't use your username as your password."
  return null
}

/** /api/auth/* */
export async function handleAuth(request: Request, db: D1Database, action: string | undefined): Promise<Response> {
  if (action === 'login' && request.method === 'POST') {
    const body = await readJson(request)
    const username = str(body?.username, 40)?.toLowerCase()
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!username || !password) return error(400, 'Enter your username and password.')
    const row = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>()
    const now = Math.floor(Date.now() / 1000)
    if (row?.locked_until && row.locked_until > now) {
      return error(429, `Too many wrong tries. Try again in ${Math.ceil((row.locked_until - now) / 60)} min, or ask the manager to reset your password.`)
    }
    const ok = row ? await verifyPassword(password, row.pass_hash) : (await hashPassword(password), false) // same timing either way
    if (!row || !ok || !row.active) {
      if (row) {
        const failed = row.failed + 1
        await db.prepare('UPDATE users SET failed = ?, locked_until = ? WHERE id = ?')
          .bind(failed >= MAX_FAILS ? 0 : failed, failed >= MAX_FAILS ? now + LOCK_MINUTES * 60 : null, row.id).run()
      }
      return error(401, row && !row.active ? 'This account is turned off. Ask the manager.' : 'Wrong username or password.')
    }
    await db.prepare('UPDATE users SET failed = 0, locked_until = NULL WHERE id = ?').bind(row.id).run()
    const setCookie = await startSession(db, request, row.id)
    return json({ user: toUser(row) }, 200, { 'Set-Cookie': setCookie })
  }

  if (action === 'logout' && request.method === 'POST') {
    const token = readCookie(request)
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run()
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) })
  }

  const user = await currentUser(db, request)
  if (!user) return error(401, 'Please log in.')

  if (action === 'me' && request.method === 'GET') return json({ user })

  if (action === 'password' && request.method === 'POST') {
    const body = await readJson(request)
    const current = typeof body?.current === 'string' ? body.current : ''
    const next = typeof body?.next === 'string' ? body.next : ''
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<UserRow>()
    if (!row || !(await verifyPassword(current, row.pass_hash))) return error(400, 'Your current password is wrong.')
    const problem = passwordProblem(next, row.username)
    if (problem) return error(400, problem)
    if (current === next) return error(400, 'Pick a password different from the current one.')
    const token = readCookie(request)
    await db.batch([
      db.prepare('UPDATE users SET pass_hash = ?, must_change = 0 WHERE id = ?').bind(await hashPassword(next), user.id),
      // Log out other devices; keep this one.
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, token ? await sha256(token) : ''),
    ])
    return json({ user: { ...user, mustChange: false } })
  }

  return error(404, 'Not found.')
}

/** /api/users — Admin only: list, add, change role/name, turn off, reset password. */
export async function handleUsers(request: Request, db: D1Database, me: User, id: string | undefined): Promise<Response> {
  if (me.role !== 'admin') return error(403, 'Only the manager can manage people.')

  if (request.method === 'GET' && !id) {
    const { results } = await db.prepare('SELECT * FROM users ORDER BY active DESC, role, name').all<UserRow>()
    return json({ users: results.map(toUser) })
  }

  if (request.method === 'POST' && !id) {
    const body = await readJson(request)
    const name = str(body?.name, 60)
    const username = str(body?.username, 30)?.toLowerCase()
    if (!name) return error(400, 'Enter a name (max 60 characters).')
    if (!username || !/^[a-z0-9._-]{2,30}$/.test(username)) return error(400, 'Username: 2–30 letters, numbers, dot, dash or underscore. No spaces.')
    if (!isRole(body?.role)) return error(400, 'Pick a role.')
    const taken = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (taken) return error(409, 'That username is already used.')
    const newId = crypto.randomUUID()
    await db.prepare('INSERT INTO users (id, username, name, role, pass_hash, must_change) VALUES (?, ?, ?, ?, ?, 1)')
      .bind(newId, username, name, body.role, await hashPassword(DEFAULT_PASSWORD)).run()
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(newId).first<UserRow>()
    return json({ user: toUser(row!) }, 201)
  }

  if (request.method === 'PATCH' && id) {
    const body = await readJson(request)
    if (!body) return error(400, 'Invalid body.')
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
    if (!row) return error(404, 'Person not found.')
    const sets: string[] = [], binds: unknown[] = []
    if ('name' in body) {
      const name = str(body.name, 60)
      if (!name) return error(400, 'Enter a name (max 60 characters).')
      sets.push('name = ?'); binds.push(name)
    }
    if ('role' in body) {
      if (!isRole(body.role)) return error(400, 'Unknown role.')
      sets.push('role = ?'); binds.push(body.role)
    }
    if ('active' in body) {
      if (typeof body.active !== 'boolean') return error(400, 'Invalid value.')
      sets.push('active = ?'); binds.push(body.active ? 1 : 0)
    }
    const reset = body.resetPassword === true
    if (reset) { sets.push('pass_hash = ?', 'must_change = 1', 'failed = 0', 'locked_until = NULL'); binds.push(await hashPassword(DEFAULT_PASSWORD)) }
    if (!sets.length) return error(400, 'Nothing to update.')

    // Never leave the app without an active Admin.
    const losesAdmin = row.role === 'admin' && row.active && (('role' in body && body.role !== 'admin') || body.active === false)
    if (losesAdmin) {
      const others = await db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id != ?").bind(id).first<{ n: number }>()
      if (!others?.n) return error(400, 'There must always be at least one active manager (Admin).')
    }

    const stmts = [db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...binds, id)]
    if (reset || body.active === false || 'role' in body) stmts.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id))
    await db.batch(stmts)
    const updated = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>()
    return json({ user: toUser(updated!) })
  }

  return error(405, 'Method not allowed.')
}
