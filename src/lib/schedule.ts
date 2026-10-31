import type { CalendarEvent } from '../data/types'
import { parseDay } from './format'

const MATCH_LENGTH_MS = 3 * 60 * 60 * 1000 // keep showing a match for ~3h after it starts

/** Start time as an ISO string in WIB. 'TBD' counts as end of day. */
export function startISO(e: CalendarEvent): string {
  const time = e.time === 'TBD' ? '23:59' : e.time
  return `${e.date}T${time}:00+07:00`
}

/** Next tournament match that hasn't finished yet. */
export function nextTournamentMatch(events: CalendarEvent[], now: Date): CalendarEvent | undefined {
  const cutoff = now.getTime() - MATCH_LENGTH_MS
  return events.find((e) => e.type === 'tournament' && new Date(startISO(e)).getTime() >= cutoff)
}

export function formatOf(e: CalendarEvent): string | undefined {
  return e.detail.match(/\bBo\d\b/)?.[0]
}

/** The part of the detail before " vs " / " · ", e.g. "Group stage R1". */
export function stageOf(e: CalendarEvent): string | undefined {
  const s = e.detail.split(' · ')[0].split(' vs ')[0].trim()
  return s && !/^Bo\d$/.test(s) ? s : undefined
}

export interface TournamentSummary {
  name: string
  first: CalendarEvent
  matches: CalendarEvent[]
  dates: string
}

/** Summary of the tournament the next match belongs to. */
export function nextTournamentSummary(events: CalendarEvent[], now: Date): TournamentSummary | undefined {
  const first = nextTournamentMatch(events, now)
  if (!first) return undefined
  const matches = events.filter((e) => e.type === 'tournament' && e.title === first.title && e.date >= first.date)
  const fmt = (iso: string) => parseDay(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const last = matches[matches.length - 1]
  const dates = last.date === first.date ? fmt(first.date) : `${fmt(first.date)} – ${fmt(last.date)}`
  return { name: first.title, first, matches, dates }
}
