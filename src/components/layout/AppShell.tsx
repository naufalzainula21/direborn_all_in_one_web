import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useEvents } from '../../data/events'
import { Icon } from '../Icon'
import { navItems, type NavItem } from './nav'

function NavItemLink({ item, className, iconSize }: { item: NavItem; className: string; iconSize: number }) {
  const content = (
    <>
      <Icon name={item.icon} size={iconSize} />
      {item.label}
    </>
  )
  if (!item.path) {
    return (
      <a href={`#${item.id}`} className={className} title="Coming soon">
        {content}
      </a>
    )
  }
  return (
    <NavLink to={item.path} end={item.path === '/'} className={({ isActive }) => `${className}${isActive ? ' is-active' : ''}`}>
      {content}
    </NavLink>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { openAdd } = useEvents()
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <Link to="/" className="brand">
            <img src="/logo.png" alt="" className="brand__logo" />
            <span className="brand__text">
              <span className="brand__name">Direborn</span>
              <span className="brand__sub">Esport division</span>
            </span>
          </Link>

          <div className="topbar__search">
            <label htmlFor="search" className="sr-only">Search</label>
            <input id="search" type="search" placeholder="Search events, opponents, tournaments" />
          </div>

          <div className="topbar__actions">
            <button type="button" className="btn btn--primary" onClick={() => openAdd()} aria-label="Add event">
              <Icon name="plus" size={16} strokeWidth={2.4} />
              <span className="btn__label">Add event</span>
            </button>
            <div className="user">
              <span className="user__avatar">NZ</span>
              <span className="user__meta">
                <span className="user__name">Manager</span>
                <span className="badge badge--gold">Admin</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <nav aria-label="Main">
            {navItems.map((item) => (
              <NavItemLink key={item.id} item={item} className="sidebar__link" iconSize={18} />
            ))}
          </nav>
        </aside>

        <main className="main">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {navItems.map((item) => (
          <NavItemLink key={item.id} item={item} className="tabbar__link" iconSize={22} />
        ))}
      </nav>
    </div>
  )
}
