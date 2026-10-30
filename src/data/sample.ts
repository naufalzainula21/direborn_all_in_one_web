// Placeholder data for the prototype. Replace with real data once storage is added.
import type {
  CalendarEvent,
  EventType,
  NextMatch,
  ScrimResult,
  TournamentResult,
  UpcomingTournament,
} from './types'

const october: Record<number, string[]> = {
  1: ['s19'], 2: ['s19'], 3: ['t19'], 4: ['r15'],
  6: ['s19'], 7: ['s19'], 9: ['s19'], 10: ['t19'], 11: ['r15'],
  13: ['s19'], 14: ['s18', 's21'], 16: ['s19'], 17: ['t19'],
  19: ['s19'], 20: ['s19'], 22: ['s19'], 23: ['s19'], 24: ['s20'], 25: ['t19'],
  26: ['s19'], 27: ['s19', 'r22'], 29: ['s18', 's21'], 30: ['s20'], 31: ['t19'],
}

const november: Record<number, string[]> = {
  1: ['r15'], 3: ['s19'], 4: ['s19'], 6: ['s20'], 7: ['t19'], 8: ['r15'],
  10: ['s19'], 11: ['s19'], 13: ['s19'], 14: ['t18'],
}

const typeByCode: Record<string, EventType> = { s: 'scrim', t: 'tournament', r: 'review' }

function expand(year: number, month: number, plan: Record<number, string[]>): CalendarEvent[] {
  return Object.entries(plan).flatMap(([day, codes]) =>
    codes.map((code, i) => {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return {
        id: `${date}-${i}`,
        date,
        time: `${code.slice(1).padStart(2, '0')}:00`,
        type: typeByCode[code[0]],
      }
    }),
  )
}

export const events: CalendarEvent[] = [
  ...expand(2026, 10, october),
  ...expand(2026, 11, november),
]

export const nextMatch: NextMatch = {
  opponent: '[Opponent]',
  tournament: '[Tournament name]',
  format: 'Official · Bo3',
  start: '2026-10-31T19:00:00+07:00',
}

export const tournamentResults: TournamentResult[] = [
  { id: 't1', date: '2026-10-25', tournament: '[Tournament D]', stage: 'Grand final vs [Opponent]', score: [1, 2], placement: 'second' },
  { id: 't2', date: '2026-10-17', tournament: '[Tournament E]', stage: 'Lower bracket semi', score: [0, 2], placement: 'top4' },
  { id: 't3', date: '2026-10-10', tournament: '[Tournament F]', stage: 'Group stage', score: [1, 3], placement: 'out' },
]

export const scrimResults: ScrimResult[] = [
  { id: 's1', date: '2026-10-30', opponent: '[Opponent A]', games: 3, score: [2, 1] },
  { id: 's2', date: '2026-10-29', opponent: '[Opponent B]', games: 2, score: [0, 2] },
  { id: 's3', date: '2026-10-29', opponent: '[Opponent C]', games: 2, score: [1, 1] },
  { id: 's4', date: '2026-10-27', opponent: '[Opponent D]', games: 3, score: [3, 0] },
]

export const upcomingTournaments: UpcomingTournament[] = [
  { id: 'u1', name: '[Tournament A]', stage: 'Group stage', date: '2026-10-31', status: 'live' },
  { id: 'u2', name: '[Tournament B]', stage: 'Closed qualifier', date: '2026-11-14', status: 'registered' },
  { id: 'u3', name: '[Tournament C]', stage: 'Open qualifier', date: '2026-12-02', status: 'signup', signupBy: '2026-11-20' },
]
