// Official matches (tournaments) turned into series and schedule events,
// so every page shows the same matches.
import { pastTournaments, running, seriesFor, type Game } from './tournaments'
import type { CalendarEvent } from './types'

export interface OfficialSeries {
  key: string
  date: string // YYYY-MM-DD (WIB)
  time: string // HH:mm WIB or 'TBD'
  tournament: string
  tourKey: string
  opp: string
  w: number
  l: number
  /** null = not played yet */
  won: boolean | null
  games: Game[]
}

const pad = (n: number) => String(n).padStart(2, '0')
function wibParts(t: number) {
  const d = new Date((t + 7 * 3600) * 1000)
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  }
}

/** Short tournament names for calendars and lists. */
const SHORT: Record<string, string> = {
  'DreamLeague Season 30 Qualifiers': 'DreamLeague S30 SEA qualifier',
  'RES Unchained - A Blast Dota Slam IX Qualifier SEA': 'BLAST Slam IX SEA qualifier',
  'RES Unchained - A Blast Dota Slam VIII Qualifier SEA': 'BLAST Slam VIII SEA qualifier',
  'EPL World Series: Southeast Asia 2025-2026 Season': 'EPL SEA Season 16',
  'The International 2026 - Regional Qualifier Southeast Asia': 'TI 2026 SEA qualifier',
  'Road To EWC 2026 Regional Qualifiers': 'EWC 2026 SEA qualifier',
  'EPL S19': 'EPL SEA Season 19',
}
export const shortTournament = (key: string) => SHORT[key] ?? pastTournaments.find((t) => t.key === key)?.name ?? key

/** EPL S19 series (from Hawk Live). Times in WIB where known. */
const S19: { date: string; time: string; opp: string; w: number; l: number; played: boolean }[] = [
  { date: '2026-10-26', time: 'TBD', opp: 'Team Kinetix', w: 2, l: 0, played: true },
  { date: '2026-10-26', time: 'TBD', opp: 'Cloud Dawning', w: 2, l: 0, played: true },
  { date: '2026-10-28', time: '14:00', opp: 'Yangon Galacticos', w: 2, l: 0, played: true },
  { date: '2026-10-29', time: 'TBD', opp: 'Team Nemesis Academy', w: 2, l: 0, played: true },
  { date: '2026-10-30', time: 'TBD', opp: 'Resp Gaming', w: 2, l: 0, played: true },
  { date: '2026-10-31', time: '11:00', opp: 'Royal Bear', w: 0, l: 2, played: true },
  { date: '2026-11-02', time: 'TBD', opp: 'ZENITH', w: 0, l: 0, played: false },
]

export function buildOfficialSeries(games: Game[]): OfficialSeries[] {
  const out: OfficialSeries[] = []
  for (const t of pastTournaments) {
    for (const s of seriesFor(games, t.key)) {
      const { date, time } = wibParts(s.games[0].t)
      out.push({
        key: `${t.key}|${s.games[0].id}`, date, time, tournament: shortTournament(t.key), tourKey: t.key,
        opp: s.opp, w: s.w, l: s.l, won: s.won, games: s.games,
      })
    }
  }
  for (const m of S19) {
    out.push({
      key: `EPL S19|${m.date}|${m.opp}`, date: m.date, time: m.time, tournament: shortTournament('EPL S19'), tourKey: 'EPL S19',
      opp: m.opp, w: m.w, l: m.l, won: m.played ? m.w > m.l : null, games: [],
    })
  }
  // Newest first (TBD sorts as end of day)
  return out.sort((a, b) => (b.date + (b.time === 'TBD' ? '23:59' : b.time)).localeCompare(a.date + (a.time === 'TBD' ? '23:59' : a.time)))
}

/** Calendar events for official series. */
export function officialEvents(series: OfficialSeries[]): CalendarEvent[] {
  return series.map((s) => ({
    id: `official:${s.key}`,
    date: s.date,
    time: s.time,
    type: 'tournament',
    title: s.tournament,
    detail: s.won === null ? `vs ${s.opp} · Bo3` : `${s.won ? 'Won' : 'Lost'} ${s.w}–${s.l} vs ${s.opp}`,
    opponent: s.opp,
    source: 'official',
    seriesKey: s.key,
  }))
}

export const runningName = running.name
