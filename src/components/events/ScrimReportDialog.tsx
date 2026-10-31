import { useEffect, useRef } from 'react'
import { useEvents } from '../../data/events'
import { phaseLabel, reportSeries } from '../../data/scrimReport'
import { dotabuffMatch } from '../../data/tournaments'
import { parseDay } from '../../lib/format'

/** Popup for a scrim from the team's report sheet: every game with side, pick, kills, links and notes. */
export function ScrimReportDialog() {
  const { reportKey, closeReport } = useEvents()
  const ref = useRef<HTMLDialogElement>(null)
  const s = reportSeries.find((x) => x.key === reportKey) ?? null

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (s && !el.open) el.showModal()
    else if (!s && el.open) el.close()
  }, [s])

  const outcome = s ? (s.w > s.l ? 'is-win' : s.w < s.l ? 'is-loss' : 'is-draw') : ''
  const vods = s ? [...new Set(s.games.flatMap((g) => (g.vod ? [g.vod] : [])))] : []

  return (
    <dialog ref={ref} className="sheet sheet--wide" aria-labelledby="report-title" onClose={closeReport} onCancel={closeReport}>
      {s && (
        <div className="sheet__form">
          <header className="sheet__head">
            <div className="tour-head">
              <span className="muted small">Scrim report · {phaseLabel(s.phase)}</span>
              <h2 id="report-title" className="sheet__title">Direborn vs {s.opp}</h2>
              <span className="muted small">{parseDay(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <span className={`match-score ${outcome}`}>{s.w}–{s.l}</span>
            <button type="button" className="icon-btn" aria-label="Close" onClick={closeReport}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="sheet__body">
            <ol className="report-games">
              {s.games.map((g, i) => (
                <li key={i} className={`report-game${g.status !== 'played' ? ' is-off' : ''}`}>
                  <span className={`report-game__res ${g.result === 'W' ? 'is-win' : g.result === 'L' ? 'is-loss' : ''}`}>
                    G{i + 1}<strong>{g.result ?? '—'}</strong>
                  </span>
                  <span className="report-game__main">
                    <span className="report-game__tags">
                      {g.side && <span className={`side-tag side-tag--${g.side.toLowerCase()}`}>{g.side}</span>}
                      {g.pick && <span className="badge badge--neutral">{g.pick === '1st' ? 'First pick' : 'Second pick'}</span>}
                      {g.status === 'cancelled' && <span className="badge badge--neutral">Cancelled</span>}
                      {g.status === 'not-played' && <span className="badge badge--neutral">Not played</span>}
                      {g.kills && <span className="muted small">Kills {g.kills.replace('-', '–')} <span className="report-game__hint">(Radiant–Dire)</span></span>}
                    </span>
                    {g.note && <span className="report-game__note">“{g.note}”</span>}
                  </span>
                  <span className="report-game__links">
                    {g.matchId && <a className="link small" href={dotabuffMatch(Number(g.matchId))} target="_blank" rel="noreferrer">Dotabuff ↗</a>}
                  </span>
                </li>
              ))}
            </ol>
            {vods.length > 0 && (
              <div className="report-vods">
                <span className="facts__label">VODs</span>
                {vods.map((v, i) => (
                  <a key={v} className="btn btn--sm" href={v} target="_blank" rel="noreferrer">▶ {vods.length > 1 ? `VOD ${i + 1}` : 'Watch VOD'}</a>
                ))}
              </div>
            )}
            <p className="muted small">From the team report sheet. Edit the sheet and re-import to change it.</p>
          </div>
        </div>
      )}
    </dialog>
  )
}
