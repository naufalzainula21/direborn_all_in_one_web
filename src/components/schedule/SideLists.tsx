import { Link } from 'react-router-dom'
import type { CalendarEvent } from '../../data/types'
import { useEvents } from '../../data/events'
import { countdown, matchTime, parseDay } from '../../lib/format'
import { formatOf, stageOf, startISO, type TournamentSummary } from '../../lib/schedule'
import { Icon } from '../Icon'
import { DOW } from './meta'

function DateBox({ iso, today }: { iso: string; today: string }) {
  const d = parseDay(iso)
  const isToday = iso === today
  return (
    <span className={`date-box${isToday ? ' is-today' : ''}`}>
      <span className="date-box__dow">{isToday ? 'Today' : DOW[d.getDay()]}</span>
      <span className="date-box__num">{d.getDate()} {d.toLocaleDateString('en-GB', { month: 'short' })}</span>
    </span>
  )
}

export function NextTournamentCard({ t, now }: { t?: TournamentSummary; now: Date }) {
  if (!t) {
    return (
      <section className="next-tour" aria-labelledby="nt-title">
        <div className="next-tour__head">
          <span className="feature__icon"><Icon name="trophy" size={22} /></span>
          <span className="next-tour__heading">
            <span className="next-tour__eyebrow">Next tournament</span>
            <h2 id="nt-title" className="next-tour__name">Nothing scheduled</h2>
          </span>
        </div>
      </section>
    )
  }
  const first = t.first
  const start = startISO(first)
  const facts: [string, string][] = [
    ['Dates', t.dates],
    ['Matches', `${t.matches.length} scheduled`],
    ['Next round', stageOf(first) ?? '—'],
    ['Format', formatOf(first) ?? '—'],
  ]
  return (
    <section className="next-tour" aria-labelledby="nt-title">
      <div className="next-tour__head">
        <span className="feature__icon"><Icon name="trophy" size={22} /></span>
        <span className="next-tour__heading">
          <span className="next-tour__eyebrow">Next tournament</span>
          <h2 id="nt-title" className="next-tour__name">{t.name}</h2>
        </span>
      </div>
      <dl className="next-tour__facts">
        {facts.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <div className="next-tour__match">
        <span className="next-tour__match-text">
          <span className="next-tour__match-label">Next match</span>
          <span className="next-tour__match-name">
            {first.opponent ? `vs ${first.opponent} · ` : ''}{first.time === 'TBD' ? 'Time TBD' : matchTime(start, now)}
          </span>
        </span>
        {first.time !== 'TBD' && (
          <span className="next-tour__countdown">{countdown(start, now).replace('Starts in ', 'In ')}</span>
        )}
      </div>
    </section>
  )
}

export function TournamentSchedule({ events, today }: { events: CalendarEvent[]; today: string }) {
  const { openEvent } = useEvents()
  const list = events.filter((e) => e.type === 'tournament' && e.date >= today).slice(0, 5)
  return (
    <section className="card" aria-labelledby="ts-title">
      <h2 id="ts-title" className="card__title">Tournament schedule</h2>
      {list.length === 0 ? (
        <p className="muted">No tournament matches scheduled.</p>
      ) : (
        <ul className="side-list">
          {list.map((e) => (
            <li key={e.id}>
              <button type="button" className="side-list__item side-list__item--btn" onClick={() => openEvent(e)}>
                <DateBox iso={e.date} today={today} />
                <span className="side-list__text">
                  <span className="side-list__title side-list__title--display">{e.title}</span>
                  <span className="muted small">{e.detail}</span>
                </span>
                <span className="side-list__time">{e.time}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ScrimSchedule({ events, today }: { events: CalendarEvent[]; today: string }) {
  const { openEvent } = useEvents()
  const list = events.filter((e) => e.type === 'scrim' && e.date >= today).slice(0, 6)
  return (
    <section className="card" aria-labelledby="ss-title">
      <div className="card__head">
        <h2 id="ss-title" className="card__title">Scrim schedule</h2>
        <Link to="/scrims" className="link">All scrims →</Link>
      </div>
      {list.length === 0 ? (
        <p className="muted">No scrims booked.</p>
      ) : (
        <ul className="side-list">
          {list.map((e) => (
            <li key={e.id}>
              <button type="button" className="side-list__item side-list__item--btn" onClick={() => openEvent(e)}>
              <DateBox iso={e.date} today={today} />
              <span className="side-list__text">
                <span className="side-list__title">{e.opponent}</span>
                <span className="muted small">{e.time} · {e.detail}</span>
              </span>
              {e.status === 'confirmed' && <span className="badge badge--win">Confirmed</span>}
              {e.status === 'pending' && <span className="badge badge--review">Pending</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
