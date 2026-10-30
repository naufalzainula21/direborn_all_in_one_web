import type { IconName } from '../Icon'

export interface NavItem {
  id: string
  label: string
  icon: IconName
}

export const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar' },
  { id: 'scrims', label: 'Scrims', icon: 'target' },
  { id: 'tournaments', label: 'Tournaments', icon: 'trophy' },
  { id: 'roster', label: 'Roster', icon: 'users' },
]
