import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { IconName } from '../components/Icon'
import * as api from '../data/api'
import type { User } from '../data/api'
import { canAddAny, ROLE_LABEL, type Role } from './permissions'

export type { Role } from './permissions'

export interface RoleInfo {
  id: Role
  label: string
  icon: IconName
  /** Nav item ids shown for this role, in order. */
  nav: string[]
}

const INFO: Record<Role, Omit<RoleInfo, 'id' | 'label'>> = {
  admin: { icon: 'clipboard', nav: ['home', 'schedule', 'scrims', 'tournaments', 'goals', 'people'] },
  coach: { icon: 'clipboard', nav: ['home', 'schedule', 'scrims', 'tournaments', 'goals'] },
  management: { icon: 'briefcase', nav: ['home', 'schedule', 'scrims', 'tournaments', 'goals'] },
  owner: { icon: 'crown', nav: ['home', 'schedule', 'scrims', 'tournaments', 'goals'] },
  creative: { icon: 'sparkle', nav: ['home', 'planner', 'schedule', 'scrims', 'tournaments', 'goals'] },
  player: { icon: 'gamepad', nav: ['home', 'schedule', 'scrims', 'tournaments', 'goals'] },
}

export const roleInfo = (r: Role): RoleInfo => ({ id: r, label: ROLE_LABEL[r], ...INFO[r] })

type Status = 'loading' | 'signed-out' | 'must-change' | 'ready' | 'offline'

interface AuthState {
  status: Status
  user: User | null
  /** Shortcut for user.role (null until logged in). */
  role: Role | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const apply = useCallback((u: User | null) => {
    setUser(u)
    setStatus(!u ? 'signed-out' : u.mustChange ? 'must-change' : 'ready')
  }, [])

  useEffect(() => {
    let cancelled = false
    api.fetchMe()
      .then(({ user: u }) => { if (!cancelled) apply(u) })
      .catch((err) => { if (!cancelled) { if (err instanceof api.ApiError && err.status === 401) apply(null); else setStatus('offline') } })
    api.setSignedOutHandler(() => apply(null))
    return () => { cancelled = true; api.setSignedOutHandler(null) }
  }, [apply])

  // Lets CSS hide add buttons everywhere, including popups outside the shell.
  useEffect(() => {
    document.documentElement.dataset.role = user?.role ?? ''
    document.documentElement.dataset.canAdd = user && canAddAny(user.role) ? 'yes' : 'no'
  }, [user])

  const signIn = useCallback(async (username: string, password: string) => {
    const { user: u } = await api.login(username, password)
    apply(u)
  }, [apply])

  const signOut = useCallback(async () => {
    try { await api.logout() } finally { apply(null) }
  }, [apply])

  const changePassword = useCallback(async (current: string, next: string) => {
    const { user: u } = await api.changePassword(current, next)
    apply(u)
  }, [apply])

  const value = useMemo(() => ({ status, user, role: user?.role ?? null, signIn, signOut, changePassword }), [status, user, signIn, signOut, changePassword])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** The logged-in role (screens only render once someone is logged in). */
// eslint-disable-next-line react-refresh/only-export-components
export function useRole(): { role: Role; user: User } {
  const { user } = useAuth()
  if (!user) throw new Error('useRole needs a logged-in user')
  return { role: user.role, user }
}
