import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createEvent, deleteEvent, fetchEvents, fetchTournaments, updateEvent, type EventPatch, type NewEvent, type TournamentData } from './api'
import { useAuth } from '../lib/role'
import { buildOfficialSeries, officialEvents, type OfficialSeries } from './official'
import { reportEvents } from './scrimReport'
import type { Game } from './tournaments'
import type { CalendarEvent, EventType } from './types'

/**
 * Where the team's own events come from:
 * - 'loading': first fetch in progress
 * - 'db': the shared Cloudflare D1 database
 * - 'offline': database not reachable (official matches still show)
 */
export type EventSource = 'loading' | 'db' | 'offline'

interface EventsState {
  /** Team events from the database plus official matches, sorted by date. */
  events: CalendarEvent[]
  source: EventSource
  /** Official games with full scoreboards (OpenDota). */
  games: Game[]
  /** Official series, newest first. */
  series: OfficialSeries[]
  /** Tournaments imported from Liquipedia (standings, bracket, Direborn's matches). */
  tournaments: TournamentData[]
  /** Reload events and imported tournaments (after an import). */
  reload: () => void
  add: (e: NewEvent) => Promise<CalendarEvent>
  remove: (id: string) => Promise<void>
  update: (id: string, patch: EventPatch) => Promise<CalendarEvent>
  openAdd: (date?: string, type?: EventType) => void
  addDialog: { open: boolean; date?: string; type?: EventType }
  /** Record or edit a scrim result */
  openResult: (e: CalendarEvent) => void
  resultFor: CalendarEvent | null
  closeResult: () => void
  closeAdd: () => void
  /** Open the match summary popup for a series. */
  openMatch: (seriesKey: string) => void
  matchKey: string | null
  closeMatch: () => void
  /** Scrim report popup (games from the team's report sheet). */
  reportKey: string | null
  closeReport: () => void
  /** Open details for any schedule event (official events open the match popup, report scrims the report popup). */
  openEvent: (e: CalendarEvent) => void
  eventDetail: CalendarEvent | null
  closeEvent: () => void
}

const EventsContext = createContext<EventsState | null>(null)

const sortEvents = (list: CalendarEvent[]) =>
  [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

export function EventsProvider({ children }: { children: ReactNode }) {
  const [teamEvents, setTeamEvents] = useState<CalendarEvent[]>([])
  const [source, setSource] = useState<EventSource>('loading')
  const [games, setGames] = useState<Game[]>([])
  const [addDialog, setAddDialog] = useState<{ open: boolean; date?: string; type?: EventType }>({ open: false })
  const [resultFor, setResultFor] = useState<CalendarEvent | null>(null)
  const [matchKey, setMatchKey] = useState<string | null>(null)
  const [eventDetail, setEventDetail] = useState<CalendarEvent | null>(null)
  const [reportKey, setReportKey] = useState<string | null>(null)
  const [tournaments, setTournaments] = useState<TournamentData[]>([])
  const [version, setVersion] = useState(0)
  const { user } = useAuth()
  const userId = user && !user.mustChange ? user.id : null

  // Team schedule and imported tournaments need a login; reload when the person changes.
  useEffect(() => {
    if (!userId) { setTeamEvents([]); setTournaments([]); return }
    let cancelled = false
    fetchEvents()
      .then(({ events }) => { if (!cancelled) { setTeamEvents(events); setSource('db') } })
      .catch(() => { if (!cancelled) setSource('offline') })
    fetchTournaments()
      .then(({ tournaments: t }) => { if (!cancelled) setTournaments(t) })
      .catch(() => { /* standings unavailable */ })
    return () => { cancelled = true }
  }, [userId, version])
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    fetch('/data/direborn-games.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((g: Game[]) => { if (!cancelled) setGames(g) })
      .catch(() => { /* scoreboards unavailable; series without games still show */ })
    return () => { cancelled = true }
  }, [])

  const series = useMemo(() => buildOfficialSeries(games), [games])
  const events = useMemo(() => {
    // Skip report scrims the team already logged in the app (same day, same opponent).
    const logged = new Set(teamEvents.filter((e) => e.type === 'scrim').map((e) => `${e.date}|${(e.opponent ?? '').toLowerCase()}`))
    const report = reportEvents().filter((e) => !logged.has(`${e.date}|${e.opponent!.toLowerCase()}`))
    // A match imported from Liquipedia and the same match in the built-in official list: keep one.
    // Played matches with scoreboards keep the official version (richer popup); otherwise the imported one (kept up to date).
    const norm = (s?: string) => (s ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '')
    const official = officialEvents(series)
    const imported = teamEvents.filter((e) => e.importedFrom)
    const sameMatch = (a: CalendarEvent, b: CalendarEvent) => a.date === b.date && !!norm(a.opponent) && norm(a.opponent) === norm(b.opponent)
    const richOfficial = (o: CalendarEvent) => !!o.seriesKey && (series.find((s) => s.key === o.seriesKey)?.games.length ?? 0) > 0
    const keepOfficial = official.filter((o) => richOfficial(o) || !imported.some((i) => sameMatch(i, o)))
    const team = teamEvents.filter((e) => !e.importedFrom || !keepOfficial.some((o) => richOfficial(o) && sameMatch(e, o)))
    return sortEvents([...team, ...keepOfficial, ...report])
  }, [teamEvents, series])

  const add = useCallback(async (e: NewEvent) => {
    const { event } = await createEvent(e)
    setTeamEvents((list) => [...list, event])
    return event
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteEvent(id)
    setTeamEvents((list) => list.filter((e) => e.id !== id))
    setEventDetail(null)
  }, [])

  const update = useCallback(async (id: string, patch: EventPatch) => {
    const { event } = await updateEvent(id, patch)
    setTeamEvents((list) => list.map((e) => (e.id === id ? event : e)))
    setEventDetail((cur) => (cur && cur.id === id ? event : cur))
    return event
  }, [])

  const openAdd = useCallback((date?: string, type?: EventType) => setAddDialog({ open: true, date, type }), [])
  const openResult = useCallback((e: CalendarEvent) => setResultFor(e), [])
  const closeResult = useCallback(() => setResultFor(null), [])
  const closeAdd = useCallback(() => setAddDialog({ open: false }), [])
  const openMatch = useCallback((key: string) => setMatchKey(key), [])
  const closeMatch = useCallback(() => setMatchKey(null), [])
  const openEvent = useCallback((e: CalendarEvent) => {
    if (e.seriesKey) setMatchKey(e.seriesKey)
    else if (e.reportKey) setReportKey(e.reportKey)
    else setEventDetail(e)
  }, [])
  const closeEvent = useCallback(() => setEventDetail(null), [])
  const closeReport = useCallback(() => setReportKey(null), [])

  const value = useMemo(
    () => ({ events, source, games, series, tournaments, reload, add, remove, update, openResult, resultFor, closeResult, openAdd, addDialog, closeAdd, openMatch, matchKey, closeMatch, openEvent, eventDetail, closeEvent, reportKey, closeReport }),
    [events, source, games, series, tournaments, reload, add, remove, update, openResult, resultFor, closeResult, openAdd, addDialog, closeAdd, openMatch, matchKey, closeMatch, openEvent, eventDetail, closeEvent, reportKey, closeReport],
  )
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvents(): EventsState {
  const ctx = useContext(EventsContext)
  if (!ctx) throw new Error('useEvents must be used inside EventsProvider')
  return ctx
}
