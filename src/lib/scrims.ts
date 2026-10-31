import type { CalendarEvent } from '../data/types'
import { startISO } from './schedule'

export type ScrimOutcome = 'win' | 'loss' | 'draw'

export const hasResult = (e: CalendarEvent) => e.scoreUs != null && e.scoreThem != null

export function outcomeOf(e: CalendarEvent): ScrimOutcome | null {
  if (!hasResult(e)) return null
  return e.scoreUs! > e.scoreThem! ? 'win' : e.scoreUs! < e.scoreThem! ? 'loss' : 'draw'
}

export const OUTCOME_LABEL: Record<ScrimOutcome, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' }
export const OUTCOME_TONE: Record<ScrimOutcome, string> = { win: 'win', loss: 'loss', draw: 'neutral' }

/** Bo3 → 3, used to pre-fill and validate the score */
export const bestOf = (e: CalendarEvent) => Number(e.detail.match(/Bo(\d)/)?.[1] ?? 3)

/** Has the scrim started (so a result can be recorded)? */
export const isPast = (e: CalendarEvent, now: Date) => new Date(startISO(e)).getTime() <= now.getTime()

export const opponentOf = (e: CalendarEvent) => e.opponent ?? e.title.replace(/^Scrim vs /, '')
