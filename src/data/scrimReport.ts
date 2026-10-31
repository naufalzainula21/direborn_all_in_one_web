import raw from './scrim-report.json'
import type { CalendarEvent } from './types'

/** One game from the team's scrim report sheet. */
export interface ReportGame {
  side: 'Radiant' | 'Dire' | null
  pick: '1st' | '2nd' | null
  result: 'W' | 'L' | null
  /** Kill score as written in the sheet (Radiant–Dire). */
  kills: string | null
  matchId: string | null
  vod: string | null
  note: string | null
  status: 'played' | 'cancelled' | 'not-played'
}

export interface ReportSeries {
  key: string
  date: string
  opp: string
  phase: string
  w: number
  l: number
  games: ReportGame[]
}

export interface ReportPhase { id: string; label: string }

const data = raw as { phases: ReportPhase[]; series: ReportSeries[] }

export const reportPhases = data.phases
/** Newest first. */
export const reportSeries: ReportSeries[] = [...data.series].sort((a, b) => b.date.localeCompare(a.date) || b.key.localeCompare(a.key))

const SHORT: Record<string, string> = { 'blast-prep': 'BLAST prep', 'new-roster': 'New roster', original: 'Original' }
export const phaseShort = (id: string) => SHORT[id] ?? id
export const phaseLabel = (id: string) => reportPhases.find((p) => p.id === id)?.label ?? id

/** Report scrims as read-only schedule events, so every page and the scrim record include them. */
export function reportEvents(list: ReportSeries[] = reportSeries): CalendarEvent[] {
  return list
    .filter((s) => s.w + s.l > 0)
    .map((s) => ({
      id: `report-${s.key}`,
      date: s.date,
      time: 'TBD',
      type: 'scrim' as const,
      title: `Scrim vs ${s.opp}`,
      detail: `Bo${s.games.length} · ${phaseLabel(s.phase)}`,
      opponent: s.opp,
      status: 'played' as const,
      scoreUs: s.w,
      scoreThem: s.l,
      matchIds: s.games.flatMap((g) => (g.matchId ? [g.matchId] : [])),
      source: 'report' as const,
      reportKey: s.key,
    }))
}

export interface SplitRecord { label: string; w: number; l: number }

const rec = (games: ReportGame[], label: string): SplitRecord => ({
  label,
  w: games.filter((g) => g.result === 'W').length,
  l: games.filter((g) => g.result === 'L').length,
})

/** Game-level win rates by side, draft pick and roster phase. */
export function reportSplits(list: ReportSeries[]) {
  const games = list.flatMap((s) => s.games.filter((g) => g.result))
  return {
    all: rec(games, 'All games'),
    side: [rec(games.filter((g) => g.side === 'Radiant'), 'Radiant'), rec(games.filter((g) => g.side === 'Dire'), 'Dire')],
    pick: [rec(games.filter((g) => g.pick === '1st'), 'First pick'), rec(games.filter((g) => g.pick === '2nd'), 'Second pick')],
    phase: reportPhases.map((p) => rec(list.filter((s) => s.phase === p.id).flatMap((s) => s.games.filter((g) => g.result)), phaseShort(p.id))),
  }
}

export const pct = (r: { w: number; l: number }) => (r.w + r.l ? Math.round((100 * r.w) / (r.w + r.l)) : 0)

/** Coach / player notes written against a game. */
export const reportNotes = () =>
  reportSeries.flatMap((s) => s.games.flatMap((g, i) => (g.note ? [{ series: s, game: i + 1, note: g.note }] : [])))
