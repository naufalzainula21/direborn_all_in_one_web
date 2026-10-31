import { useMemo } from 'react'
import { useEvents } from '../data/events'
import type { CalendarEvent } from '../data/types'
import { addDays, countdown, longToday, parseDay, todayISO } from '../lib/format'
import { nextTournamentMatch, startISO } from '../lib/schedule'
import { MonthCalendar } from '../components/home/MonthCalendar'
import { UpcomingTournaments } from '../components/home/UpcomingTournaments'
import { Icon } from '../components/Icon'

interface Task {
  id: string
  due: string
  kind: 'poster' | 'live' | 'result' | 'activity'
  label: string
  sub: string
  open: () => void
}

const KIND: Record<Task['kind'], [string, string]> = {
  poster: ['Poster', 'badge--gold'],
  live: ['Match day', 'badge--next'],
  result: ['Result post', 'badge--win'],
  activity: ['Activity', 'badge--neutral'],
}

/** Creative view: content to make around match days, team activities, tournament calendar. */
export function CreativeHome({ now }: { now: Date }) {
  const { events, series, openAdd, openEvent, openMatch } = useEvents()
  const today = todayISO(now)
  const planEvents = useMemo(() => events.filter((e) => e.type === 'tournament' || e.type === 'other'), [events])
  // Matches not finished yet (a series counts as over ~3h after it starts).
  const matches = planEvents.filter((e) => e.type === 'tournament' && e.date >= today && new Date(startISO(e)).getTime() > now.getTime() - 3 * 3600_000)
  const activities = planEvents.filter((e) => e.type === 'other' && e.date >= today)
  const matchDays = new Set(matches.filter((e) => e.date <= addDays(today, 14)).map((e) => e.date)).size
  const recent = series.filter((s) => s.won !== null && s.date >= addDays(today, -1))
  const next = nextTournamentMatch(events, now)

  const tasks = useMemo(() => {
    const list: Task[] = []
    const vs = (e: CalendarEvent) => (e.opponent ? `vs ${e.opponent}` : e.title)
    for (const e of matches.filter((x) => x.date <= addDays(today, 10))) {
      const pre = addDays(e.date, -1)
      list.push({ id: `${e.id}-poster`, due: pre < today ? today : pre, kind: 'poster', label: `Match-day poster ${vs(e)}`, sub: `${e.title} · plays ${parseDay(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}${e.time !== 'TBD' ? ` ${e.time} WIB` : ''}`, open: () => openEvent(e) })
      list.push({ id: `${e.id}-live`, due: e.date, kind: 'live', label: `Live updates ${vs(e)}`, sub: `${e.title} · ${e.detail}`, open: () => openEvent(e) })
    }
    for (const s of recent) {
      list.push({ id: `${s.key}-result`, due: s.date, kind: 'result', label: `Result post vs ${s.opp} (${s.w}–${s.l} ${s.won ? 'win' : 'loss'})`, sub: s.tournament, open: () => openMatch(s.key) })
    }
    for (const e of activities.filter((x) => x.date <= addDays(today, 10))) {
      list.push({ id: `${e.id}-act`, due: e.date, kind: 'activity', label: e.title, sub: `${e.time !== 'TBD' ? `${e.time} WIB · ` : ''}${e.detail}`, open: () => openEvent(e) })
    }
    return list.sort((a, b) => a.due.localeCompare(b.due))
  }, [matches, recent, activities, today, openEvent, openMatch])

  return (
    <>
      <div className="page-head page-head--row">
        <div className="page-head">
          <span className="muted">{longToday(now)}</span>
          <h1 className="page-title">Creative planner</h1>
        </div>
        <div className="c-actions">
          <button type="button" className="btn btn--primary" onClick={() => openAdd(today, 'tournament')}>
            <Icon name="trophy" size={16} /><span className="btn__label">Tournament match</span>
          </button>
          <button type="button" className="btn btn--outline" onClick={() => openAdd(today, 'other')}>
            <Icon name="sparkle" size={16} /><span className="btn__label">Activity</span>
          </button>
        </div>
      </div>

      <section className="tiles" aria-label="Planner summary">
        <div className="tile"><span className="tile__label">Match days</span><span className="tile__value">{matchDays}</span><span className="tile__detail">Next 14 days</span></div>
        <div className="tile"><span className="tile__label">Content due</span><span className="tile__value">{tasks.filter((t) => t.due <= addDays(today, 2)).length}</span><span className="tile__detail">Today to {parseDay(addDays(today, 2)).toLocaleDateString('en-GB', { weekday: 'short' })}</span></div>
        <div className="tile"><span className="tile__label">Activities</span><span className="tile__value">{activities.length}</span><span className="tile__detail">Coming up</span></div>
        <button type="button" className="tile tile--gold tile--btn" disabled={!next} onClick={() => next && openEvent(next)}>
          <span className="tile__label">Next match</span>
          <span className="tile__value tile__value--sm">{next ? (next.opponent ? `vs ${next.opponent}` : next.title) : 'None scheduled'}</span>
          <span className="tile__detail">{next ? (next.time === 'TBD' ? 'Time TBD' : countdown(startISO(next), now)) : 'Add one with Tournament match'}</span>
        </button>
      </section>

      <div className="home-grid">
        <div className="stack">
          <section className="card" aria-labelledby="queue-title">
            <div className="card__head">
              <h2 id="queue-title" className="card__title">Content queue</h2>
              <span className="muted small">Built from the schedule · next 10 days</span>
            </div>
            {tasks.length === 0 ? <p className="muted">Nothing due. Add a tournament match or activity to plan content around it.</p> : (
              <ul className="side-list">
                {tasks.map((t) => {
                  const late = t.due < today
                  return (
                    <li key={t.id}>
                      <button type="button" className="side-list__item side-list__item--btn" onClick={t.open}>
                        <span className={`date-box date-box--sm${t.due === today ? ' is-today' : ''}`}>
                          <span className="date-box__dow">{t.due === today ? 'Today' : parseDay(t.due).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                          <span className="date-box__num">{parseDay(t.due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </span>
                        <span className="side-list__text">
                          <span className="side-list__title">{t.label}</span>
                          <span className="muted small">{late ? 'Yesterday · ' : ''}{t.sub}</span>
                        </span>
                        <span className={`badge ${KIND[t.kind][1]}`}>{KIND[t.kind][0]}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          <MonthCalendar events={planEvents} today={now} />
        </div>
        <div className="stack">
          <section className="card" aria-labelledby="act-title">
            <div className="card__head">
              <h2 id="act-title" className="card__title">Team activities</h2>
              <button type="button" className="link link--btn" onClick={() => openAdd(today, 'other')}>+ Add</button>
            </div>
            {activities.length === 0 ? (
              <p className="muted small">No activities yet. Add photo shoots, streams, meet-ups or sponsor events with Activity.</p>
            ) : (
              <ul className="side-list">
                {activities.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <button type="button" className="side-list__item side-list__item--btn" onClick={() => openEvent(e)}>
                      <span className="side-list__text">
                        <span className="side-list__title">{e.title}</span>
                        <span className="muted small">{parseDay(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {e.time === 'TBD' ? 'Time TBD' : `${e.time} WIB`}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <UpcomingTournaments now={now} />
        </div>
      </div>
    </>
  )
}
