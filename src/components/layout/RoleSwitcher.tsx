import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../Icon'
import { ROLES, roleInfo, useRole } from '../../lib/role'

/** Top-right menu to switch the view between player, staff and creative. */
export function RoleSwitcher() {
  const { role, setRole } = useRole()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const info = roleInfo(role ?? 'staff')

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="role-switch" ref={ref}>
      <button type="button" className="role-switch__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        aria-label={`Viewing as ${info.label}. Switch view`}>
        <span className={`user__avatar role-avatar--${info.id}`}><Icon name={info.icon} size={20} /></span>
        <span className="user__meta">
          <span className="user__name">{info.label}</span>
          <span className="muted small">Switch view</span>
        </span>
        <Icon name="chevronDown" size={16} className="role-switch__chev" />
      </button>
      {open && (
        <div className="role-switch__menu" role="menu" aria-label="View as">
          <span className="role-switch__heading">View as</span>
          {ROLES.map((r) => (
            <button key={r.id} type="button" role="menuitemradio" aria-checked={r.id === role}
              className={`role-switch__item${r.id === role ? ' is-active' : ''}`}
              onClick={() => { setRole(r.id); setOpen(false); navigate('/') }}>
              <span className={`role-switch__icon role-avatar--${r.id}`}><Icon name={r.icon} size={18} /></span>
              <span className="role-switch__text">
                <span className="role-switch__label">{r.label}</span>
                <span className="muted small">{r.blurb}</span>
              </span>
              {r.id === role && <Icon name="check" size={18} className="role-switch__check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
