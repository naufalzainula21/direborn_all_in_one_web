import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../../data/events'
import { shortDate } from '../../lib/format'
import { Icon } from '../Icon'

const PER_PAGE = 5

/** Played official matches, newest first, 5 per page. Swipe sideways or use the arrows. */
export function RecentMatches() {
  const { series, openMatch } = useEvents()
  const played = series.filter((s) => s.won !== null)
  const pages: (typeof played)[] = []
  for (let i = 0; i < played.length; i += PER_PAGE) pages.push(played.slice(i, i + PER_PAGE))

  const track = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)

  const go = (p: number) => {
    const el = track.current
    if (!el) return
    const next = Math.max(0, Math.min(pages.length - 1, p))
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
    setPage(next)
  }
  const onScroll = () => {
    const el = track.current
    if (el) setPage(Math.round(el.scrollLeft / el.clientWidth))
  }

  const wins = played.filter((s) => s.won).length

  return (
    <section className="card" aria-labelledby="recent-title">
      <div className="card__head">
        <div className="card__title-row">
          <h2 id="recent-title" className="card__title">Recent matches</h2>
          <span className="record">
            <span className="record__w">{wins}W</span> <span className="record__l">{played.length - wins}L</span> series
          </span>
        </div>
        <Link to="/tournaments" className="link">All tournaments →</Link>
      </div>

      {played.length === 0 ? (
        <p className="muted">No official matches yet.</p>
      ) : (
        <>
          <div className="pager" ref={track} onScroll={onScroll} aria-roledescription="carousel">
            {pages.map((list, i) => (
              <ul key={i} className="pager__page" aria-label={`Page ${i + 1} of ${pages.length}`}>
                {list.map((s) => (
                  <li key={s.key}>
                    <button type="button" className="match-row" onClick={() => openMatch(s.key)}>
                      <span className="match-row__date">{shortDate(s.date)}</span>
                      <span className="match-row__main">
                        <span className="match-row__opp">vs {s.opp}</span>
                        <span className="muted small">{s.tournament}</span>
                      </span>
                      <span className="score">{s.w}–{s.l}</span>
                      <span className={`badge badge--${s.won ? 'win' : 'loss'}`}>{s.won ? 'Win' : 'Loss'}</span>
                      <Icon name="chevronRight" size={16} className="match-row__chev" />
                    </button>
                  </li>
                ))}
              </ul>
            ))}
          </div>
          {pages.length > 1 && (
            <div className="pager__nav">
              <button type="button" className="icon-btn icon-btn--sm" aria-label="Newer matches" disabled={page === 0} onClick={() => go(page - 1)}>
                <Icon name="chevronLeft" size={16} />
              </button>
              <span className="pager__dots" aria-hidden="true">
                {pages.map((_, i) => <span key={i} className={`pager__dot${i === page ? ' is-active' : ''}`} />)}
              </span>
              <span className="muted small">Page {page + 1} of {pages.length}</span>
              <button type="button" className="icon-btn icon-btn--sm" aria-label="Older matches" disabled={page === pages.length - 1} onClick={() => go(page + 1)}>
                <Icon name="chevronRight" size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
