export type EventType = 'tournament' | 'scrim' | 'practice' | 'other'

export type BookingStatus = 'confirmed' | 'pending' | 'played'

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  time: string // HH:mm in WIB, or 'TBD'
  type: EventType
  title: string // "Scrim vs [Opponent A]", "[Tournament A]", "VOD review"
  detail: string // "Bo3", "Group stage R1 vs [Opponent] · Bo3"
  opponent?: string
  status?: BookingStatus // scrims only
  notes?: string
}

export type ScrimOutcome = 'win' | 'loss' | 'draw'

export interface ScrimResult {
  id: string
  date: string
  opponent: string
  games: number
  score: [number, number] // [Direborn, opponent]
}

export type Placement = 'first' | 'second' | 'top4' | 'top8' | 'out'

export interface TournamentResult {
  id: string
  date: string
  tournament: string
  stage: string
  score: [number, number]
  placement: Placement
}

export type UpcomingStatus = 'live' | 'registered' | 'signup'

export interface UpcomingTournament {
  id: string
  name: string
  stage: string
  date: string
  status: UpcomingStatus
  signupBy?: string
}

export interface NextMatch {
  opponent: string
  tournament: string
  format: string
  start: string // ISO date-time with offset
}
