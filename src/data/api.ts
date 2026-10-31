import type { CalendarEvent } from './types'

/** Fields the app sends when creating an event. */
export type NewEvent = Omit<CalendarEvent, 'id'>

const TEAM_KEY_STORAGE = 'direborn.teamKey'

function teamKey(): string | null {
  try { return localStorage.getItem(TEAM_KEY_STORAGE) } catch { return null }
}

export function saveTeamKey(key: string) {
  try { localStorage.setItem(TEAM_KEY_STORAGE, key) } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const key = teamKey()
  if (key) headers.set('X-Team-Key', key)

  const res = await fetch(path, { ...init, headers })
  const isJson = res.headers.get('Content-Type')?.includes('application/json')
  const body = isJson ? await res.json() : null
  if (!res.ok || !isJson) {
    throw new ApiError(res.status, (body && body.error) || `Request failed (${res.status})`)
  }
  return body as T
}

export function fetchEvents(): Promise<{ events: CalendarEvent[] }> {
  return request('/api/events')
}

export function createEvent(event: NewEvent): Promise<{ event: CalendarEvent }> {
  return request('/api/events', { method: 'POST', body: JSON.stringify(event) })
}

export function deleteEvent(id: string): Promise<{ ok: true }> {
  return request(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
