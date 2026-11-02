import { useId, useState } from 'react'
import { importTournament, previewTournament, searchLiquipedia, type TournamentData } from '../../data/api'
import { useEvents } from '../../data/events'
import { shortDate } from '../../lib/format'
import { Icon } from '../Icon'

/**
 * Type a tournament name ("EPL season 19") → pick the Liquipedia page → see Direborn's matches → tick → add.
 * Added matches stay linked and update automatically (times, scores, new playoff matches).
 */
export function TournamentImport({ onDone }: { onDone: (message: string) => void }) {
  const uid = useId()
  const { reload } = useEvents()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ page: string; title: string }[] | null>(null)
  const [preview, setPreview] = useState<{ t: TournamentData; imported: string[] } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'search' | 'preview' | 'import' | null>(null)
  const [error, setError] = useState('')

  // Lives inside the Add dialog's form, so no nested <form>: Enter in the box runs the search.
  const search = async () => {
    if (q.trim().length < 2) { setError('Type at least 2 letters, e.g. "EPL season 19", or paste a Liquipedia link.'); return }
    setBusy('search'); setError(''); setPreview(null)
    try {
      const { results: r } = await searchLiquipedia(q.trim())
      setResults(r)
      if (r.length === 1) await open(r[0].page)
    } catch (err) { setError(err instanceof Error ? err.message : 'Search failed.') }
    finally { setBusy((b) => (b === 'search' ? null : b)) }
  }

  const open = async (page: string) => {
    setBusy('preview'); setError('')
    try {
      const { tournament: t, imported } = await previewTournament(page)
      setPreview({ t, imported })
      setPicked(new Set(t.direborn.filter((m) => !imported.includes(m.key)).map((m) => m.key)))
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not read that tournament.') }
    finally { setBusy(null) }
  }

  const add = async () => {
    if (!preview) return
    setBusy('import'); setError('')
    try {
      const keys = [...new Set([...picked, ...preview.imported])]
      const r = await importTournament(preview.t.page, keys)
      reload()
      onDone(r.added
        ? `Added ${r.added} match${r.added > 1 ? 'es' : ''} from ${preview.t.name}. Times and scores update automatically.`
        : `${preview.t.name} is linked. New Direborn matches (like playoffs) will be added automatically.`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add.') }
    finally { setBusy(null) }
  }

  const toggle = (key: string) => setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n })
  const fresh = preview ? preview.t.direborn.filter((m) => !preview.imported.includes(m.key)) : []

  return (
    <div className="lp-import">
      <div className="lp-import__search">
        <label className="field__label" htmlFor={`${uid}-q`}>Find tournament</label>
        <div className="lp-import__row">
          <input id={`${uid}-q`} className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="EPL season 19 · or paste a Liquipedia link" autoComplete="off"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search() } }} />
          <button type="button" className="btn btn--primary" disabled={busy !== null} onClick={search}><Icon name="search" size={16} /><span className="btn__label">{busy === 'search' ? 'Searching…' : 'Search'}</span></button>
        </div>
        <span className="field__help">Only Direborn’s matches are added. Source: Liquipedia.</span>
      </div>

      {results && !preview && (
        results.length === 0
          ? <p className="muted small">Nothing found. Try the organizer’s name and season number, or paste the tournament’s Liquipedia link.</p>
          : (
            <ul className="lp-results">
              {results.map((r) => (
                <li key={r.page}>
                  <button type="button" className="lp-results__item" disabled={busy !== null} onClick={() => open(r.page)}>
                    <span>{r.title}</span><Icon name="chevronRight" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )
      )}
      {busy === 'preview' && <p className="muted small">Reading the tournament…</p>}

      {preview && (
        <div className="lp-preview">
          <div className="lp-preview__head">
            <span className="lp-preview__name">{preview.t.name}</span>
            <span className="muted small">
              {[preview.t.startDate && preview.t.endDate ? `${shortDate(preview.t.startDate)} – ${shortDate(preview.t.endDate)}` : null, preview.t.prize, preview.t.format].filter(Boolean).join(' · ')}
            </span>
            {results && results.length > 1 && <button type="button" className="link link--btn" onClick={() => setPreview(null)}>← Other results</button>}
          </div>

          {preview.t.direborn.length === 0 ? (
            <p className="notice">
              {preview.t.participating
                ? 'Direborn is in this tournament, but no matches are scheduled yet. Link it now and matches will be added as soon as they’re published.'
                : 'Direborn isn’t listed in this tournament (yet). You can still link it and matches will be added if Direborn appears.'}
            </p>
          ) : (
            <>
              <span className="field__label">Direborn’s matches · times in WIB</span>
              <ul className="lp-matches">
                {preview.t.direborn.map((m) => {
                  const already = preview.imported.includes(m.key)
                  return (
                    <li key={m.key}>
                      <label className={`lp-match${already ? ' is-added' : ''}`}>
                        <input type="checkbox" checked={already || picked.has(m.key)} disabled={already} onChange={() => toggle(m.key)} />
                        <span className="lp-match__when">{shortDate(m.date)}<span className="muted small"> {m.time === 'TBD' ? 'TBC' : m.time}</span></span>
                        <span className="lp-match__what">vs {m.opponent}<span className="muted small"> · {m.stage} · Bo{m.bestOf}</span></span>
                        <span className="lp-match__res">{already ? <span className="badge badge--neutral">Added</span> : m.scoreUs != null ? <span className="score">{m.scoreUs}–{m.scoreThem}</span> : null}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <button type="button" className="btn btn--primary" disabled={busy !== null || (fresh.length > 0 && picked.size === 0)} onClick={add}>
            {busy === 'import' ? 'Adding…' : fresh.length ? `Add ${picked.size} match${picked.size === 1 ? '' : 'es'} to schedule` : 'Link tournament'}
          </button>
        </div>
      )}
      {error && <p className="field__error" role="alert">{error}</p>}
    </div>
  )
}
