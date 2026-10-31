import { useMemo, useState } from 'react'
import { useEvents } from '../data/events'
import { TournamentDialog } from '../components/tournaments/TournamentDialog'
import {
  bestFinish, calendar, nextMatch, pastTournaments, podiums, running, runningSeries, seriesFor, upcoming,
  type TournamentInfo,
} from '../data/tournaments'

export function Tournaments() {
  const { games, series, openMatch } = useEvents()
  const [open, setOpen] = useState<TournamentInfo | null>(null)
  const s19 = series.filter((s) => s.tourKey === 'EPL S19')

  const cards = useMemo(
    () => pastTournaments.map((t) => {
      const s = seriesFor(games, t.key)
      const w = s.filter((x) => x.won).length
      return { t, sub: s.length ? `Series ${w}–${s.length - w}` : 'Placement only', w, l: s.length - w }
    }),
    [games],
  )
  const seriesW = cards.reduce((n, c) => n + c.w, 0) + runningSeries.w
  const seriesL = cards.reduce((n, c) => n + c.l, 0) + runningSeries.l

  return (
    <>
      <div className="page-head">
        <span className="muted">Official matches · data from OpenDota, Hawk Live and E-Rankings</span>
        <h1 className="page-title">Tournaments</h1>
      </div>

      <section aria-label="Season summary" className="tiles">
        <div className="tile"><span className="tile__label">Tournaments</span><span className="tile__value">{pastTournaments.length + 1}</span><span className="tile__detail">Since June 2026</span></div>
        <div className="tile"><span className="tile__label">Series record</span><span className="tile__value"><span className="record__w">{seriesW}W</span> <span className="record__l">{seriesL}L</span></span><span className="tile__detail">Incl. EPL S19</span></div>
        <div className="tile"><span className="tile__label">Podium finishes</span><span className="tile__value">{podiums.count}</span><span className="tile__detail tile__detail--gold">{podiums.detail}</span></div>
        <div className="tile tile--gold"><span className="tile__label">Best finish</span><span className="tile__value tile__value--sm">{bestFinish.title}</span><span className="tile__detail">{bestFinish.detail}</span></div>
      </section>

      <div className="home-grid">
        <div className="stack">
          <section className="running" aria-labelledby="run-title">
            <div className="running__head">
              <div className="running__heading">
                <span className="running__eyebrow">Running now · {running.stage}</span>
                <h2 id="run-title" className="running__title">{running.name}</h2>
                <span className="running__info">{running.info}</span>
              </div>
              <div className="running__pos">
                <span className="tile__label">Direborn</span>
                <span className="running__pos-value">{running.position}</span>
                <span className="running__pos-status">{running.status}</span>
              </div>
            </div>
            <div className="running__grid">
              <div className="running__panel">
                <span className="running__panel-title">Standings</span>
                <ol className="standings">
                  {running.standings.map(([team, rec, maps], i) => (
                    <li key={team} className={`standings__row${team === 'Direborn' ? ' is-us' : ''}${i === 3 ? ' is-cut-upper' : ''}${i === 5 ? ' is-cut-playoff' : ''}`}>
                      <span className="standings__pos">{i + 1}</span>
                      <span className="standings__team">{team}</span>
                      <span className="standings__rec">{rec}</span>
                      <span className="standings__maps">{maps}</span>
                    </li>
                  ))}
                </ol>
                <span className="muted small">Top 4 upper bracket · 5–6 lower bracket</span>
              </div>
              <div className="running__panel">
                <span className="running__panel-title">Direborn matches</span>
                <ul className="run-matches">
                  {running.matches.map((m) => {
                    const key = s19.find((s) => s.opp === m.opp)?.key
                    return (
                      <li key={m.opp}>
                        <button type="button" className="run-matches__row" onClick={() => key && openMatch(key)}>
                          <span className="muted small run-matches__date">{m.date}</span>
                          <span className="run-matches__opp">{m.opp}</span>
                          <span className="score">{m.score}</span>
                          <span className={`badge badge--${m.res === 'W' ? 'win' : m.res === 'L' ? 'loss' : 'next'}`}>{m.res}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <span className="muted small">Game scoreboards appear once OpenDota records this league.</span>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="past-title">
            <div className="card__head">
              <h2 id="past-title" className="card__title">Past results</h2>
              <span className="muted small">Open a tournament for highlights and match summaries</span>
            </div>
            <div className="tour-cards">
              {cards.map(({ t, sub }) => (
                <button key={t.key} type="button" className="tour-card" onClick={() => setOpen(t)}>
                  <span className="tour-card__top">
                    <span className="muted small">{t.dates}</span>
                    <span className={`badge badge--${t.tone}`}>{t.place}</span>
                  </span>
                  <span className="tour-card__name">{t.name}</span>
                  <span className="muted small">{sub}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="next-title">
            <h2 id="next-title" className="card__title">Next up</h2>
            <div className="feature feature--col">
              <span className="feature__meta">{nextMatch.label}</span>
              <span className="feature__name">{nextMatch.title}</span>
              <span className="feature__meta">{nextMatch.detail}</span>
            </div>
            <ul className="upcoming">
              {upcoming.map((u) => (
                <li key={u.name} className="upcoming__item upcoming__item--col">
                  <span className="upcoming__top">
                    <span className="upcoming__name">{u.name}</span>
                    <span className={`badge badge--${u.tone}`}>{u.status}</span>
                  </span>
                  <span className="small">{u.qual}</span>
                  <span className="muted small">{u.main}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="cal-title2">
            <h2 id="cal-title2" className="card__title">Tournament calendar</h2>
            <ul className="side-list">
              {calendar.map((c) => (
                <li key={c.title} className="side-list__item">
                  <span className={`date-box date-box--sm${c.next ? ' is-today' : ''}`}>
                    <span className="date-box__dow">{c.mon}</span>
                    <span className="date-box__num">{c.day}</span>
                  </span>
                  <span className="side-list__text">
                    <span className="side-list__title side-list__title--display">{c.title}</span>
                    <span className="muted small">{c.sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <TournamentDialog tour={open} games={games} onClose={() => setOpen(null)} />
    </>
  )
}
