import { useCallback, useEffect, useId, useState, type FormEvent } from 'react'
import { createUser, fetchUsers, updateUser, type User } from '../data/api'
import { ROLE_LABEL, ROLES, type Role } from '../lib/permissions'
import { useRole } from '../lib/role'

const ROLE_HINT: Record<Role, string> = {
  admin: 'Everything, plus this People page',
  coach: 'Same as manager, without People',
  management: 'Summary + add schedule',
  owner: 'Easy summary, view only',
  creative: 'Summary + add activities',
  player: 'Schedule, scrims, results, goals',
}

/** Admin only: everyone who can log in. */
export function People() {
  const { user: me } = useRole()
  const uid = useId()
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ name: '', username: '', role: 'player' as Role })
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchUsers().then(({ users: u }) => setUsers(u)).catch((err) => setError(err instanceof Error ? err.message : 'Could not load people.'))
  }, [])
  useEffect(load, [load])

  // Suggest a username from the name: "Pota 2" -> "pota2"
  const suggest = (name: string) => name.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError(''); setNotice(''); setBusy('add')
    try {
      const { user } = await createUser({ name: form.name.trim(), username: (form.username || suggest(form.name)).trim(), role: form.role })
      setNotice(`Added ${user.name}. They log in as "${user.username}" with password 123 and pick their own on first login.`)
      setForm({ name: '', username: '', role: form.role })
      load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add.') }
    finally { setBusy(null) }
  }

  const change = async (u: User, p: Parameters<typeof updateUser>[1], message: string) => {
    setError(''); setNotice(''); setBusy(u.id)
    try { await updateUser(u.id, p); setNotice(message); load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update.') }
    finally { setBusy(null) }
  }

  const active = users?.filter((u) => u.active) ?? []
  const off = users?.filter((u) => !u.active) ?? []

  return (
    <>
      <div className="page-head">
        <span className="muted">Only the manager sees this page</span>
        <h1 className="page-title">People</h1>
      </div>

      <section className="card" aria-labelledby={`${uid}-add`}>
        <h2 id={`${uid}-add`} className="card__title">Add a person</h2>
        <form className="people-add" onSubmit={add} noValidate>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-n`}>Name</label>
            <input id={`${uid}-n`} className="input" value={form.name} maxLength={60} placeholder="Pota2"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-u`}>Username</label>
            <input id={`${uid}-u`} className="input" value={form.username} maxLength={30} placeholder={suggest(form.name) || 'pota2'} autoCapitalize="none" spellCheck={false}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-r`}>Role</label>
            <select id={`${uid}-r`} className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn--primary" disabled={busy === 'add' || !form.name.trim()}>{busy === 'add' ? 'Adding…' : 'Add'}</button>
        </form>
        <span className="muted small">{ROLE_HINT[form.role]}. Starting password is 123.</span>
      </section>

      {(error || notice) && <p className={error ? 'field__error' : 'notice'} role={error ? 'alert' : 'status'}>{error || notice}</p>}

      <section className="card" aria-labelledby={`${uid}-list`}>
        <div className="card__head">
          <h2 id={`${uid}-list`} className="card__title">Team accounts</h2>
          <span className="muted small">{active.length} active</span>
        </div>
        {!users ? <p className="muted">Loading…</p> : (
          <ul className="people">
            {[...active, ...off].map((u) => (
              <li key={u.id} className={`people__row${u.active ? '' : ' is-off'}`}>
                <span className="people__who">
                  <span className="people__name">{u.name}{u.id === me.id && <span className="muted small"> (you)</span>}</span>
                  <span className="muted small">@{u.username}{u.mustChange && u.active ? ' · hasn’t set a password yet' : ''}{!u.active ? ' · turned off' : ''}</span>
                </span>
                <select className="input people__role" aria-label={`Role for ${u.name}`} value={u.role} disabled={busy === u.id || !u.active}
                  onChange={(e) => change(u, { role: e.target.value as Role }, `${u.name} is now ${ROLE_LABEL[e.target.value as Role]}.`)}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
                <span className="people__actions">
                  {u.active && (
                    <button type="button" className="ghost-btn" disabled={busy === u.id}
                      onClick={() => window.confirm(`Reset ${u.name}'s password to 123? They'll pick a new one at next login.`) && change(u, { resetPassword: true }, `${u.name}'s password is 123 again.`)}>
                      Reset password
                    </button>
                  )}
                  {u.id !== me.id && (
                    <button type="button" className={`ghost-btn${u.active ? ' ghost-btn--danger' : ''}`} disabled={busy === u.id}
                      onClick={() => (u.active ? window.confirm(`Turn off ${u.name}'s account? They won't be able to log in. Their history stays.`) : true)
                        && change(u, { active: !u.active }, u.active ? `${u.name} can no longer log in.` : `${u.name} can log in again.`)}>
                      {u.active ? 'Turn off' : 'Turn on'}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
