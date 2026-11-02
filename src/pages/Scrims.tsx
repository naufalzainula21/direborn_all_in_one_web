import { useMemo, useRef, useState } from 'react'
import { useEvents } from '../data/events'
import type { CalendarEvent } from '../data/types'
import { countdown, longToday, parseDay, todayISO } from '../lib/format'
import { startISO } from '../lib/schedule'
import { hasResult, isPast, opponentOf, outcomeOf, OUTCOME_LABEL, OUTCOME_TONE } from '../lib/scrims'
import { Icon } from '../components/Icon'
import { canAddType, canEnterResults } from '../lib/permissions'
import { useRole } from '../lib/role'
import { pct, reportNotes, reportPhases, reportSeries, reportSplits, phaseShort, type SplitRecord } from '../data/scrimReport'

const PER_PAGE = 5

function DateBox({ iso, today }: { iso: string; today: string }) {
  const d = parseDay(iso)
  const isToday = iso === today
  return (
    <span className={`date-box date-box--sm${isToday ? ' is-today' : ''}`}>
      <span className="date-box__dow">{isToday ? 'Today' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
      <span className="date-box__num">{d.getDate()} {d.toLocaleDateString('en-GB', { month: 'short' })}</span>
    </span>
  )
}

function SplitBars({ rows }: { rows: SplitRecord[] }) {
  return (
    <ul className="split-bars">
      {rows.map((r) => (
        <li key={r.label} className="split-bars__row">
          <span className="split-bars__label">{r.label}</span>
          <span className="split-bars__track" aria-hidden="true"><span className="split-bars__fill" style={{ width: `${pct(r)}%` }} /></span>
          <span className="split-bars__value"><strong>{r.w + r.l ? `${pct(r)}%` : '—'}</strong> <span className="muted">{r.w}–{r.l}</span></span>
        </li>
      ))}
    </ul>
  )
}

function ReportCard() {
  const { openEvent, events } = useEvents()
  const [phase, setPhase] = useState('all')
  const list = phase === 'all' ? reportSeries : reportSeries.filter((x) => x.phase === phase)
  const sp = reportSplits(list)
  const notes = reportNotes()
  const evFor = (key: string) => events.find((e) => e.reportKey === key)
  return (
    <section className="card" aria-labelledby="report-title-card">
      <div className="card__head">
        <div className="card__title-row">
          <h2 id="report-title-card" className="card__title">Scrim report</h2>
          <span className="muted small">{list.length} scrims · {sp.all.w + sp.all.l} games</span>
        </div>
      </div>
      <div className="segmented segmented--wrap" role="group" aria-label="Roster phase">
        {[{ id: 'all', label: 'All' }, ...[...reportPhases].reverse()].map((p) => (
          <button key={p.id} type="button" className={`segmented__btn${phase === p.id ? ' is-active' : ''}`} aria-pressed={phase === p.id} onClick={() => setPhase(p.id)}>
            {p.id === 'all' ? 'All' : phaseShort(p.id)}
          </button>
        ))}
      </div>
      <div className="report-split">
        <div><h3 className="report-split__title">Game win rate</h3><SplitBars rows={[sp.all]} /></div>
        <div><h3 className="report-split__title">By side</h3><SplitBars rows={sp.side} /></div>
        <div><h3 className="report-split__title">By draft</h3><SplitBars rows={sp.pick} /></div>
        {phase === 'all' && <div><h3 className="report-split__title">By roster phase</h3><SplitBars rows={[...sp.phase].reverse()} /></div>}
      </div>
      {notes.length > 0 && phase === 'all' && (
        <div>
          <h3 className="report-split__title">Feedback</h3>
          <ul className="side-list">
            {notes.map((n) => {
              const ev = evFor(n.series.key)
              return (
                <li key={`${n.series.key}-${n.game}`}>
                  <button type="button" className="side-list__item side-list__item--btn" disabled={!ev} onClick={() => ev && openEvent(ev)}>
                    <span className="side-list__text">
                      <span className="side-list__title">“{n.note}”</span>
                      <span className="muted small">vs {n.series.opp} · G{n.game} · {parseDay(n.series.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

function ResultsPager({ list, today }: { list: CalendarEvent[]; today: string }) {
  const { openEvent } = useEvents()
  const track = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const pages: CalendarEvent[][] = []
  for (let i = 0; i < list.length; i += PER_PAGE) pages.push(list.slice(i, i + PER_PAGE))
  const go = (p: number) => {
    const el = track.current
    if (!el) return
    const n = Math.max(0, Math.min(pages.length - 1, p))
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
    setPage(n)
  }
  return (
    <>
      <div className="pager" ref={track} onScroll={() => { const el = track.current; if (el) setPage(Math.round(el.scrollLeft / el.clientWidth)) }}>
        {pages.map((items, i) => (
          <ul key={i} className="pager__page" aria-label={`Page ${i + 1} of ${pages.length}`}>
            {items.map((e) => {
              const o = outcomeOf(e)!
              return (
                <li key={e.id}>
                  <button type="button" className="match-row" onClick={() => openEvent(e)}>
                    <DateBox iso={e.date} today={today} />
                    <span className="match-row__main">
                      <span className="match-row__opp">vs {opponentOf(e)}</span>
                      <span className="muted small">{e.source === 'report' ? '' : `${e.time} WIB · `}{e.detail}{e.matchIds?.length ? ` · ${e.matchIds.length} game ${e.matchIds.length === 1 ? 'link' : 'links'}` : ''}</span>
                    </span>
                    <span className="score">{e.scoreUs}–{e.scoreThem}</span>
                    <span className={`badge badge--${OUTCOME_TONE[o]}`}>{OUTCOME_LABEL[o]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
      {pages.length > 1 && (
        <div className="pager__nav">
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Newer results" disabled={page === 0} onClick={() => go(page - 1)}><Icon name="chevronLeft" size={16} /></button>
          <span className="pager__dots" aria-hidden="true">{pages.map((_, i) => <span key={i} className={`pager__dot${i === page ? ' is-active' : ''}`} />)}</span>
          <span className="muted small">Page {page + 1} of {pages.length}</span>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Older results" disabled={page === pages.length - 1} onClick={() => go(page + 1)}><Icon name="chevronRight" size={16} /></button>
        </div>
      )}
    </>
  )
}

export function Scrims({ now }: { now: Date }) {
  const { events, source, openAdd, openEvent, openResult } = useEvents()
  const { role } = useRole()
  const today = todayISO(now)
  const scrims = useMemo(() => events.filter((e) => e.type === 'scrim'), [events])

  const upcoming = scrims.filter((e) => !isPast(e, now) && !hasResult(e))
  const needsResult = scrims.filter((e) => isPast(e, now) && !hasResult(e)).reverse()
  const results = scrims.filter(hasResult).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))

  const wins = results.filter((e) => outcomeOf(e) === 'win').length
  const losses = results.filter((e) => outcomeOf(e) === 'loss').length
  const draws = results.length - wins - losses
  const gamesW = results.reduce((n, e) => n + (e.scoreUs ?? 0), 0)
  const gamesL = results.reduce((n, e) => n + (e.scoreThem ?? 0), 0)
  const month = today.slice(0, 7)
  const thisMonth = scrims.filter((e) => e.date.startsWith(month)).length

  const byOpp = useMemo(() => {
    const map = new Map<string, { w: number; l: number; d: number; gw: number; gl: number; last: string }>()
    for (const e of results) {
      const k = opponentOf(e)
      const r = map.get(k) ?? { w: 0, l: 0, d: 0, gw: 0, gl: 0, last: e.date }
      const o = outcomeOf(e)
      if (o === 'win') r.w++; else if (o === 'loss') r.l++; else r.d++
      r.gw += e.scoreUs ?? 0; r.gl += e.scoreThem ?? 0
      if (e.date > r.last) r.last = e.date
      map.set(k, r)
    }
    return [...map.entries()].sort((a, b) => (b[1].w + b[1].l + b[1].d) - (a[1].w + a[1].l + a[1].d))
  }, [results])

  const next = upcoming[0]

  return (
    <>
      <div className="page-head page-head--row">
        <div className="page-head">
          <span className="muted">{longToday(now)}</span>
          <h1 className="page-title">Scrims</h1>
        </div>
        {canAddType(role, 'scrim') && (
          <button type="button" className="btn btn--primary" onClick={() => openAdd(today, 'scrim')}>
            <Icon name="plus" size={16} strokeWidth={2.4} /><span className="btn__label">Book scrim</span>
          </button>
        )}
      </div>
      {source === 'offline' && <p className="notice">The shared database isn't reachable right now, so scrims can't load or save.</p>}

      <section aria-label="Scrim summary" className="tiles">
        <div className="tile"><span className="tile__label">Record</span>
          <span className="tile__value"><span className="record__w">{wins}W</span> <span className="record__l">{losses}L</span>{draws ? <span className="muted"> {draws}D</span> : null}</span>
          <span className="tile__detail">{results.length} scrims with results</span></div>
        <div className="tile"><span className="tile__label">Games</span>
          <span className="tile__value">{gamesW}–{gamesL}</span>
          <span className="tile__detail">{gamesW + gamesL ? `${Math.round((100 * gamesW) / (gamesW + gamesL))}% won` : 'No games yet'}</span></div>
        <div className="tile"><span className="tile__label">This month</span>
          <span className="tile__value">{thisMonth}</span>
          <span className="tile__detail">{upcoming.length} upcoming</span></div>
        <button type="button" className="tile tile--gold tile--btn" disabled={!next} onClick={() => next && openEvent(next)}>
          <span className="tile__label">Next scrim</span>
          <span className="tile__value tile__value--sm">{next ? `vs ${opponentOf(next)}` : 'None booked'}</span>
          <span className="tile__detail">{next ? `${next.date === today ? 'Today' : parseDay(next.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${next.time} WIB · ${countdown(startISO(next), now)}` : 'Tap Book scrim to add one'}</span>
        </button>
      </section>

      <div className="home-grid">
        <div className="stack">
          {needsResult.length > 0 && canEnterResults(role) && (
            <section className="card card--alert" aria-labelledby="needs-title">
              <div className="card__head">
                <h2 id="needs-title" className="card__title">Needs a result</h2>
                <span className="badge badge--next">{needsResult.length}</span>
              </div>
              <ul className="side-list">
                {needsResult.map((e) => (
                  <li key={e.id} className="side-list__item">
                    <DateBox iso={e.date} today={today} />
                    <span className="side-list__text">
                      <span className="side-list__title">vs {opponentOf(e)}</span>
                      <span className="muted small">{e.time} WIB · {e.detail}</span>
                    </span>
                    {canEnterResults(role) && <button type="button" className="btn btn--primary btn--sm" onClick={() => openResult(e)}>Add result</button>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card" aria-labelledby="sched-title">
            <div className="card__head">
              <h2 id="sched-title" className="card__title">Scrim schedule</h2>
              <span className="muted small">{upcoming.length} upcoming</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="empty">
                <p>No scrims booked yet.</p>
                {canAddType(role, 'scrim') && <button type="button" className="ghost-btn" onClick={() => openAdd(today, 'scrim')}>+ Book scrim</button>}
              </div>
            ) : (
              <ul className="side-list">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="side-list__item side-list__item--btn" onClick={() => openEvent(e)}>
                      <DateBox iso={e.date} today={today} />
                      <span className="side-list__text">
                        <span className="side-list__title">vs {opponentOf(e)}</span>
                        <span className="muted small">{e.time} WIB · {e.detail} · {countdown(startISO(e), now)}</span>
                      </span>
                      {e.status === 'pending'
                        ? <span className="badge badge--review">Pending</span>
                        : <span className="badge badge--win">Confirmed</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="res-list-title">
            <div className="card__head">
              <div className="card__title-row">
                <h2 id="res-list-title" className="card__title">Results</h2>
                <span className="record"><span className="record__w">{wins}W</span> <span className="record__l">{losses}L</span>{draws ? ` ${draws}D` : ''}</span>
              </div>
            </div>
            {results.length === 0
              ? <p className="muted">No results yet. After a scrim, tap it and choose Add result.</p>
              : <ResultsPager list={results} today={today} />}
          </section>
        </div>

        <div className="stack">
          <ReportCard />
          <section className="card" aria-labelledby="opp-title">
            <h2 id="opp-title" className="card__title">Record by opponent</h2>
            {byOpp.length === 0 ? <p className="muted small">Shows once results are in.</p> : (
              <div className="table-wrap">
                <table className="table table--compact">
                  <thead><tr><th>Team</th><th>Series</th><th>Games</th></tr></thead>
                  <tbody>
                    {byOpp.map(([team, r]) => (
                      <tr key={team}>
                        <td className="strong">{team}</td>
                        <td><span className="record__w">{r.w}</span>–<span className="record__l">{r.l}</span>{r.d ? `–${r.d}` : ''}</td>
                        <td className="muted">{r.gw}–{r.gl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="card" aria-labelledby="how-title">
            <h2 id="how-title" className="card__title">How it works</h2>
            <ol className="how">
              <li><strong>Book scrim</strong> with the opponent, time and format. Mark it Pending until they confirm.</li>
              <li>After you play, it moves to <strong>Needs a result</strong>. Enter the score.</li>
              <li>Add match IDs if you want Dotabuff links for each game.</li>
              <li>Older scrims come from the team report sheet. Tap one for sides, picks, kills, VODs and feedback.</li>
            </ol>
          </section>
        </div>
      </div>
    </>
  )
}

