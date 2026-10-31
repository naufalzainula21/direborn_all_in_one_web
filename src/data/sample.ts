// Placeholder data for the prototype. Replace with real data once storage is added.
import type {
  BookingStatus,
  CalendarEvent,
  EventType,
  ScrimResult,
  TournamentResult,
  UpcomingTournament,
} from './types'

const pad = (n: number) => String(n).padStart(2, '0')
const typeByCode: Record<string, EventType> = { s: 'scrim', t: 'tournament', r: 'practice' }
const opponents = ['[Opponent A]', '[Opponent B]', '[Opponent C]', '[Opponent D]', '[Opponent E]', '[Opponent F]']

// October: past events, generated from a compact plan (s=scrim, t=tournament, r=practice + hour).
const octoberPlan: Record<number, string> = {
  1: 's19', 2: 's19', 3: 't19', 4: 'r15', 6: 's19', 7: 's19', 9: 's19', 10: 't19', 11: 'r15',
  13: 's19', 14: 's18 s21', 16: 's19', 17: 't19', 19: 's19', 20: 's19', 22: 's19', 23: 's19',
  24: 's20', 25: 't19', 26: 's19', 27: 's19 r22', 29: 's18 s21', 30: 's20',
}
const octoberTournaments: Record<number, [string, string]> = {
  3: ['[Tournament F]', 'Group stage · Bo3'],
  10: ['[Tournament F]', 'Group stage · Bo3'],
  17: ['[Tournament E]', 'Lower bracket semi · Bo3'],
  25: ['[Tournament D]', 'Grand final · Bo5'],
}

function october(): CalendarEvent[] {
  let k = 0
  return Object.entries(octoberPlan).flatMap(([day, codes]) =>
    codes.split(' ').map((code, i): CalendarEvent => {
      const date = `2026-10-${pad(Number(day))}`
      const type = typeByCode[code[0]]
      const base = { id: `${date}-${i}`, date, time: `${pad(Number(code.slice(1)))}:00`, type }
      if (type === 'scrim') {
        const opponent = opponents[k++ % opponents.length]
        return { ...base, title: `Scrim vs ${opponent}`, detail: k % 2 ? 'Bo3' : 'Bo2', opponent, status: 'played' }
      }
      if (type === 'tournament') {
        const [title, detail] = octoberTournaments[Number(day)]
        return { ...base, title, detail }
      }
      return { ...base, title: 'VOD review', detail: 'Last match' }
    }),
  )
}

// From today onward: written out in full.
type Row = [date: string, time: string, type: EventType, title: string, detail: string, status?: BookingStatus]
const upcoming: Row[] = [
  ['2026-10-31', '13:00', 'scrim', 'Scrim vs [Opponent E]', 'Bo2 · warm-up', 'confirmed'],
  ['2026-10-31', '16:30', 'practice', 'Draft prep', 'Game plan vs [Opponent]'],
  ['2026-10-31', '19:00', 'tournament', '[Tournament A]', 'Group stage R1 vs [Opponent] · Bo3'],
  ['2026-11-01', '19:00', 'tournament', '[Tournament A]', 'Group stage R2 vs [Opponent G] · Bo3'],
  ['2026-11-02', '19:00', 'scrim', 'Scrim vs [Opponent A]', 'Bo3', 'confirmed'],
  ['2026-11-03', '19:00', 'scrim', 'Scrim vs [Opponent C]', 'Bo2', 'confirmed'],
  ['2026-11-04', '20:00', 'practice', 'VOD review', 'Group stage R1 and R2'],
  ['2026-11-05', '20:00', 'scrim', 'Scrim vs [Opponent B]', 'Bo3', 'pending'],
  ['2026-11-06', '19:00', 'scrim', 'Scrim vs [Opponent D]', 'Bo2', 'confirmed'],
  ['2026-11-07', '18:00', 'tournament', '[Tournament A]', 'Group stage R3 vs [Opponent H] · Bo3'],
  ['2026-11-08', 'TBD', 'tournament', '[Tournament A]', 'Playoffs · if qualified'],
  ['2026-11-10', '19:00', 'scrim', 'Scrim vs [Opponent F]', 'Bo3', 'pending'],
  ['2026-11-11', '19:00', 'scrim', 'Scrim vs [Opponent A]', 'Bo2', 'pending'],
  ['2026-11-12', '20:00', 'practice', 'VOD review', 'Playoffs'],
  ['2026-11-13', '19:00', 'scrim', 'Scrim vs [Opponent C]', 'Bo3', 'pending'],
  ['2026-11-14', '18:00', 'tournament', '[Tournament B]', 'Closed qualifier · Bo1 groups'],
  ['2026-11-15', '15:00', 'practice', 'VOD review', 'Qualifier'],
]

export const events: CalendarEvent[] = [
  ...october(),
  ...upcoming.map(([date, time, type, title, detail, status], i): CalendarEvent => ({
    id: `${date}-u${i}`,
    date,
    time,
    type,
    title,
    detail,
    status,
    opponent: type === 'scrim' ? title.replace('Scrim vs ', '') : detail.match(/vs ([^·]+)/)?.[1].trim(),
  })),
].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

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
