import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { IconName } from '../components/Icon'

/** Who is using the app. A view preference only: saving still needs the team code. */
export type Role = 'player' | 'staff' | 'creative'

export interface RoleInfo {
  id: Role
  label: string
  short: string
  icon: IconName
  blurb: string
  /** Nav item ids shown for this role */
  nav: string[]
  /** Can open the Add event dialog */
  canAdd: boolean
}

export const ROLES: RoleInfo[] = [
  { id: 'player', label: 'Player', short: 'Player', icon: 'gamepad', blurb: 'Your schedule at a glance: what’s next, today and this week.', nav: ['home', 'schedule'], canAdd: false },
  { id: 'staff', label: 'Coach & management', short: 'Staff', icon: 'clipboard', blurb: 'Full team view: schedule, scrim reports, tournaments and results.', nav: ['home', 'schedule', 'scrims', 'tournaments', 'roster'], canAdd: true },
  { id: 'creative', label: 'Creative team', short: 'Creative', icon: 'sparkle', blurb: 'Plan match days, content and team activities around the tournament calendar.', nav: ['home', 'schedule', 'tournaments'], canAdd: true },
]

export const roleInfo = (r: Role) => ROLES.find((x) => x.id === r)!

const KEY = 'direborn.role'
const read = (): Role | null => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'player' || v === 'staff' || v === 'creative' ? v : null
  } catch { return null }
}

interface RoleState { role: Role | null; setRole: (r: Role | null) => void }
const RoleContext = createContext<RoleState | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, set] = useState<Role | null>(read)
  const setRole = useCallback((r: Role | null) => {
    set(r)
    try { if (r) localStorage.setItem(KEY, r); else localStorage.removeItem(KEY) } catch { /* private mode */ }
  }, [])
  // Lets CSS hide editing controls everywhere, including popups outside the shell.
  useEffect(() => { document.documentElement.dataset.role = role ?? '' }, [role])
  const value = useMemo(() => ({ role, setRole }), [role, setRole])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRole(): RoleState {
  const ctx = useContext(RoleContext)
  if (!ctx) throw new Error('useRole must be used inside RoleProvider')
  return ctx
}
