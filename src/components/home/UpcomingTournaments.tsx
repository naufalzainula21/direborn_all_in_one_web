import { Link } from 'react-router-dom'
import { upcoming } from '../../data/tournaments'
import { NextMatchCard } from '../tournaments/NextMatchCard'

/** Next match and upcoming tournaments (same data as the Tournaments page). */
export function UpcomingTournaments({ now }: { now: Date }) {
  return (
    <section className="card" aria-labelledby="up-title">
      <div className="card__head">
        <h2 id="up-title" className="card__title">Upcoming tournaments</h2>
        <Link to="/tournaments" className="link">All →</Link>
      </div>
      <NextMatchCard now={now} />
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
