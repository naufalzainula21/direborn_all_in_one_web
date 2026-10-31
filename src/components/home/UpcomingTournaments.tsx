import { Link } from 'react-router-dom'
import type { UpcomingTournament } from '../../data/types'
import { parseDay, shortDate } from '../../lib/format'
import { Icon } from '../Icon'

function statusBadge(t: UpcomingTournament) {
  if (t.status === 'registered') return <span className="badge badge--win">Registered</span>
  if (t.status === 'signup') return <span className="badge badge--review">Sign up by {t.signupBy ? shortDate(t.signupBy) : '—'}</span>
  return null
}

export function UpcomingTournaments({ items, today }: { items: UpcomingTournament[]; today: Date }) {
  const [featured, ...rest] = items
  const startsToday = featured && parseDay(featured.date).toDateString() === today.toDateString()
  return (
    <section className="card" aria-labelledby="up-title">
      <div className="card__head">
        <h2 id="up-title" className="card__title">Upcoming tournaments</h2>
        <Link to="/tournaments" className="link">All →</Link>
      </div>

      {featured && (
        <div className="feature">
          <span className="feature__icon"><Icon name="trophy" size={22} /></span>
          <span className="feature__text">
            <span className="feature__name">{featured.name}</span>
            <span className="feature__meta">
              {featured.stage} · {startsToday ? 'starts today' : shortDate(featured.date)}
            </span>
          </span>
        </div>
      )}

      <ul className="upcoming">
        {rest.map((t) => (
          <li key={t.id} className="upcoming__item">
            <span className="upcoming__text">
              <span className="upcoming__name">{t.name}</span>
              <span className="muted small">{t.stage} · {shortDate(t.date)}</span>
            </span>
            {statusBadge(t)}
          </li>
        ))}
      </ul>
    </section>
  )
}
