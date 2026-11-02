/**
 * Who can do what. Shared by the API Worker (enforces) and the app (shows/hides buttons).
 * See docs/roles.md in the project spec.
 */
export type Role = 'admin' | 'coach' | 'management' | 'owner' | 'creative' | 'player'
export type EventKind = 'tournament' | 'scrim' | 'practice' | 'other'

export const ROLES: Role[] = ['admin', 'coach', 'management', 'owner', 'creative', 'player']

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Manager (Admin)',
  coach: 'Coach',
  management: 'Management',
  owner: 'Owner',
  creative: 'Creative team',
  player: 'Player',
}

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as string[]).includes(v)

const staff = (r: Role) => r === 'admin' || r === 'coach'

/** Can add this type of schedule entry. Creative adds activities ('other') only. */
export function canAddType(r: Role, type: EventKind): boolean {
  if (staff(r) || r === 'management') return true
  return r === 'creative' && type === 'other'
}

/** Sees an Add button at all. */
export const canAddAny = (r: Role) => staff(r) || r === 'management' || r === 'creative'

/** Types offered in the Add dialog. */
export const addableTypes = (r: Role): EventKind[] =>
  (['tournament', 'scrim', 'practice', 'other'] as EventKind[]).filter((t) => canAddType(r, t))

/** Search Liquipedia and import tournament matches. */
export const canImport = (r: Role) => staff(r) || r === 'management'

/** Edit or delete a schedule entry. Management and creative only their own; creative only activities. */
export function canEditEvent(user: { id: string; role: Role }, ev: { type: string; createdBy?: string | null }): boolean {
  if (staff(user.role)) return true
  if (user.role === 'management') return !!ev.createdBy && ev.createdBy === user.id
  if (user.role === 'creative') return ev.type === 'other' && !!ev.createdBy && ev.createdBy === user.id
  return false
}

/** Enter scrim teams' results (scores, match IDs). */
export const canEnterResults = (r: Role) => staff(r)

/** Team targets & goals: everyone reads, Admin and Coach edit. */
export const canEditTeamGoals = (r: Role) => staff(r)

/** Personal goals: players write their own; Admin and Coach read all and comment; nobody else sees them. */
export const hasPersonalGoals = (r: Role) => r === 'player'
export const canSeeAllPersonalGoals = (r: Role) => staff(r)

/** People page: add people, roles, password resets. */
export const canManagePeople = (r: Role) => r === 'admin'
