import type { EventType } from '../../data/types'

/** Short label for calendar chips. */
export const CHIP_LABEL: Record<EventType, string> = { scrim: 'Scrim', tournament: 'Match', review: 'Review' }

/** Badge label in lists. */
export const TYPE_LABEL: Record<EventType, string> = { scrim: 'Scrim', tournament: 'Tournament', review: 'Prep' }

export type ScheduleView = 'day' | 'week' | 'month'
export type ScheduleFilter = 'all' | 'tournament' | 'scrim'

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
