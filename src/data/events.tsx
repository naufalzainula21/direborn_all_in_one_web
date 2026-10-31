import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createEvent, deleteEvent, fetchEvents, type NewEvent } from './api'
import { events as sampleEvents } from './sample'
import type { CalendarEvent } from './types'

/**
 * Where the schedule comes from:
 * - 'loading': first fetch in progress
 * - 'db': the shared Cloudflare D1 database
 * - 'sample': database not reachable, showing placeholder data (read-only)
 */
export type EventSource = 'loading' | 'db' | 'sample'

interface EventsState {
  events: CalendarEvent[]
  source: EventSource
  add: (e: NewEvent) => Promise<CalendarEvent>
  remove: (id: string) => Promise<void>
  /** Open the Add event dialog, optionally on a given date. */
  openAdd: (date?: string) => void
  addDialog: { open: boolean; date?: string }
  closeAdd: () => void
}

const EventsContext = createContext<EventsState | null>(null)

const sortEvents = (list: CalendarEvent[]) =>
  [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [source, setSource] = useState<EventSource>('loading')
  const [addDialog, setAddDialog] = useState<{ open: boolean; date?: string }>({ open: false })

  useEffect(() => {
    let cancelled = false
    fetchEvents()
      .then(({ events }) => {
        if (cancelled) return
        setEvents(sortEvents(events))
        setSource('db')
      })
      .catch(() => {
        if (cancelled) return
        setEvents(sampleEvents)
        setSource('sample')
      })
    return () => { cancelled = true }
  }, [])

  const add = useCallback(async (e: NewEvent) => {
    const { event } = await createEvent(e)
    setEvents((list) => sortEvents([...list, event]))
    return event
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteEvent(id)
    setEvents((list) => list.filter((e) => e.id !== id))
  }, [])

  const openAdd = useCallback((date?: string) => setAddDialog({ open: true, date }), [])
  const closeAdd = useCallback(() => setAddDialog({ open: false }), [])

  const value = useMemo(
    () => ({ events, source, add, remove, openAdd, addDialog, closeAdd }),
    [events, source, add, remove, openAdd, addDialog, closeAdd],
  )
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvents(): EventsState {
  const ctx = useContext(EventsContext)
  if (!ctx) throw new Error('useEvents must be used inside EventsProvider')
  return ctx
}
