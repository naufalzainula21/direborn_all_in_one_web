import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CurrentTournamentCard } from '../components/tournaments/CurrentTournament'
import { fetchGoals, type Goal } from '../data/api'
import { useEvents } from '../data/events'
import type { CalendarEvent, EventType } from '../data/types'
import { addDays, countdown, longToday, parseDay, shortDate, todayISO } from '../lib/format'
import { useRole } from '../lib/role'
import { startISO } from '../lib/schedule'
import { hasResult, outcomeOf } from '../lib/scrims'

const TYPE: Record<EventType, string> = { tournament: 'Match', scrim: 'Scrim', practice: 'Practice', other: 'Team' }
const what = (e: CalendarEvent) => (e.opponent && e.type !== 'practice' ? `vs ${e.opponent}` : e.title)
const dayName = (iso: string, today: string) =>
  iso === today ? 'Today' : iso === addDays(today, 1) ? 'Tomorrow' : parseDay(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

/** Owner, management and creative: everything at a glance, in plain words. */
export function OwnerHome({ now }: { now: Date }) {
  const { user } = useRole()
  const { events, series, openEvent } = useEvents()
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const today = todayISO(now)

  useEffect(() => { fetchGoals().then(({ goals: g }) => setGoals(g.filter((x) => x.scope === 'team'))).catch(() => setGoals([])) }, [])

  const s = useMemo(() => {
    const soon = events.filter((e) => e.date >= today && e.date <= addDays(today, 6) && new Date(startISO(e)).getTime() > now.getTime() - 2 * 3600_000)
    const nextMatch = events.find((e) => e.type === 'tournament' && new Date(startISO(e)).getTime() > now.getTime() - 2 * 3600_000)
    const monthAgo = addDays(today, -30)
    const scrims = events.filter((e) => e.type === 'scrim' && e.date >= monthAgo && e.date <= today && hasResult(e))
    const sw = scrims.filter((e) => outcomeOf(e) === 'win').length
    const sl = scrims.filter((e) => outcomeOf(e) === 'loss').length
    const played = series.filter((x) => x.won !== null && x.date >= monthAgo)
    const tw = played.filter((x) => x.won).length
    const results = [
      ...series.filter((x) => x.won !== null).slice(0, 4).map((x) => ({ key: x.key, date: x.date, label: `${x.tournament} · vs ${x.opp}`, score: `${x.w}–${x.l}`, win: x.won })),
      ...events.filter((e) => e.type === 'scrim' && hasResult(e)).slice(-4).map((e) => ({ key: e.id, date: e.date, label: `Scrim · vs ${e.opponent ?? e.title}`, score: `${e.scoreUs}–${e.scoreThem}`, win: outcomeOf(e) === 'draw' ? null : outcomeOf(e) === 'win' })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    return { soon, nextMatch, sw, sl, scrimCount: scrims.length, tw, tl: played.length - tw, results, week: soon.filter((e) => e.type === 'scrim').length }
  }, [events, series, today, now])

  const goalsDone = goals?.filter((g) => g.status === 'done').length ?? 0

  return (
    <>
      <div className="page-head">
        <span className="muted">{longToday(now)}</span>
        <h1 className="page-title">Hi {user.name.split(' ')[0]}</h1>
      </div>

      <section aria-label="At a glance" className="tiles">
        <div className="tile">
          <span className="tile__label">Next official match</span>
          {s.nextMatch ? (
            <>
              <span className="tile__value tile__value--sm">{what(s.nextMatch)}</span>
              <span className="tile__detail">{dayName(s.nextMatch.date, today)}{s.nextMatch.time !== 'TBD' ? ` · ${s.nextMatch.time} WIB · ${countdown(startISO(s.nextMatch), now)}` : ''}</span>
            </>
          ) : <span className="tile__value tile__value--sm">None booked</span>}
        </div>
        <div className="tile">
          <span className="tile__label">Official series · last 30 days</span>
          <span className="tile__value"><span className="record__w">{s.tw}W</span> <span className="record__l">{s.tl}L</span></span>
          <span className="tile__detail">Tournament matches</span>
        </div>
        <div className="tile">
          <span className="tile__label">Scrims · last 30 days</span>
          <span className="tile__value"><span className="record__w">{s.sw}W</span> <span className="record__l">{s.sl}L</span></span>
          <span className="tile__detail">{s.week} more booked this week</span>
        </div>
        <div className="tile tile--gold">
          <span className="tile__label">Team targets</span>
          <span className="tile__value">{goals ? `${goalsDone}/${goals.length}` : '…'}</span>
          <span className="tile__detail">{goals?.length ? 'done' : 'None set yet'}</span>
        </div>
      </section>

      <div className="home-grid">
        <div className="stack">
          <CurrentTournamentCard now={now} />

          <section className="card" aria-labelledby="o-week">
            <div className="card__head">
              <h2 id="o-week" className="card__title">This week</h2>
              <Link to="/schedule" className="link">Full schedule →</Link>
            </div>
            {s.soon.length === 0 ? <p className="muted">Nothing booked in the next 7 days.</p> : (
              <ul className="p-list">
                {s.soon.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="p-row" onClick={() => openEvent(e)}>
                      <span className="p-row__time">{dayName(e.date, today)}<span className="muted small"> {e.time === 'TBD' ? 'TBC' : e.time}</span></span>
                      <span className={`p-dot p-dot--${e.type}`} aria-hidden="true" />
                      <span className="p-row__text">
                        <span className="p-row__title">{what(e)}</span>
                        <span className="muted small">{TYPE[e.type]}{e.type === 'tournament' ? ` · ${e.title}` : ''}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="o-res">
            <div className="card__head">
              <h2 id="o-res" className="card__title">Latest results</h2>
              <Link to="/tournaments" className="link">All results →</Link>
            </div>
            {s.results.length === 0 ? <p className="muted">No results yet.</p> : (
              <ul className="p-results">
                {s.results.map((r) => (
                  <li key={r.key} className="p-results__row">
                    <span className="p-results__text"><span className="p-row__title">{r.label}</span><span className="muted small">{shortDate(r.date)}</span></span>
                    <span className={`badge ${r.win === null ? 'badge--neutral' : r.win ? 'badge--win' : 'badge--loss'}`}>{r.win === null ? 'Draw' : r.win ? 'Won' : 'Lost'} {r.score}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="o-goals">
            <div className="card__head">
              <h2 id="o-goals" className="card__title">Team targets</h2>
              <Link to="/goals" className="link">Open →</Link>
            </div>
            {!goals ? <p className="muted">Loading…</p> : goals.length === 0 ? <p className="muted">The manager or coach hasn’t set targets yet.</p> : (
              <ul className="o-goals">
                {goals.map((g) => (
                  <li key={g.id} className={g.status === 'done' ? 'is-done' : ''}>
                    <span className={`goal__check${g.status === 'done' ? ' is-done' : ''}`} aria-hidden="true">{g.status === 'done' ? '✓' : ''}</span>
                    <span className="p-row__title">{g.title}</span>
                    {g.due && g.status !== 'done' && <span className="muted small">by {shortDate(g.due)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
