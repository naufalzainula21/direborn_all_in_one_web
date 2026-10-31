import { useEffect, useMemo, useRef, useState } from 'react'
import { TournamentTabs } from '../components/tournaments/TournamentTabs'
import { useEvents } from '../data/events'
import { CONFIDENCE_LABEL, DIREBORN_LABEL, upcomingEvents, type DirebornStatus, type UpcomingEvent } from '../data/upcoming'
import { parseDay } from '../lib/format'

type Filter = 'all' | 'path' | 'tier1' | 'out'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'path', label: 'Direborn can enter' },
  { id: 'tier1', label: 'Tier 1' },
  { id: 'out', label: 'Done / invite only' },
]
const PATH: DirebornStatus[] = ['qualified', 'open', 'watch']

const STATUS_TONE: Record<DirebornStatus, string> = {
  qualified: 'win', open: 'win', watch: 'est', invite: 'neutral', out: 'loss', unknown: 'neutral',
}
const CONF_TONE = { confirmed: 'neutral', estimate: 'est', rumour: 'review', tba: 'neutral' } as const

function DateBox({ e }: { e: UpcomingEvent }) {
  if (!e.start) {
    return (
      <span className="date-box date-box--sm date-box--tba">
        <span className="date-box__dow">{e.month.split(' ')[0]}</span>
        <span className="date-box__num">?</span>
      </span>
    )
  }
  const d = parseDay(e.start)
  return (
    <span className="date-box date-box--sm">
      <span className="date-box__dow">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
      <span className="date-box__num">{d.getDate()}</span>
    </span>
  )
}

function EventDialog({ e, onClose }: { e: UpcomingEvent | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { openAdd } = useEvents()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (e && !el.open) el.showModal()
    else if (!e && el.open) el.close()
  }, [e])

  const facts: [string, string][] = e ? [
    ['Dates', e.dates], ['Organiser', e.organizer], ['Location', e.location], ['Prize pool', e.prize],
    ['Tier', e.tier], ['Info status', CONFIDENCE_LABEL[e.confidence]],
  ] : []

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="up-ev-title" onClose={onClose} onCancel={onClose}>
      {e && (
        <div className="sheet__form">
          <header className="sheet__head">
            <div className="tour-head">
              <span className={`badge badge--${STATUS_TONE[e.direborn]}`}>{DIREBORN_LABEL[e.direborn]}</span>
              <h2 id="up-ev-title" className="sheet__title">{e.name}</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>
          <div className="sheet__body">
            <dl className="facts">
              {facts.map(([k, v]) => <div key={k} className="facts__item"><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
            <div className="route">
              <span className="field__label">How Direborn gets in</span>
              <p>{e.route}</p>
            </div>
            {e.notes && (
              <div className="route route--plain">
                <span className="field__label">Notes</span>
                <p>{e.notes}</p>
              </div>
            )}
            <a className="ext-link ext-link--ghost route__src" href={e.source.url} target="_blank" rel="noreferrer">Source: {e.source.label} ↗</a>
          </div>
          <footer className="sheet__foot">
            {e.start && (
              <button type="button" className="ghost-btn" onClick={() => { const d = e.start!; onClose(); openAdd(d) }}>Add to schedule</button>
            )}
            <button type="button" className="btn btn--primary" onClick={onClose}>Done</button>
          </footer>
        </div>
      )}
    </dialog>
  )
}

export function TournamentsUpcoming() {
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<UpcomingEvent | null>(null)

  const list = useMemo(() => upcomingEvents.filter((e) => {
    if (filter === 'path') return PATH.includes(e.direborn)
    if (filter === 'tier1') return e.tier === 'Tier 1'
    if (filter === 'out') return e.direborn === 'out' || e.direborn === 'invite'
    return true
  }), [filter])

  const groups = useMemo(() => {
    const map = new Map<string, UpcomingEvent[]>()
    for (const e of list) map.set(e.month, [...(map.get(e.month) ?? []), e])
    return [...map.entries()]
  }, [list])

  const qualified = upcomingEvents.filter((e) => e.direborn === 'qualified')
  const toWatch = upcomingEvents.filter((e) => e.direborn === 'watch' || e.direborn === 'open').filter((e) => e.name.includes('qualifier'))

  return (
    <>
      <div className="page-head">
        <span className="muted">Every Dota 2 event from Nov 2026 to Dec 2027, and Direborn’s way in</span>
        <h1 className="page-title">Tournaments</h1>
      </div>
      <TournamentTabs />

      <section aria-label="Summary" className="tiles">
        <div className="tile"><span className="tile__label">Events listed</span><span className="tile__value">{upcomingEvents.length}</span><span className="tile__detail">Nov 2026 – Dec 2027</span></div>
        <div className="tile"><span className="tile__label">Qualified for</span><span className="tile__value tile__value--sm">{qualified[0] ? 'EPL S19 playoffs' : '—'}</span><span className="tile__detail">{qualified[0]?.dates}</span></div>
        <div className="tile tile--gold"><span className="tile__label">Next qualifier to watch</span><span className="tile__value tile__value--sm">{toWatch[0]?.name.split(' · ')[0].replace('Season ', 'S')}</span><span className="tile__detail">{toWatch[0]?.dates}</span></div>
        <div className="tile"><span className="tile__label">SEA qualifier routes</span><span className="tile__value">{toWatch.length}</span><span className="tile__detail">Estimated, not yet announced</span></div>
      </section>

      <section className="card" aria-labelledby="up-list-title">
        <div className="card__head">
          <h2 id="up-list-title" className="card__title">Upcoming tournaments</h2>
          <div className="segmented" role="group" aria-label="Filter">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id}
                className={`segmented__btn${filter === f.id ? ' is-active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="up-groups">
          {groups.map(([month, items]) => (
            <section key={month} className="up-group" aria-label={month}>
              <h3 className="up-group__title">{month}</h3>
              <ul className="up-list">
                {items.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="up-row" onClick={() => setOpen(e)}>
                      <DateBox e={e} />
                      <span className="up-row__main">
                        <span className="up-row__name">{e.name}</span>
                        <span className="muted small">{e.dates} · {e.organizer} · {e.prize !== 'TBA' && e.prize !== '—' ? e.prize : e.location}</span>
                        <span className="up-row__route small">{e.route}</span>
                      </span>
                      <span className="up-row__badges">
                        <span className={`badge badge--${STATUS_TONE[e.direborn]}`}>{DIREBORN_LABEL[e.direborn]}</span>
                        {e.confidence !== 'confirmed' && <span className={`badge badge--${CONF_TONE[e.confidence]}`}>{CONFIDENCE_LABEL[e.confidence]}</span>}
                        <span className="badge badge--neutral">{e.tier}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && <p className="muted">Nothing matches this filter.</p>}
        </div>
        <p className="muted small">
          Compiled 31 Oct 2026 from organiser announcements and esports news. Items marked Estimate or Rumour aren’t announced yet. Tap an event for details and its source.
        </p>
      </section>

      <EventDialog e={open} onClose={() => setOpen(null)} />
    </>
  )
}
