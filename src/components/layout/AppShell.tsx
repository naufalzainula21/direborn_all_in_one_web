import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { navItems } from './nav'

interface Props {
  active: string
  children: ReactNode
}

export function AppShell({ active, children }: Props) {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <a href="/" className="brand">
            <img src="/logo.png" alt="" className="brand__logo" />
            <span className="brand__text">
              <span className="brand__name">Direborn</span>
              <span className="brand__sub">Esport division</span>
            </span>
          </a>

          <div className="topbar__search">
            <label htmlFor="search" className="sr-only">Search</label>
            <input id="search" type="search" placeholder="Search events, opponents, tournaments" />
          </div>

          <div className="topbar__actions">
            <button type="button" className="btn btn--primary">
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
              <a
                key={item.id}
                href={item.id === 'home' ? '/' : `#${item.id}`}
                className={`sidebar__link${item.id === active ? ' is-active' : ''}`}
                aria-current={item.id === active ? 'page' : undefined}
              >
                <Icon name={item.icon} />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="main">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={item.id === 'home' ? '/' : `#${item.id}`}
            className={`tabbar__link${item.id === active ? ' is-active' : ''}`}
            aria-current={item.id === active ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
