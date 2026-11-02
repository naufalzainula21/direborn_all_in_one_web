import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import type { NewEvent } from '../../data/api'
import { useEvents } from '../../data/events'
import { addableTypes, canImport } from '../../lib/permissions'
import { useRole } from '../../lib/role'
import { TournamentImport } from './TournamentImport'
import type { BookingStatus, EventType } from '../../data/types'
import { todayISO } from '../../lib/format'

const TYPES: { id: EventType; label: string; hint: string }[] = [
  { id: 'tournament', label: 'Tournament', hint: 'Official match' },
  { id: 'scrim', label: 'Scrim', hint: 'Practice match vs a team' },
  { id: 'practice', label: 'Practice', hint: 'Team training' },
  { id: 'other', label: 'Other', hint: 'Activity, meeting, shoot' },
]

const FORMATS = ['Bo1', 'Bo2', 'Bo3', 'Bo5']
const PRACTICE_FOCUS = ['Team practice', 'VOD review', 'Draft prep', 'Pub games', 'Custom']
const DURATIONS = ['', '1h', '2h', '3h', '4h']

interface FormState {
  type: EventType
  date: string
  time: string
  tbd: boolean
  tournament: string
  stage: string
  opponent: string
  format: string
  status: BookingStatus
  focus: string
  customFocus: string
  sessionName: string
  duration: string
  notes: string
}

const initial = (date: string): FormState => ({
  type: 'scrim',
  date,
  time: '19:00',
  tbd: false,
  tournament: '',
  stage: '',
  opponent: '',
  format: 'Bo3',
  status: 'confirmed',
  focus: 'Team practice',
  customFocus: '',
  sessionName: '',
  duration: '',
  notes: '',
})

type Errors = Partial<Record<'tournament' | 'opponent' | 'customFocus' | 'sessionName' | 'date' | 'time', string>>

function validate(f: FormState): Errors {
  const e: Errors = {}
  if (!f.date) e.date = 'Pick a date.'
  if (!f.tbd && !f.time) e.time = 'Pick a time, or tick "Time not set".'
  if (f.type === 'tournament' && !f.tournament.trim()) e.tournament = 'Enter the tournament name.'
  if (f.type === 'scrim' && !f.opponent.trim()) e.opponent = 'Enter the opponent team.'
  if (f.type === 'practice' && f.focus === 'Custom' && !f.customFocus.trim()) e.customFocus = 'Name this practice.'
  if (f.type === 'other' && !f.sessionName.trim()) e.sessionName = 'Give the session a name.'
  return e
}

function toEvent(f: FormState): NewEvent {
  const time = f.tbd ? 'TBD' : f.time
  const notes = f.notes.trim() || undefined
  const base = { date: f.date, time, type: f.type, notes }
  switch (f.type) {
    case 'tournament': {
      const opp = f.opponent.trim()
      const lead = [f.stage.trim(), opp && `vs ${opp}`].filter(Boolean).join(' ')
      return { ...base, title: f.tournament.trim(), detail: [lead, f.format].filter(Boolean).join(' · '), opponent: opp || undefined }
    }
    case 'scrim': {
      const opp = f.opponent.trim()
      return { ...base, title: `Scrim vs ${opp}`, detail: f.format, opponent: opp, status: f.status }
    }
    case 'practice': {
      const title = f.focus === 'Custom' ? f.customFocus.trim() : f.focus
      return { ...base, title, detail: f.duration ? `${f.duration} session` : 'Practice' }
    }
    case 'other':
      return { ...base, title: f.sessionName.trim(), detail: f.duration ? `${f.duration} session` : 'Session' }
  }
}

export function AddEventDialog() {
  const { addDialog, closeAdd, add, source, events } = useEvents()
  const { role } = useRole()
  const allowed = addableTypes(role)
  const onlyActivity = allowed.length === 1 && allowed[0] === 'other'
  const [mode, setMode] = useState<'search' | 'manual'>('search')
  const [done, setDone] = useState('')
  // Opponents the team has played before, for the scrim suggestions.
  const opponents = useMemo(() => [...new Set(events.filter((e) => e.type === 'scrim' && e.opponent).map((e) => e.opponent!.trim()))].sort((a, b) => a.localeCompare(b)), [events])
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [form, setForm] = useState<FormState>(() => initial(todayISO(new Date())))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (addDialog.open && !el.open) {
      const wanted = addDialog.type && allowed.includes(addDialog.type) ? addDialog.type : allowed.includes('scrim') ? 'scrim' : allowed[0]
      setForm({ ...initial(addDialog.date ?? todayISO(new Date())), type: wanted })
      setMode(canImport(role) ? 'search' : 'manual')
      setDone('')
      setErrors({})
      setServerError('')
      el.showModal()
    } else if (!addDialog.open && el.open) {
      el.close()
    }
  }, [addDialog]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setSaving(true)
    setServerError('')
    try {
      await add(toEvent(form))
      closeAdd()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const id = (name: string) => `${uid}-${name}`
  const err = (name: keyof Errors) =>
    errors[name] ? <span className="field__error" id={id(`${name}-err`)}>{errors[name]}</span> : null
  const readOnly = source === 'offline'
  const searching = form.type === 'tournament' && mode === 'search' && canImport(role)

  return (
    <dialog ref={ref} className="sheet" aria-labelledby={id('title')} onClose={closeAdd} onCancel={closeAdd}>
      <form className="sheet__form" onSubmit={submit} noValidate>
        <header className="sheet__head">
          <h2 id={id('title')} className="sheet__title">{onlyActivity ? 'Add activity' : 'Add schedule'}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={closeAdd}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="sheet__body">
          {readOnly && (
            <p className="notice">The shared database isn't connected yet, so events can't be saved. You can still try the form.</p>
          )}

          {done && <p className="notice" role="status">{done}</p>}
          {onlyActivity && <p className="muted small">Photo shoots, streams, meet-ups, sponsor events. Matches and scrims are added by the manager, coach or management.</p>}
          {!onlyActivity && <fieldset className="type-picker">
            <legend className="field__label">Type</legend>
            <div className="type-picker__grid">
              {TYPES.filter((t) => allowed.includes(t.id)).map((t) => (
                <label key={t.id} className={`type-option type-option--${t.id}${form.type === t.id ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name={id('type')}
                    value={t.id}
                    checked={form.type === t.id}
                    onChange={() => set('type', t.id)}
                  />
                  <span className="type-option__dot" aria-hidden="true" />
                  <span className="type-option__label">{t.label}</span>
                  <span className="type-option__hint">{t.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>}

          {form.type === 'tournament' && canImport(role) && (
            <div className="segmented" role="radiogroup" aria-label="How to add">
              <button type="button" role="radio" aria-checked={mode === 'search'} className={`segmented__btn${mode === 'search' ? ' is-active' : ''}`} onClick={() => setMode('search')}>Find on Liquipedia</button>
              <button type="button" role="radio" aria-checked={mode === 'manual'} className={`segmented__btn${mode === 'manual' ? ' is-active' : ''}`} onClick={() => setMode('manual')}>Type it in</button>
            </div>
          )}

          {searching && <TournamentImport onDone={(m) => setDone(m)} />}

          {form.type === 'tournament' && !searching && (
            <>
              <div className="field">
                <label className="field__label" htmlFor={id('tournament')}>Tournament name</label>
                <input id={id('tournament')} value={form.tournament} onChange={(e) => set('tournament', e.target.value)}
                  placeholder="DreamLeague SEA closed qualifier" maxLength={80}
                  aria-invalid={!!errors.tournament} aria-describedby={errors.tournament ? id('tournament-err') : undefined} />
                {err('tournament')}
              </div>
              <div className="field-row">
                <div className="field">
                  <label className="field__label" htmlFor={id('stage')}>Stage or round <span className="field__opt">optional</span></label>
                  <input id={id('stage')} value={form.stage} onChange={(e) => set('stage', e.target.value)} placeholder="Group stage R1" maxLength={60} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={id('t-opp')}>Opponent <span className="field__opt">optional</span></label>
                  <input id={id('t-opp')} value={form.opponent} onChange={(e) => set('opponent', e.target.value)} placeholder="Team name" maxLength={60} />
                </div>
              </div>
            </>
          )}

          {form.type === 'scrim' && (
            <div className="field">
              <label className="field__label" htmlFor={id('opp')}>Opponent team</label>
              <input id={id('opp')} list={id('opp-list')} autoComplete="off" value={form.opponent} onChange={(e) => set('opponent', e.target.value)} placeholder="Team name" maxLength={60}
                aria-invalid={!!errors.opponent} aria-describedby={errors.opponent ? id('opponent-err') : undefined} />
              <datalist id={id('opp-list')}>{opponents.map((o) => <option key={o} value={o} />)}</datalist>
              {opponents.length > 0 && <span className="field__help">Start typing to pick a team you’ve played before.</span>}
              {err('opponent')}
            </div>
          )}

          {((form.type === 'tournament' && !searching) || form.type === 'scrim') && (
            <div className="field-row">
              <div className="field">
                <span className="field__label" id={id('format-label')}>Format</span>
                <div className="segmented" role="radiogroup" aria-labelledby={id('format-label')}>
                  {FORMATS.map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={form.format === f}
                      className={`segmented__btn${form.format === f ? ' is-active' : ''}`} onClick={() => set('format', f)}>{f}</button>
                  ))}
                </div>
              </div>
              {form.type === 'scrim' && (
                <div className="field">
                  <span className="field__label" id={id('status-label')}>Status</span>
                  <div className="segmented" role="radiogroup" aria-labelledby={id('status-label')}>
                    {(['confirmed', 'pending'] as const).map((s) => (
                      <button key={s} type="button" role="radio" aria-checked={form.status === s}
                        className={`segmented__btn${form.status === s ? ' is-active' : ''}`} onClick={() => set('status', s)}>
                        {s === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {form.type === 'practice' && (
            <div className="field">
              <label className="field__label" htmlFor={id('focus')}>Practice type</label>
              <select id={id('focus')} value={form.focus} onChange={(e) => set('focus', e.target.value)}>
                {PRACTICE_FOCUS.map((p) => <option key={p}>{p}</option>)}
              </select>
              {form.focus === 'Custom' && (
                <>
                  <input aria-label="Custom practice name" value={form.customFocus} onChange={(e) => set('customFocus', e.target.value)}
                    placeholder="Laning drills" maxLength={60} aria-invalid={!!errors.customFocus}
                    aria-describedby={errors.customFocus ? id('customFocus-err') : undefined} />
                  {err('customFocus')}
                </>
              )}
            </div>
          )}

          {form.type === 'other' && (
            <div className="field">
              <label className="field__label" htmlFor={id('session')}>{onlyActivity ? 'Activity' : 'Session name'}</label>
              <input id={id('session')} value={form.sessionName} onChange={(e) => set('sessionName', e.target.value)}
                placeholder="Team meeting, photo shoot, bootcamp travel" maxLength={80}
                aria-invalid={!!errors.sessionName} aria-describedby={errors.sessionName ? id('sessionName-err') : undefined} />
              {err('sessionName')}
            </div>
          )}

          {!searching && <>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor={id('date')}>Date</label>
              <input id={id('date')} type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
                aria-invalid={!!errors.date} aria-describedby={errors.date ? id('date-err') : undefined} />
              {err('date')}
            </div>
            <div className="field">
              <label className="field__label" htmlFor={id('time')}>Time (WIB)</label>
              <input id={id('time')} type="time" value={form.time} disabled={form.tbd} onChange={(e) => set('time', e.target.value)}
                aria-invalid={!!errors.time} aria-describedby={errors.time ? id('time-err') : undefined} />
              <label className="check">
                <input type="checkbox" checked={form.tbd} onChange={(e) => set('tbd', e.target.checked)} />
                Time not set yet
              </label>
              {err('time')}
            </div>
          </div>

          {(form.type === 'practice' || form.type === 'other') && (
            <div className="field">
              <span className="field__label" id={id('dur-label')}>Duration <span className="field__opt">optional</span></span>
              <div className="segmented" role="radiogroup" aria-labelledby={id('dur-label')}>
                {DURATIONS.map((d) => (
                  <button key={d || 'none'} type="button" role="radio" aria-checked={form.duration === d}
                    className={`segmented__btn${form.duration === d ? ' is-active' : ''}`} onClick={() => set('duration', d)}>
                    {d || 'None'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor={id('notes')}>Notes <span className="field__opt">optional</span></label>
            <textarea id={id('notes')} rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Lobby name, server, who's standing in" maxLength={500} />
          </div>

          </>}

          {serverError && <p className="field__error" role="alert">{serverError}</p>}
        </div>

        <footer className="sheet__foot">
          <button type="button" className="ghost-btn" onClick={closeAdd}>{done ? 'Close' : 'Cancel'}</button>
          {!searching && (
            <button type="submit" className="btn btn--primary" disabled={saving || readOnly}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </footer>
      </form>
    </dialog>
  )
}
