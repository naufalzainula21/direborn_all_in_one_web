import { useId, useState, type FormEvent } from 'react'
import { useAuth } from '../lib/role'

function Brand() {
  return (
    <>
      <img src="/logo.png" alt="" className="role-picker__logo" />
      <span className="brand__name role-picker__brand">Direborn <span className="role-picker__sub">Esport division</span></span>
    </>
  )
}

/** First screen for everyone: username + password. */
export function Login() {
  const { signIn, status } = useAuth()
  const uid = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) { setError('Enter your username and password.'); return }
    setBusy(true); setError('')
    try { await signIn(username.trim(), password) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not log in.') }
    finally { setBusy(false) }
  }

  return (
    <div className="role-picker">
      <form className="role-picker__inner auth" onSubmit={submit} noValidate>
        <Brand />
        <h1 className="role-picker__title">Log in</h1>
        <p className="muted role-picker__lead">Use the username the manager gave you. First time? Your password is <strong>123</strong> and you'll pick a new one next.</p>
        {status === 'offline' && <p className="notice">Can't reach the server. Check your connection and reload.</p>}
        <div className="auth__fields">
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-u`}>Username</label>
            <input id={`${uid}-u`} className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-p`}>Password</label>
            <input id={`${uid}-p`} className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="field__error" role="alert">{error}</p>}
          <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          <span className="muted small">Forgot your password? Ask the manager to reset it.</span>
        </div>
      </form>
    </div>
  )
}

/** Change password: forced on first login, and from the account menu. */
export function ChangePassword({ forced, onDone }: { forced?: boolean; onDone?: () => void }) {
  const { changePassword, signOut, user } = useAuth()
  const uid = useId()
  const [current, setCurrent] = useState(forced ? '' : '')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (next.length < 6) { setError('Use at least 6 characters.'); return }
    if (next !== again) { setError("The two new passwords don't match."); return }
    setBusy(true); setError('')
    try { await changePassword(current, next); onDone?.() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not change the password.') }
    finally { setBusy(false) }
  }

  const form = (
    <form className={forced ? 'role-picker__inner auth' : 'auth auth--inline'} onSubmit={submit} noValidate>
      {forced && <Brand />}
      <h1 className={forced ? 'role-picker__title' : 'page-title'}>{forced ? 'Pick your password' : 'Change password'}</h1>
      {forced && <p className="muted role-picker__lead">Welcome, {user?.name}. Before you start, replace the starting password with your own.</p>}
      <div className="auth__fields">
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-c`}>{forced ? 'Starting password' : 'Current password'}</label>
          <input id={`${uid}-c`} className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={forced ? '123' : ''} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-n`}>New password</label>
          <input id={`${uid}-n`} className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <span className="field__help">At least 6 characters. Not 123, not your username.</span>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-a`}>New password again</label>
          <input id={`${uid}-a`} className="input" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        {error && <p className="field__error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary auth__submit" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        {forced && <button type="button" className="link link--btn" onClick={() => signOut()}>Log out</button>}
      </div>
    </form>
  )
  return forced ? <div className="role-picker">{form}</div> : form
}
