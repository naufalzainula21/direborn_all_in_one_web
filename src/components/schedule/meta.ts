import type { EventType } from '../../data/types'

/** Short label for calendar chips. */
export const CHIP_LABEL: Record<EventType, string> = { scrim: 'Scrim', tournament: 'Match', practice: 'Practice', other: 'Session' }

/** Badge label in lists. */
export const TYPE_LABEL: Record<EventType, string> = { scrim: 'Scrim', tournament: 'Tournament', practice: 'Practice', other: 'Other' }

export type ScheduleView = 'day' | 'week' | 'month'
export type ScheduleFilter = 'all' | 'tournament' | 'scrim' | 'practice'

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
