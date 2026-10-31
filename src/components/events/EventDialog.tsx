import { useEffect, useRef, useState } from 'react'
import { useEvents } from '../../data/events'
import { countdown, parseDay } from '../../lib/format'
import { TYPE_LABEL } from '../schedule/meta'
import { dotabuffMatch } from '../../data/tournaments'
import { hasResult, isPast, outcomeOf, OUTCOME_LABEL, OUTCOME_TONE } from '../../lib/scrims'

/** Details for a team-added event (scrim, practice, other, tournament). */
export function EventDialog() {
  const { eventDetail: e, closeEvent, remove, source, openAdd, openResult, update } = useEvents()
  const ref = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (e && !el.open) { setError(''); el.showModal() }
    else if (!e && el.open) el.close()
  }, [e])

  const onDelete = async () => {
    if (!e || !window.confirm(`Delete "${e.title}" on ${e.date}?`)) return
    setBusy(true); setError('')
    try { await remove(e.id) } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete.') }
    finally { setBusy(false) }
  }

  const start = e && e.time !== 'TBD' ? `${e.date}T${e.time}:00+07:00` : null
  const facts: [string, string][] = e ? [
    ['Type', TYPE_LABEL[e.type]],
    ['Date', parseDay(e.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Time', e.time === 'TBD' ? 'To be confirmed' : `${e.time} WIB`],
    ...(start ? [['Starts', countdown(start, new Date()).replace('Live now', 'Started')] as [string, string]] : []),
    ...(e.opponent ? [['Opponent', e.opponent] as [string, string]] : []),
    ['Details', e.detail || '—'],
    ...(e.status ? [['Status', e.status === 'confirmed' ? 'Confirmed' : e.status === 'pending' ? 'Pending' : 'Played'] as [string, string]] : []),
  ] : []
  const isScrim = e?.type === 'scrim'
  const outcome = e ? outcomeOf(e) : null
  const canResult = !!e && isScrim && source === 'db' && (hasResult(e) || isPast(e, new Date()))
  const confirm = async () => {
    if (!e) return
    setBusy(true); setError('')
    try { await update(e.id, { status: 'confirmed' }) } catch (err) { setError(err instanceof Error ? err.message : 'Could not update.') }
    finally { setBusy(false) }
  }

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="ev-title" onClose={closeEvent} onCancel={closeEvent}>
      {e && (
        <div className="sheet__form">
          <header className="sheet__head">
            <div className="tour-head">
              <span className={`badge badge--type-${e.type}`}>{TYPE_LABEL[e.type]}</span>
              <h2 id="ev-title" className="sheet__title">{e.title}</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={closeEvent}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="sheet__body">
            {outcome && (
              <div className={`result-banner is-${outcome}`}>
                <span className="result-banner__label">{OUTCOME_LABEL[outcome]}</span>
                <span className="result-banner__score">{e.scoreUs}–{e.scoreThem}</span>
                <span className={`badge badge--${OUTCOME_TONE[outcome]}`}>Result</span>
              </div>
            )}
            <dl className="facts">
              {facts.map(([k, v]) => <div key={k} className="facts__item"><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            {e.matchIds && e.matchIds.length > 0 && (
              <div className="series__games">
                {e.matchIds.map((id, i) => (
                  <a key={id} className="ext-link ext-link--ghost" href={dotabuffMatch(Number(id))} target="_blank" rel="noreferrer">Game {i + 1} on Dotabuff ↗</a>
                ))}
              </div>
            )}
            {e.notes && (
              <div className="facts__notes"><span className="field__label">Notes</span><p>{e.notes}</p></div>
            )}
            {error && <p className="field__error" role="alert">{error}</p>}
          </div>
          <footer className="sheet__foot">
            {source === 'db' && (
              <button type="button" className="ghost-btn ghost-btn--danger" disabled={busy} onClick={onDelete}>{busy ? 'Deleting…' : 'Delete'}</button>
            )}
            {isScrim && e.status === 'pending' && source === 'db' && !hasResult(e) && (
              <button type="button" className="ghost-btn" disabled={busy} onClick={confirm}>Mark confirmed</button>
            )}
            {canResult ? (
              <button type="button" className="btn btn--primary" onClick={() => { const x = e; closeEvent(); openResult(x) }}>
                {hasResult(e) ? 'Edit result' : 'Add result'}
              </button>
            ) : (
              <>
                <button type="button" className="ghost-btn" onClick={() => { const d = e.date; closeEvent(); openAdd(d) }}>Add on this day</button>
                <button type="button" className="btn btn--primary" onClick={closeEvent}>Done</button>
              </>
            )}
          </footer>
        </div>
      )}
    </dialog>
  )
}
