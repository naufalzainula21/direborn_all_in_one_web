import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent } from '../../data/types'
import { useEvents } from '../../data/events'
import { addDays, mondayOf, parseDay, toISODate } from '../../lib/format'
import { Icon } from '../Icon'
import { CHIP_LABEL, DOW, TYPE_LABEL, type ScheduleFilter, type ScheduleView } from './meta'

const VIEW_KEY = 'direborn.schedule.view'

function loadView(): ScheduleView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (v === 'day' || v === 'week' || v === 'month') return v
  } catch { /* storage unavailable */ }
  return 'month'
}

const VIEWS: { id: ScheduleView; label: string; desc: string }[] = [
  { id: 'day', label: 'Day', desc: 'Hour by hour for one day' },
  { id: 'week', label: 'Week', desc: 'Seven days side by side' },
  { id: 'month', label: 'Month', desc: 'The whole month at a glance' },
]

const FILTERS: { id: ScheduleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tournament', label: 'Tournaments' },
  { id: 'scrim', label: 'Scrims' },
  { id: 'practice', label: 'Practice' },
]

function ViewIcon({ view }: { view: ScheduleView }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      {view === 'day' && <rect x="7" y="13" width="4" height="4" rx="1" />}
      {view === 'week' && <path d="M3 15h18" />}
      {view === 'month' && <path d="M9 10v11M15 10v11M3 15.5h18" />}
    </svg>
  )
}

function Chip({ e }: { e: CalendarEvent }) {
  return (
    <span className={`chip chip--${e.type}`}>
      <strong>{e.time}</strong> {CHIP_LABEL[e.type]}
    </span>
  )
}

export function ScheduleBrowser({ events, today }: { events: CalendarEvent[]; today: string }) {
  const [view, setView] = useState<ScheduleView>(loadView)
  const [cursor, setCursor] = useState(today)
  const [filter, setFilter] = useState<ScheduleFilter>('all')

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, view) } catch { /* storage unavailable */ }
  }, [view])

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      if (filter !== 'all' && e.type !== filter) continue
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return map
  }, [events, filter])

  const shift = (dir: 1 | -1) => {
    if (view === 'day') setCursor(addDays(cursor, dir))
    else if (view === 'week') setCursor(addDays(cursor, 7 * dir))
    else {
      const d = parseDay(cursor)
      setCursor(toISODate(new Date(d.getFullYear(), d.getMonth() + dir, 1)))
    }
  }

  const cur = parseDay(cursor)
  let period: string
  if (view === 'day') {
    period = cur.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  } else if (view === 'week') {
    const fmt = (iso: string) => parseDay(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    period = `${fmt(mondayOf(cursor))} – ${fmt(addDays(mondayOf(cursor), 6))}`
  } else {
    period = cur.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  return (
    <section className="card browser" aria-labelledby="browser-title">
      <h2 id="browser-title" className="card__title">View schedule</h2>

      <div className="view-cards">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`view-card${view === v.id ? ' is-active' : ''}`}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            <ViewIcon view={v.id} />
            <span className="view-card__label">{v.label}</span>
            <span className="view-card__desc">{v.desc}</span>
          </button>
        ))}
      </div>

      <div className="browser__bar">
        <div className="browser__nav">
          <button type="button" className="icon-btn" aria-label="Previous" onClick={() => shift(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <button type="button" className="icon-btn" aria-label="Next" onClick={() => shift(1)}>
            <Icon name="chevronRight" />
          </button>
          <button type="button" className="ghost-btn" onClick={() => setCursor(today)}>Today</button>
          <span className="browser__period" aria-live="polite">{period}</span>
        </div>
        <div className="segmented" role="group" aria-label="Filter events">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`segmented__btn${filter === f.id ? ' is-active' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'day' && <DayView date={cursor} events={byDate.get(cursor) ?? []} />}
      {view === 'week' && <WeekView start={mondayOf(cursor)} today={today} byDate={byDate} />}
      {view === 'month' && (
        <MonthView
          cursor={cursor}
          today={today}
          byDate={byDate}
          onOpen={(iso) => { setCursor(iso); setView('day') }}
        />
      )}

      <ul className="legend">
        <li><span className="legend__dot legend__dot--tournament" />Tournament match</li>
        <li><span className="legend__dot legend__dot--scrim" />Scrim</li>
        <li><span className="legend__dot legend__dot--practice" />Practice</li>
        <li><span className="legend__dot legend__dot--other" />Other</li>
      </ul>
    </section>
  )
}

function DayView({ date, events }: { date: string; events: CalendarEvent[] }) {
  const { openAdd, remove, source, openMatch } = useEvents()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const onDelete = async (e: CalendarEvent) => {
    if (!window.confirm(`Delete "${e.title}" on ${e.date}?`)) return
    setBusy(e.id)
    setError('')
    try { await remove(e.id) } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete.') }
    finally { setBusy(null) }
  }

  const addButton = (
    <button type="button" className="ghost-btn day-list__add" onClick={() => openAdd(date)}>+ Add event on this day</button>
  )

  if (events.length === 0) {
    return (
      <div className="browser__empty">
        <p>No events on this day. Rest day.</p>
        {addButton}
      </div>
    )
  }
  return (
    <>
    {error && <p className="field__error" role="alert">{error}</p>}
    <ul className="day-list">
      {events.map((e) => (
        <li key={e.id} className="day-list__item">
          <span className="day-list__time">{e.time}</span>
          <span className={`dot dot--lg dot--${e.type}`} />
          <span className="day-list__text">
            <span className="day-list__title">{e.title}</span>
            <span className="muted small">{e.detail}</span>
            {e.notes && <span className="day-list__notes">{e.notes}</span>}
          </span>
          <span className={`badge badge--type-${e.type}`}>{TYPE_LABEL[e.type]}</span>
          {e.source === 'official' && e.seriesKey && (
            <button type="button" className="ghost-btn day-list__summary" onClick={() => openMatch(e.seriesKey!)}>Summary</button>
          )}
          {source === 'db' && e.source !== 'official' && (
            <button type="button" className="icon-btn icon-btn--sm" aria-label={`Delete ${e.title}`} disabled={busy === e.id} onClick={() => onDelete(e)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            </button>
          )}
        </li>
      ))}
    </ul>
    {addButton}
    </>
  )
}

function WeekView({ start, today, byDate }: { start: string; today: string; byDate: Map<string, CalendarEvent[]> }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="scroll-x">
      <div className="week-grid">
        {days.map((iso) => {
          const d = parseDay(iso)
          const list = byDate.get(iso) ?? []
          const isToday = iso === today
          return (
            <div key={iso} className={`week-day${isToday ? ' is-today' : ''}`}>
              <span className="week-day__head">
                {DOW[d.getDay()]} {d.getDate()}{isToday ? ' · Today' : ''}
              </span>
              {list.length === 0 ? <span className="week-day__rest">Rest</span> : list.map((e) => <Chip key={e.id} e={e} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthView({ cursor, today, byDate, onOpen }: {
  cursor: string
  today: string
  byDate: Map<string, CalendarEvent[]>
  onOpen: (iso: string) => void
}) {
  const cur = parseDay(cursor)
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const dim = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
  const total = Math.ceil((lead + dim) / 7) * 7
  const cells = Array.from({ length: total }, (_, i) => new Date(cur.getFullYear(), cur.getMonth(), 1 - lead + i))

  return (
    <div className="scroll-x">
      <div className="month-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => (
          <span key={w} className="calendar__weekday">{w}</span>
        ))}
        {cells.map((d) => {
          const iso = toISODate(d)
          const inMonth = d.getMonth() === cur.getMonth()
          const list = inMonth ? byDate.get(iso) ?? [] : []
          const classes = ['month-cell', !inMonth && 'is-outside', iso === today && 'is-today'].filter(Boolean).join(' ')
          return (
            <button
              key={iso}
              type="button"
              className={classes}
              onClick={() => onOpen(iso)}
              aria-label={`${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}, ${list.length} events. Open day view`}
            >
              <span className="month-cell__num">{d.getDate()}</span>
              <span className="month-cell__chips">
                {list.map((e) => <Chip key={e.id} e={e} />)}
              </span>
              <span className="month-cell__dots">
                {list.map((e) => <span key={e.id} className={`dot dot--${e.type}`} />)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
