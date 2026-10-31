import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createEvent, deleteEvent, fetchEvents, type NewEvent } from './api'
import { buildOfficialSeries, officialEvents, type OfficialSeries } from './official'
import type { Game } from './tournaments'
import type { CalendarEvent } from './types'

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
  add: (e: NewEvent) => Promise<CalendarEvent>
  remove: (id: string) => Promise<void>
  openAdd: (date?: string) => void
  addDialog: { open: boolean; date?: string }
  closeAdd: () => void
  /** Open the match summary popup for a series. */
  openMatch: (seriesKey: string) => void
  matchKey: string | null
  closeMatch: () => void
  /** Open details for any schedule event (official events open the match popup). */
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
  const [addDialog, setAddDialog] = useState<{ open: boolean; date?: string }>({ open: false })
  const [matchKey, setMatchKey] = useState<string | null>(null)
  const [eventDetail, setEventDetail] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchEvents()
      .then(({ events }) => { if (!cancelled) { setTeamEvents(events); setSource('db') } })
      .catch(() => { if (!cancelled) setSource('offline') })
    fetch('/data/direborn-games.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((g: Game[]) => { if (!cancelled) setGames(g) })
      .catch(() => { /* scoreboards unavailable; series without games still show */ })
    return () => { cancelled = true }
  }, [])

  const series = useMemo(() => buildOfficialSeries(games), [games])
  const events = useMemo(() => sortEvents([...teamEvents, ...officialEvents(series)]), [teamEvents, series])

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

  const openAdd = useCallback((date?: string) => setAddDialog({ open: true, date }), [])
  const closeAdd = useCallback(() => setAddDialog({ open: false }), [])
  const openMatch = useCallback((key: string) => setMatchKey(key), [])
  const closeMatch = useCallback(() => setMatchKey(null), [])
  const openEvent = useCallback((e: CalendarEvent) => {
    if (e.seriesKey) setMatchKey(e.seriesKey)
    else setEventDetail(e)
  }, [])
  const closeEvent = useCallback(() => setEventDetail(null), [])

  const value = useMemo(
    () => ({ events, source, games, series, add, remove, openAdd, addDialog, closeAdd, openMatch, matchKey, closeMatch, openEvent, eventDetail, closeEvent }),
    [events, source, games, series, add, remove, openAdd, addDialog, closeAdd, openMatch, matchKey, closeMatch, openEvent, eventDetail, closeEvent],
  )
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvents(): EventsState {
  const ctx = useContext(EventsContext)
  if (!ctx) throw new Error('useEvents must be used inside EventsProvider')
  return ctx
}
