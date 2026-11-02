import type { Role } from '../lib/permissions'
import type { CalendarEvent } from './types'

/** Fields the app sends when creating an event. */
export type NewEvent = Omit<CalendarEvent, 'id'>

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Called when the server says the session is gone, so the app can show the login screen. */
let onSignedOut: (() => void) | null = null
export const setSignedOutHandler = (fn: (() => void) | null) => { onSignedOut = fn }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  const isJson = res.headers.get('Content-Type')?.includes('application/json')
  const body = isJson ? await res.json() : null
  if (!res.ok || !isJson) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) onSignedOut?.()
    throw new ApiError(res.status, (body && body.error) || `Request failed (${res.status})`)
  }
  return body as T
}

const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) })
const patch = <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

// ---------- Auth & people ----------

export interface User { id: string; username: string; name: string; role: Role; mustChange: boolean; active: boolean }

export const fetchMe = () => request<{ user: User }>('/api/auth/me')
export const login = (username: string, password: string) => post<{ user: User }>('/api/auth/login', { username, password })
export const logout = () => post<{ ok: true }>('/api/auth/logout', {})
export const changePassword = (current: string, next: string) => post<{ user: User }>('/api/auth/password', { current, next })

export const fetchUsers = () => request<{ users: User[] }>('/api/users')
export const createUser = (u: { name: string; username: string; role: Role }) => post<{ user: User }>('/api/users', u)
export const updateUser = (id: string, p: Partial<{ name: string; role: Role; active: boolean; resetPassword: true }>) =>
  patch<{ user: User }>(`/api/users/${encodeURIComponent(id)}`, p)

// ---------- Schedule ----------

export function fetchEvents(): Promise<{ events: CalendarEvent[] }> {
  return request('/api/events')
}

export function createEvent(event: NewEvent): Promise<{ event: CalendarEvent }> {
  return post('/api/events', event)
}

export interface EventPatch {
  status?: 'confirmed' | 'pending' | 'played' | null
  scoreUs?: number | null
  scoreThem?: number | null
  matchIds?: string[] | null
  notes?: string | null
}

export function updateEvent(id: string, p: EventPatch): Promise<{ event: CalendarEvent }> {
  return patch(`/api/events/${encodeURIComponent(id)}`, p)
}

export function deleteEvent(id: string): Promise<{ ok: true }> {
  return del(`/api/events/${encodeURIComponent(id)}`)
}

// ---------- Goals ----------

export interface GoalComment { id: string; author: string; authorRole: string | null; body: string; createdAt: string; mine: boolean }
export interface Goal {
  id: string
  scope: 'team' | 'personal'
  userId: string | null
  owner: string | null
  title: string
  detail: string
  due: string | null
  status: 'active' | 'done'
  updatedAt: string
  comments: GoalComment[]
}
export type GoalInput = { title: string; detail?: string; due?: string | null }

export const fetchGoals = () => request<{ goals: Goal[] }>('/api/goals')
export const createGoal = (scope: Goal['scope'], g: GoalInput) => post<{ id: string }>('/api/goals', { scope, ...g })
export const updateGoal = (id: string, g: Partial<GoalInput & { status: Goal['status'] }>) => patch<{ ok: true }>(`/api/goals/${id}`, g)
export const deleteGoal = (id: string) => del<{ ok: true }>(`/api/goals/${id}`)
export const commentGoal = (id: string, body: string) => post<{ ok: true }>(`/api/goals/${id}/comments`, { body })

// ---------- Tournaments (Liquipedia) ----------

export interface LpMatch { key: string; stage: string; round: string; date: string | null; time: string; team1: string; team2: string; score1: number; score2: number; bestOf: number; finished: boolean }
export interface StandingRow { team: string; played: number; w: number; d: number; l: number; gw: number; gl: number; pts: number; us: boolean }
export interface StandingGroup { name: string; rows: StandingRow[]; showPoints: boolean }
export interface DirebornMatch { key: string; date: string; time: string; opponent: string; stage: string; bestOf: number; scoreUs: number | null; scoreThem: number | null; finished: boolean }
export interface TournamentData {
  page: string
  name: string
  url: string
  startDate: string | null
  endDate: string | null
  prize: string | null
  format: string | null
  type: string | null
  teams: string[]
  groups: StandingGroup[]
  bracket: { name: string; matches: LpMatch[] }[]
  direborn: DirebornMatch[]
  participating: boolean
  fetchedAt: string
  updatedAt?: string
}

export const searchLiquipedia = (q: string) => request<{ results: { page: string; title: string }[] }>(`/api/lp/search?q=${encodeURIComponent(q)}`)
export const previewTournament = (page: string) => request<{ tournament: TournamentData; imported: string[] }>(`/api/lp/preview?page=${encodeURIComponent(page)}`)
export const importTournament = (page: string, keys: string[]) => post<{ added: number; updated: number }>('/api/lp/import', { page, keys })
export const refreshTournament = (page: string) => post<{ added: number; updated: number }>('/api/lp/refresh', { page })
export const fetchTournaments = () => request<{ tournaments: TournamentData[] }>('/api/tournaments')
