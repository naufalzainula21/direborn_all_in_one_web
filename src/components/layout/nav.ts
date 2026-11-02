import type { IconName } from '../Icon'

export interface NavItem {
  id: string
  label: string
  icon: IconName
  /** Route path; items without one are not built yet. */
  path?: string
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', path: '/' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar', path: '/schedule' },
  { id: 'scrims', label: 'Scrims', icon: 'target', path: '/scrims' },
  { id: 'tournaments', label: 'Tournaments', icon: 'trophy', path: '/tournaments' },
  { id: 'planner', label: 'Content', icon: 'sparkle', path: '/planner' },
  { id: 'goals', label: 'Goals', icon: 'flag', path: '/goals' },
  { id: 'people', label: 'People', icon: 'users', path: '/people' },
]
