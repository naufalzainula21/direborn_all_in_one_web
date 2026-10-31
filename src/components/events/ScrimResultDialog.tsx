import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, saveTeamKey } from '../../data/api'
import { useEvents } from '../../data/events'
import { parseDay } from '../../lib/format'
import { bestOf, opponentOf } from '../../lib/scrims'

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div className="stepper">
      <span className="field__label">{label}</span>
      <div className="stepper__row">
        <button type="button" className="icon-btn" aria-label={`${label}: one less`} disabled={value <= 0} onClick={() => onChange(value - 1)}>−</button>
        <output className="stepper__value" aria-live="polite">{value}</output>
        <button type="button" className="icon-btn" aria-label={`${label}: one more`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}

/** Record or edit a scrim result: games won/lost, Dota match IDs, notes. */
export function ScrimResultDialog() {
  const { resultFor: e, closeResult, update } = useEvents()
  const ref = useRef<HTMLDialogElement>(null)
  const [us, setUs] = useState(0)
  const [them, setThem] = useState(0)
  const [ids, setIds] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [needKey, setNeedKey] = useState(false)
  const [teamKey, setTeamKey] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (e && !el.open) {
      setUs(e.scoreUs ?? 0)
      setThem(e.scoreThem ?? 0)
      setIds((e.matchIds ?? []).join(', '))
      setNotes(e.notes ?? '')
      setError('')
      el.showModal()
    } else if (!e && el.open) el.close()
  }, [e])

  const max = e ? Math.max(bestOf(e), 5) : 5

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!e) return
    if (us === 0 && them === 0) { setError('Enter the score first. At least one game must be played.'); return }
    const list = ids.split(/[\s,]+/).map((x) => x.replace(/\D/g, '')).filter(Boolean)
    if (list.some((x) => x.length < 6 || x.length > 12)) { setError('Match IDs are 6–12 digit numbers, for example 8971364249.'); return }
    if (needKey && teamKey.trim()) saveTeamKey(teamKey.trim())
    setSaving(true); setError('')
    try {
      await update(e.id, { scoreUs: us, scoreThem: them, matchIds: list, notes: notes.trim() || null, status: 'played' })
      setNeedKey(false)
      closeResult()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setNeedKey(true)
        setError(needKey ? 'That team code is wrong. Try again.' : 'Enter the team code to save.')
      } else setError(err instanceof Error ? err.message : 'Could not save. Try again.')
    } finally { setSaving(false) }
  }

  const clear = async () => {
    if (!e || !window.confirm('Remove this result?')) return
    setSaving(true)
    try { await update(e.id, { scoreUs: null, scoreThem: null, matchIds: null, status: 'confirmed' }); closeResult() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove.') }
    finally { setSaving(false) }
  }

  const outcome = us > them ? 'Win' : us < them ? 'Loss' : us + them > 0 ? 'Draw' : ''

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="res-title" onClose={closeResult} onCancel={closeResult}>
      {e && (
        <form className="sheet__form" onSubmit={submit} noValidate>
          <header className="sheet__head">
            <div className="tour-head">
              <span className="muted small">{parseDay(e.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {e.time} WIB · {e.detail}</span>
              <h2 id="res-title" className="sheet__title">Result vs {opponentOf(e)}</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={closeResult}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="sheet__body">
            <div className="score-entry">
              <Stepper label="Direborn" value={us} onChange={setUs} max={max} />
              <span className="score-entry__dash" aria-hidden="true">–</span>
              <Stepper label={opponentOf(e)} value={them} onChange={setThem} max={max} />
            </div>
            {outcome && <p className={`score-entry__outcome is-${outcome.toLowerCase()}`}>{outcome} {us}–{them}</p>}

            <div className="field">
              <label className="field__label" htmlFor="res-ids">Match IDs <span className="field__opt">optional · for Dotabuff links</span></label>
              <input id="res-ids" inputMode="numeric" value={ids} onChange={(x) => setIds(x.target.value)} placeholder="8971364249, 8971423978" />
              <span className="field__help">Find them in the Dota client under Watch → Recent games, or in your match history.</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="res-notes">Notes <span className="field__opt">optional</span></label>
              <textarea id="res-notes" rows={3} maxLength={500} value={notes} onChange={(x) => setNotes(x.target.value)} placeholder="What worked, what to review, who stood in" />
            </div>
            {needKey && (
              <div className="field">
                <label className="field__label" htmlFor="res-key">Team code</label>
                <input id="res-key" type="password" autoComplete="off" value={teamKey} onChange={(x) => setTeamKey(x.target.value)} placeholder="Ask your manager" />
              </div>
            )}
            {error && <p className="field__error" role="alert">{error}</p>}
          </div>
          <footer className="sheet__foot">
            {e.scoreUs != null && <button type="button" className="ghost-btn ghost-btn--danger" disabled={saving} onClick={clear}>Remove result</button>}
            <button type="button" className="ghost-btn" onClick={closeResult}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save result'}</button>
          </footer>
        </form>
      )}
    </dialog>
  )
}
