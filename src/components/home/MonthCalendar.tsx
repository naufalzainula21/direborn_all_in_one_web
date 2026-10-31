import { useMemo, useState } from 'react'
import type { CalendarEvent, EventType } from '../../data/types'
import { parseDay, toISODate } from '../../lib/format'
import { Icon } from '../Icon'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const LABEL: Record<EventType, string> = { scrim: 'Scrim', tournament: 'Match', practice: 'Practice', other: 'Session' }
const AGENDA_LABEL: Record<EventType, string> = { scrim: 'Scrim', tournament: 'Tournament match', practice: 'Practice', other: 'Other' }

interface Cell {
  iso: string
  day: number
  inMonth: boolean
}

function buildGrid(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((lead + daysInMonth) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(year, month, 1 - lead + i)
    return { iso: toISODate(d), day: d.getDate(), inMonth: d.getMonth() === month }
  })
}

export function MonthCalendar({ events, today }: { events: CalendarEvent[]; today: Date }) {
  const todayIso = toISODate(today)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState(todayIso)

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time))
    return map
  }, [events])

  const cells = buildGrid(view.year, view.month)
  const title = new Date(view.year, view.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const shift = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }
  const selectedEvents = byDate.get(selected) ?? []
  const selectedLabel = parseDay(selected).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <section className="card calendar" aria-labelledby="cal-title">
      <div className="calendar__head">
        <div className="calendar__nav">
          <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => shift(-1)}>
            <Icon name="chevronLeft" />
          </button>
          <h2 id="cal-title" className="calendar__title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Next month" onClick={() => shift(1)}>
            <Icon name="chevronRight" />
          </button>
        </div>
        <ul className="legend">
          <li><span className="legend__dot legend__dot--scrim" />Scrim</li>
          <li><span className="legend__dot legend__dot--tournament" />Tournament match</li>
          <li><span className="legend__dot legend__dot--practice" />Practice</li>
          <li><span className="legend__dot legend__dot--other" />Other</li>
        </ul>
      </div>

      <div className="calendar__grid" role="grid" aria-labelledby="cal-title">
        {WEEKDAYS.map((w) => (
          <span key={w} className="calendar__weekday" role="columnheader">{w}</span>
        ))}
        {cells.map((cell) => {
          const dayEvents = byDate.get(cell.iso) ?? []
          const isToday = cell.iso === todayIso
          const classes = [
            'day',
            !cell.inMonth && 'day--outside',
            isToday && 'day--today',
            cell.iso === selected && 'day--selected',
          ].filter(Boolean).join(' ')
          return (
            <button
              key={cell.iso}
              type="button"
              role="gridcell"
              className={classes}
              onClick={() => setSelected(cell.iso)}
              aria-label={`${cell.day}${isToday ? ', today' : ''}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''}`}
            >
              <span className="day__num">
                <span className="day__n">{cell.day}</span>
                {isToday && <span className="day__today">Today</span>}
              </span>
              {cell.inMonth && (
                <>
                  <span className="day__chips">
                    {dayEvents.map((e) => (
                      <span key={e.id} className={`chip chip--${e.type}`}>
                        {LABEL[e.type]} {e.time}
                      </span>
                    ))}
                  </span>
                  <span className="day__dots">
                    {dayEvents.map((e) => (
                      <span key={e.id} className={`dot dot--${e.type}`} />
                    ))}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <div className="calendar__agenda" aria-live="polite">
        <h3 className="calendar__agenda-title">{selectedLabel}</h3>
        {selectedEvents.length === 0 ? (
          <p className="muted">No events. Rest day.</p>
        ) : (
          <ul className="agenda">
            {selectedEvents.map((e) => (
              <li key={e.id} className="agenda__item">
                <span className={`chip chip--${e.type}`}>{AGENDA_LABEL[e.type]}</span>
                <span className="agenda__time">{e.time} WIB</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
