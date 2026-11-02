import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../Icon'
import { roleInfo, useAuth, useRole } from '../../lib/role'

/** Top-right: who is logged in, change password, log out. */
export function UserMenu() {
  const { user, role } = useRole()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const info = roleInfo(role)

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
        aria-label={`${user.name}, ${info.label}. Account menu`}>
        <span className={`user__avatar role-avatar--${role}`}><Icon name={info.icon} size={20} /></span>
        <span className="user__meta">
          <span className="user__name">{user.name}</span>
          <span className="muted small">{info.label}</span>
        </span>
        <Icon name="chevronDown" size={16} className="role-switch__chev" />
      </button>
      {open && (
        <div className="role-switch__menu" role="menu" aria-label="Account">
          <span className="role-switch__heading">@{user.username}</span>
          <button type="button" role="menuitem" className="role-switch__item" onClick={() => { setOpen(false); navigate('/account') }}>
            <span className="role-switch__icon role-avatar--staff"><Icon name="key" size={18} /></span>
            <span className="role-switch__text"><span className="role-switch__label">Change password</span></span>
          </button>
          <button type="button" role="menuitem" className="role-switch__item" onClick={() => { setOpen(false); signOut().then(() => navigate('/')) }}>
            <span className="role-switch__icon role-avatar--creative"><Icon name="logout" size={18} /></span>
            <span className="role-switch__text"><span className="role-switch__label">Log out</span></span>
          </button>
        </div>
      )}
    </div>
  )
}
