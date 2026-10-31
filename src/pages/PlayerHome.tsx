import { useMemo } from 'react'
import { useEvents } from '../data/events'
import type { CalendarEvent, EventType } from '../data/types'
import { addDays, countdown, longToday, parseDay, todayISO } from '../lib/format'
import { startISO } from '../lib/schedule'
import { hasResult, outcomeOf } from '../lib/scrims'

const TYPE: Record<EventType, string> = { tournament: 'Match', scrim: 'Scrim', practice: 'Practice', other: 'Team' }

/** Still worth showing: not started yet, or started under 2 hours ago. */
const notOver = (e: CalendarEvent, now: Date) => new Date(startISO(e)).getTime() > now.getTime() - 2 * 3600_000

const whatOf = (e: CalendarEvent) =>
  e.opponent && e.type !== 'practice' ? `vs ${e.opponent}` : e.title

function Row({ e }: { e: CalendarEvent }) {
  const { openEvent } = useEvents()
  return (
    <li>
      <button type="button" className="p-row" onClick={() => openEvent(e)}>
        <span className="p-row__time">{e.time === 'TBD' ? 'TBD' : e.time}</span>
        <span className={`p-dot p-dot--${e.type}`} aria-hidden="true" />
        <span className="p-row__text">
          <span className="p-row__title">{whatOf(e)}</span>
          <span className="muted small">{TYPE[e.type]}{e.type === 'tournament' ? ` · ${e.title}` : ''} · {e.detail}</span>
        </span>
      </button>
    </li>
  )
}

/** Player view: compact, schedule first. */
export function PlayerHome({ now }: { now: Date }) {
  const { events, series } = useEvents()
  const today = todayISO(now)
  const end = addDays(today, 7)
  const upcoming = useMemo(() => events.filter((e) => e.date >= today && e.date <= end && notOver(e, now)), [events, today, end, now])
  const next = upcoming[0]
  const todays = upcoming.filter((e) => e.date === today)
  const week = upcoming.filter((e) => e.date > today)
  const days = [...new Set(week.map((e) => e.date))]

  const latest = useMemo(() => {
    const scrim = events.filter((e) => e.type === 'scrim' && hasResult(e)).slice(-1)[0]
    const off = series.find((s) => s.won !== null)
    const list: { key: string; date: string; label: string; score: string; win: boolean | null }[] = []
    if (off) list.push({ key: off.key, date: off.date, label: `${off.tournament} vs ${off.opp}`, score: `${off.w}–${off.l}`, win: off.won })
    if (scrim) { const o = outcomeOf(scrim); list.push({ key: scrim.id, date: scrim.date, label: `Scrim vs ${scrim.opponent ?? scrim.title}`, score: `${scrim.scoreUs}–${scrim.scoreThem}`, win: o === 'draw' ? null : o === 'win' }) }
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [events, series])

  const { openEvent } = useEvents()
  const nextStart = next ? startISO(next) : ''

  return (
    <div className="p-home">
      <div className="page-head">
        <span className="muted">{longToday(now)}</span>
        <h1 className="page-title">Your schedule</h1>
      </div>

      {next ? (
        <button type="button" className={`p-next p-next--${next.type}`} onClick={() => openEvent(next)}>
          <span className="p-next__eyebrow">Up next · {TYPE[next.type]}</span>
          <span className="p-next__title">{whatOf(next)}</span>
          <span className="p-next__meta">
            {next.date === today ? 'Today' : parseDay(next.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
            {next.time !== 'TBD' ? ` · ${next.time} WIB` : ' · time TBD'}
            {next.type === 'tournament' ? ` · ${next.title}` : ''}
          </span>
          {next.time !== 'TBD' && <span className="p-next__count">{countdown(nextStart, now)}</span>}
        </button>
      ) : (
        <div className="p-next p-next--empty"><span className="p-next__title">Nothing in the next 7 days</span><span className="p-next__meta">Check back later or ask the coach.</span></div>
      )}

      <section className="card p-card" aria-labelledby="p-today">
        <h2 id="p-today" className="card__title">Today</h2>
        {todays.length ? <ul className="p-list">{todays.map((e) => <Row key={e.id} e={e} />)}</ul>
          : <p className="muted">Nothing on today.</p>}
      </section>

      <section className="card p-card" aria-labelledby="p-week">
        <h2 id="p-week" className="card__title">Next 7 days</h2>
        {days.length === 0 ? <p className="muted">Nothing booked yet.</p> : days.map((d) => (
          <div key={d} className="p-day">
            <h3 className="p-day__head">{parseDay(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}{d === addDays(today, 1) ? ' · Tomorrow' : ''}</h3>
            <ul className="p-list">{week.filter((e) => e.date === d).map((e) => <Row key={e.id} e={e} />)}</ul>
          </div>
        ))}
      </section>

      {latest.length > 0 && (
        <section className="card p-card" aria-labelledby="p-last">
          <h2 id="p-last" className="card__title">Latest results</h2>
          <ul className="p-results">
            {latest.map((r) => (
              <li key={r.key} className="p-results__row">
                <span className="p-results__text"><span className="p-row__title">{r.label}</span><span className="muted small">{parseDay(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></span>
                <span className={`badge ${r.win === null ? 'badge--neutral' : r.win ? 'badge--win' : 'badge--loss'}`}>{r.score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
