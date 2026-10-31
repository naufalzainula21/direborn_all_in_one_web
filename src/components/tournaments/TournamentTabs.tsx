import { NavLink } from 'react-router-dom'

/** Sub-navigation for the Tournaments section. */
export function TournamentTabs() {
  return (
    <nav className="subtabs" aria-label="Tournaments">
      <NavLink to="/tournaments" end className={({ isActive }) => `subtabs__link${isActive ? ' is-active' : ''}`}>Overview</NavLink>
      <NavLink to="/tournaments/upcoming" className={({ isActive }) => `subtabs__link${isActive ? ' is-active' : ''}`}>Upcoming 2026–27</NavLink>
    </nav>
  )
}
