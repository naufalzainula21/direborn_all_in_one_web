import { Link } from 'react-router-dom'
import { nextMatch, upcoming } from '../../data/tournaments'
import { Icon } from '../Icon'

/** Next match and upcoming tournaments (same data as the Tournaments page). */
export function UpcomingTournaments() {
  return (
    <section className="card" aria-labelledby="up-title">
      <div className="card__head">
        <h2 id="up-title" className="card__title">Upcoming tournaments</h2>
        <Link to="/tournaments" className="link">All →</Link>
      </div>
      <div className="feature">
        <span className="feature__icon"><Icon name="trophy" size={22} /></span>
        <span className="feature__text">
          <span className="feature__name">{nextMatch.title}</span>
          <span className="feature__meta">{nextMatch.detail}</span>
        </span>
      </div>
      <ul className="upcoming">
        {upcoming.map((u) => (
          <li key={u.name} className="upcoming__item upcoming__item--col">
            <span className="upcoming__top">
              <span className="upcoming__name">{u.name}</span>
              <span className={`badge badge--${u.tone}`}>{u.status}</span>
            </span>
            <span className="small">{u.qual}</span>
            <span className="muted small">{u.main}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
