import { Icon } from '../components/Icon'
import { ROLES, useRole } from '../lib/role'

/** First screen: choose who is using the app. Changeable later from the top-right menu. */
export function RolePicker() {
  const { setRole } = useRole()
  return (
    <div className="role-picker">
      <div className="role-picker__inner">
        <img src="/logo.png" alt="" className="role-picker__logo" />
        <span className="brand__name role-picker__brand">Direborn <span className="role-picker__sub">Esport division</span></span>
        <h1 className="role-picker__title">Who’s using the app?</h1>
        <p className="muted role-picker__lead">We’ll set up the screens for you. You can switch any time from the top-right corner.</p>
        <ul className="role-picker__list">
          {ROLES.map((r) => (
            <li key={r.id}>
              <button type="button" className={`role-card role-card--${r.id}`} onClick={() => setRole(r.id)}>
                <span className="role-card__icon"><Icon name={r.icon} size={26} /></span>
                <span className="role-card__text">
                  <span className="role-card__label">{r.label}</span>
                  <span className="muted small">{r.blurb}</span>
                </span>
                <Icon name="chevronRight" size={20} className="role-card__go" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
