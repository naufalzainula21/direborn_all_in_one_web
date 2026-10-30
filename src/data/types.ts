export type EventType = 'scrim' | 'tournament' | 'review'

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD
  time: string // HH:mm, WIB
  type: EventType
  title?: string
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
