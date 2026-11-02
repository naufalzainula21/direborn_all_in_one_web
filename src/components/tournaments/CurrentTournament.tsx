import { useEffect, useMemo, useRef, useState } from 'react'
import { refreshTournament, type DirebornMatch, type LpMatch, type TournamentData } from '../../data/api'
import { useEvents } from '../../data/events'
import { addDays, countdown, parseDay, shortDate, todayISO } from '../../lib/format'
import { canImport } from '../../lib/permissions'
import { useRole } from '../../lib/role'
import { Icon } from '../Icon'

const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`
const startOf = (m: { date: string | null; time: string }) => `${m.date}T${m.time === 'TBD' ? '23:59' : m.time}:00+07:00`
const dateRange = (t: TournamentData) => t.startDate && t.endDate ? `${shortDate(t.startDate)} – ${shortDate(t.endDate)}` : t.startDate ? `From ${shortDate(t.startDate)}` : 'Dates TBA'

/** The imported tournament that matters now: running, else next, else the latest one. */
// eslint-disable-next-line react-refresh/only-export-components
export function pickCurrent(list: TournamentData[], now: Date): TournamentData | null {
  const today = todayISO(now)
  const mine = list.filter((t) => t.participating)
  const running = mine.find((t) => t.startDate && t.startDate <= addDays(today, 1) && (!t.endDate || t.endDate >= addDays(today, -1)))
  if (running) return running
  const next = mine.filter((t) => t.startDate && t.startDate > today).sort((a, b) => a.startDate!.localeCompare(b.startDate!))[0]
  return next ?? mine[0] ?? null
}

function summary(t: TournamentData, now: Date) {
  const today = todayISO(now)
  const group = t.groups.find((g) => g.rows.some((r) => r.us))
  const pos = group ? group.rows.findIndex((r) => r.us) : -1
  const row = group?.rows[pos]
  const next = t.direborn.find((m) => !m.finished && new Date(startOf(m)).getTime() > now.getTime() - 3 * 3600_000)
  const last = [...t.direborn].reverse().find((m) => m.finished)
  const phase = t.startDate && t.startDate > today ? `Starts ${shortDate(t.startDate)}` : t.endDate && t.endDate < today ? 'Finished' : 'Running now'
  const inPlayoffs = t.bracket.some((r) => r.matches.some((m) => /direborn/i.test(m.team1 + m.team2)))
  return { group, pos, row, next, last, phase, inPlayoffs }
}

/** Big card: event summary, Direborn's position and next match. Click to open the full schedule and standings. */
export function CurrentTournamentCard({ now, compact }: { now: Date; compact?: boolean }) {
  const { tournaments } = useEvents()
  const [open, setOpen] = useState(false)
  const t = useMemo(() => pickCurrent(tournaments, now), [tournaments, now])
  if (!t) return null
  const s = summary(t, now)

  return (
    <>
      <button type="button" className="running live-tour" onClick={() => setOpen(true)} aria-label={`${t.name}: open schedule and standings`}>
        <span className="running__head">
          <span className="running__heading">
            <span className="running__eyebrow">{s.phase}{s.inPlayoffs ? ' · Playoffs' : s.group ? ' · Group stage' : ''}</span>
            <span className="running__title">{t.name}</span>
            <span className="running__info">{[dateRange(t), t.prize, t.type].filter(Boolean).join(' · ')}</span>
          </span>
          {s.row && (
            <span className="running__pos">
              <span className="tile__label">Direborn</span>
              <span className="running__pos-value">{ordinal(s.pos + 1)} of {s.group!.rows.length}</span>
              <span className="running__pos-status">{s.row.w}W {s.row.l}L{s.group!.showPoints ? ` · ${s.row.pts} pts` : ''}</span>
            </span>
          )}
        </span>
        {s.next ? (
          <span className="live-tour__next">
            <span className="live-tour__label">Next match</span>
            <span className="live-tour__match">vs {s.next.opponent}</span>
            <span className="live-tour__when">
              {parseDay(s.next.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              {s.next.time !== 'TBD' ? ` · ${s.next.time} WIB · ${countdown(startOf(s.next), now)}` : ' · time TBC'} · {s.next.stage} · Bo{s.next.bestOf}
            </span>
          </span>
        ) : s.last && !compact ? (
          <span className="live-tour__next">
            <span className="live-tour__label">Last match</span>
            <span className="live-tour__match">vs {s.last.opponent} · {s.last.scoreUs}–{s.last.scoreThem}</span>
          </span>
        ) : null}
        <span className="live-tour__cta">Schedule, standings & playoffs <Icon name="chevronRight" size={16} /></span>
      </button>
      <TournamentLiveDialog t={open ? t : null} now={now} onClose={() => setOpen(false)} />
    </>
  )
}

function MatchLine({ m }: { m: DirebornMatch }) {
  const played = m.scoreUs != null && m.scoreThem != null && m.finished
  const res = played ? (m.scoreUs! > m.scoreThem! ? 'W' : m.scoreUs! < m.scoreThem! ? 'L' : 'D') : null
  return (
    <li className="run-matches__row">
      <span className="muted small run-matches__date">{shortDate(m.date)} · {m.time === 'TBD' ? 'TBC' : m.time}</span>
      <span className="run-matches__opp">{m.opponent}<span className="muted small"> · {m.stage}</span></span>
      <span className="score">{m.scoreUs != null ? `${m.scoreUs}–${m.scoreThem}` : `Bo${m.bestOf}`}</span>
      <span className={`badge badge--${res === 'W' ? 'win' : res === 'L' ? 'loss' : res === 'D' ? 'neutral' : 'next'}`}>{res ?? (m.scoreUs != null ? 'Live' : 'Next')}</span>
    </li>
  )
}

function BracketMatch({ m }: { m: LpMatch }) {
  const us1 = /direborn/i.test(m.team1), us2 = /direborn/i.test(m.team2)
  const win1 = m.finished && m.score1 > m.score2, win2 = m.finished && m.score2 > m.score1
  return (
    <li className={`bm${us1 || us2 ? ' is-us' : ''}`}>
      <span className="muted small">{m.date ? `${shortDate(m.date)} · ${m.time === 'TBD' ? 'TBC' : m.time}` : 'Date TBC'} · Bo{m.bestOf}</span>
      <span className={`bm__team${win1 ? ' is-win' : ''}${us1 ? ' is-us' : ''}`}><span>{m.team1 || 'TBD'}</span><span className="bm__score">{m.finished || m.score1 + m.score2 ? m.score1 : ''}</span></span>
      <span className={`bm__team${win2 ? ' is-win' : ''}${us2 ? ' is-us' : ''}`}><span>{m.team2 || 'TBD'}</span><span className="bm__score">{m.finished || m.score1 + m.score2 ? m.score2 : ''}</span></span>
    </li>
  )
}

/** Popup: Direborn's schedule, group standings, and playoff rounds as slides. */
export function TournamentLiveDialog({ t, now, onClose }: { t: TournamentData | null; now: Date; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const slides = useRef<HTMLDivElement>(null)
  const { role } = useRole()
  const { reload } = useEvents()
  const [slide, setSlide] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (t && !el.open) { setMsg(''); setSlide(0); el.showModal() }
    else if (!t && el.open) el.close()
  }, [t])

  const go = (i: number) => {
    const box = slides.current
    if (!box || !t) return
    const n = Math.max(0, Math.min(t.bracket.length - 1, i))
    box.scrollTo({ left: n * box.clientWidth, behavior: 'smooth' })
    setSlide(n)
  }

  const refresh = async () => {
    if (!t) return
    setBusy(true); setMsg('')
    try { const r = await refreshTournament(t.page); setMsg(`Updated from Liquipedia${r.added ? ` · ${r.added} new match${r.added > 1 ? 'es' : ''} added` : ''}.`); reload() }
    catch (err) { setMsg(err instanceof Error ? err.message : 'Could not refresh.') }
    finally { setBusy(false) }
  }

  const s = t ? summary(t, now) : null
  return (
    <dialog ref={ref} className="sheet sheet--wide" aria-labelledby="lt-title" onClose={onClose} onCancel={onClose}>
      {t && s && (
        <div className="sheet__form">
          <header className="sheet__head">
            <div className="tour-head">
              <span className="badge badge--type-tournament">{s.phase}</span>
              <h2 id="lt-title" className="sheet__title">{t.name}</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="sheet__body">
            <dl className="facts">
              <div className="facts__item"><dt>Dates</dt><dd>{dateRange(t)}</dd></div>
              {t.prize && <div className="facts__item"><dt>Prize pool</dt><dd>{t.prize}</dd></div>}
              {t.format && <div className="facts__item"><dt>Format</dt><dd>{t.format}</dd></div>}
              <div className="facts__item"><dt>Teams</dt><dd>{t.groups[0]?.rows.length || t.teams.length || '—'}</dd></div>
            </dl>

            <section className="lt-section" aria-labelledby="lt-sched">
              <h3 id="lt-sched" className="lt-section__title">Direborn schedule</h3>
              {t.direborn.length === 0
                ? <p className="muted small">No Direborn matches scheduled yet. They’ll appear here once the organizer publishes them.</p>
                : <ul className="run-matches lt-matches">{t.direborn.map((m) => <MatchLine key={m.key} m={m} />)}</ul>}
            </section>

            {t.groups.map((g) => (
              <section key={g.name} className="lt-section" aria-label={`${g.name} standings`}>
                <h3 className="lt-section__title">{g.name} standings</h3>
                <table className="lt-table">
                  <thead><tr><th>#</th><th className="l">Team</th><th>W–L</th><th>Games</th>{g.showPoints && <th>Pts</th>}</tr></thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={r.team} className={r.us ? 'is-us' : ''}>
                        <td>{i + 1}</td><td className="l">{r.team}</td><td>{r.w}–{r.l}{r.d ? `–${r.d}` : ''}</td><td>{r.gw}–{r.gl}</td>{g.showPoints && <td><strong>{r.pts}</strong></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <span className="muted small">Worked out from finished matches on Liquipedia. Tiebreakers may change the final order.</span>
              </section>
            ))}

            {t.bracket.length > 0 && (
              <section className="lt-section" aria-labelledby="lt-po">
                <div className="lt-section__head">
                  <h3 id="lt-po" className="lt-section__title">Playoffs · {t.bracket[slide]?.name}</h3>
                  <span className="pager__nav">
                    <button type="button" className="icon-btn icon-btn--sm" aria-label="Previous round" disabled={slide === 0} onClick={() => go(slide - 1)}><Icon name="chevronLeft" size={16} /></button>
                    <span className="muted small">{slide + 1} / {t.bracket.length}</span>
                    <button type="button" className="icon-btn icon-btn--sm" aria-label="Next round" disabled={slide >= t.bracket.length - 1} onClick={() => go(slide + 1)}><Icon name="chevronRight" size={16} /></button>
                  </span>
                </div>
                <div className="lt-slides" ref={slides} onScroll={(e) => { const b = e.currentTarget; setSlide(Math.round(b.scrollLeft / Math.max(1, b.clientWidth))) }}>
                  {t.bracket.map((r) => (
                    <div key={r.name} className="lt-slide" aria-label={r.name}>
                      <ul className="bm-list">{r.matches.map((m) => <BracketMatch key={m.key} m={m} />)}</ul>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {msg && <p className="notice" role="status">{msg}</p>}
          </div>
          <footer className="sheet__foot">
            <a className="ext-link ext-link--ghost" href={t.url} target="_blank" rel="noreferrer">Liquipedia ↗</a>
            <span className="muted small lt-updated">Updated {t.updatedAt ? new Date(t.updatedAt.replace(' ', 'T') + 'Z').toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'just now'}</span>
            {canImport(role) && <button type="button" className="ghost-btn" disabled={busy} onClick={refresh}>{busy ? 'Updating…' : 'Update now'}</button>}
            <button type="button" className="btn btn--primary" onClick={onClose}>Done</button>
          </footer>
        </div>
      )}
    </dialog>
  )
}
