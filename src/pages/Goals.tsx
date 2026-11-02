import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { commentGoal, createGoal, deleteGoal, fetchGoals, updateGoal, type Goal } from '../data/api'
import { shortDate, todayISO } from '../lib/format'
import { canEditTeamGoals, canSeeAllPersonalGoals, hasPersonalGoals } from '../lib/permissions'
import { useRole } from '../lib/role'

function GoalForm({ initial, onSave, onCancel, submitLabel }: {
  initial?: Partial<Goal>
  onSave: (g: { title: string; detail: string; due: string | null }) => Promise<void>
  onCancel?: () => void
  submitLabel: string
}) {
  const uid = useId()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [detail, setDetail] = useState(initial?.detail ?? '')
  const [due, setDue] = useState(initial?.due ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Write the goal.'); return }
    setBusy(true); setError('')
    try {
      await onSave({ title: title.trim(), detail: detail.trim(), due: due || null })
      if (!initial) { setTitle(''); setDetail(''); setDue('') }
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.') }
    finally { setBusy(false) }
  }
  return (
    <form className="goal-form" onSubmit={submit} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={`${uid}-t`}>Goal</label>
        <input id={`${uid}-t`} className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Top 2 in EPL SEA Season 20" />
      </div>
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-d`}>Details <span className="field__opt">optional</span></label>
          <input id={`${uid}-d`} className="input" value={detail} maxLength={600} onChange={(e) => setDetail(e.target.value)} placeholder="How we'll get there" />
        </div>
        <div className="field goal-form__due">
          <label className="field__label" htmlFor={`${uid}-due`}>Deadline <span className="field__opt">optional</span></label>
          <input id={`${uid}-due`} className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
      <div className="c-actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}

function GoalCard({ goal, canEdit, canComment, onChanged, today }: { goal: Goal; canEdit: boolean; canComment: boolean; onChanged: () => void; today: string }) {
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const done = goal.status === 'done'
  const late = !done && goal.due && goal.due < today

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError('')
    try { await fn(); onChanged() } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.') }
    finally { setBusy(false) }
  }

  if (editing) {
    return (
      <li className="goal">
        <GoalForm initial={goal} submitLabel="Save" onCancel={() => setEditing(false)}
          onSave={async (g) => { await updateGoal(goal.id, g); setEditing(false); onChanged() }} />
      </li>
    )
  }

  return (
    <li className={`goal${done ? ' is-done' : ''}`}>
      <div className="goal__main">
        <span className={`goal__check${done ? ' is-done' : ''}`} aria-hidden="true">{done ? '✓' : ''}</span>
        <div className="goal__text">
          <span className="goal__title">{goal.title}</span>
          {goal.detail && <span className="muted small">{goal.detail}</span>}
          <span className="goal__meta">
            {done ? <span className="badge badge--win">Done</span> : late ? <span className="badge badge--loss">Overdue</span> : <span className="badge badge--neutral">In progress</span>}
            {goal.due && <span className="muted small">Deadline {shortDate(goal.due)}</span>}
          </span>
        </div>
      </div>
      {canEdit && (
        <div className="goal__actions">
          <button type="button" className="ghost-btn" disabled={busy} onClick={() => act(() => updateGoal(goal.id, { status: done ? 'active' : 'done' }))}>
            {done ? 'Reopen' : 'Mark done'}
          </button>
          <button type="button" className="ghost-btn" disabled={busy} onClick={() => setEditing(true)}>Edit</button>
          <button type="button" className="ghost-btn ghost-btn--danger" disabled={busy}
            onClick={() => window.confirm(`Delete "${goal.title}"?`) && act(() => deleteGoal(goal.id))}>Delete</button>
        </div>
      )}
      {goal.scope === 'personal' && (goal.comments.length > 0 || canComment) && (
        <div className="goal__comments">
          {goal.comments.map((c) => (
            <p key={c.id} className="goal__comment"><strong>{c.author}</strong>{c.authorRole && c.authorRole !== 'player' ? <span className="muted small"> · {c.authorRole === 'admin' ? 'Manager' : 'Coach'}</span> : null}: {c.body}</p>
          ))}
          {canComment && (
            <form className="goal__reply" onSubmit={(e) => { e.preventDefault(); if (comment.trim()) act(async () => { await commentGoal(goal.id, comment.trim()); setComment('') }) }}>
              <input className="input" value={comment} maxLength={600} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment" aria-label={`Comment on ${goal.title}`} />
              <button type="submit" className="ghost-btn" disabled={busy || !comment.trim()}>Send</button>
            </form>
          )}
        </div>
      )}
      {error && <p className="field__error" role="alert">{error}</p>}
    </li>
  )
}

export function Goals({ now }: { now: Date }) {
  const { role, user } = useRole()
  const [goals, setGoals] = useState<Goal[] | null>(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<'team' | 'personal' | null>(null)
  const today = todayISO(now)

  const load = useCallback(() => {
    fetchGoals().then(({ goals: g }) => setGoals(g)).catch((err) => setError(err instanceof Error ? err.message : 'Could not load goals.'))
  }, [])
  useEffect(load, [load])

  const team = goals?.filter((g) => g.scope === 'team') ?? []
  const mine = goals?.filter((g) => g.scope === 'personal' && g.userId === user.id) ?? []
  const byPlayer = useMemo(() => {
    const m = new Map<string, Goal[]>()
    for (const g of goals ?? []) if (g.scope === 'personal' && g.userId !== user.id) m.set(g.owner ?? 'Player', [...(m.get(g.owner ?? 'Player') ?? []), g])
    return [...m].sort((a, b) => a[0].localeCompare(b[0]))
  }, [goals, user.id])
  const progress = (list: Goal[]) => list.length ? `${list.filter((g) => g.status === 'done').length} of ${list.length} done` : 'None yet'

  return (
    <>
      <div className="page-head">
        <span className="muted">{hasPersonalGoals(role) ? 'Team goals, plus your own (only you, the manager and the coach see yours)' : canSeeAllPersonalGoals(role) ? 'Team goals and every player’s personal goals' : 'What the team is working towards'}</span>
        <h1 className="page-title">Targets & goals</h1>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}

      <div className="home-grid">
        <div className="stack">
          <section className="card" aria-labelledby="team-goals">
            <div className="card__head">
              <h2 id="team-goals" className="card__title">Team targets</h2>
              <span className="muted small">{progress(team)}</span>
            </div>
            {!goals ? <p className="muted">Loading…</p> : team.length === 0 ? <p className="muted">No team targets yet.{canEditTeamGoals(role) ? ' Add the first one.' : ''}</p> : (
              <ul className="goals">{team.map((g) => <GoalCard key={g.id} goal={g} today={today} canEdit={canEditTeamGoals(role)} canComment={false} onChanged={load} />)}</ul>
            )}
            {canEditTeamGoals(role) && (adding === 'team'
              ? <GoalForm submitLabel="Add target" onCancel={() => setAdding(null)} onSave={async (g) => { await createGoal('team', g); setAdding(null); load() }} />
              : <button type="button" className="ghost-btn" onClick={() => setAdding('team')}>+ Add team target</button>)}
          </section>
        </div>

        <div className="stack">
          {hasPersonalGoals(role) && (
            <section className="card" aria-labelledby="my-goals">
              <div className="card__head">
                <h2 id="my-goals" className="card__title">My goals</h2>
                <span className="muted small">{progress(mine)}</span>
              </div>
              {goals && mine.length === 0 && <p className="muted">Set a goal for yourself, like a hero pool, laning target or habit. The coach can comment on it.</p>}
              <ul className="goals">{mine.map((g) => <GoalCard key={g.id} goal={g} today={today} canEdit canComment onChanged={load} />)}</ul>
              {adding === 'personal'
                ? <GoalForm submitLabel="Add goal" onCancel={() => setAdding(null)} onSave={async (g) => { await createGoal('personal', g); setAdding(null); load() }} />
                : <button type="button" className="ghost-btn" onClick={() => setAdding('personal')}>+ Add my goal</button>}
            </section>
          )}

          {canSeeAllPersonalGoals(role) && (
            <section className="card" aria-labelledby="player-goals">
              <div className="card__head">
                <h2 id="player-goals" className="card__title">Players’ goals</h2>
                <span className="muted small">Only you, the coach/manager and each player see these</span>
              </div>
              {goals && byPlayer.length === 0 && <p className="muted">No player has set a goal yet.</p>}
              {byPlayer.map(([name, list]) => (
                <div key={name} className="goal-group">
                  <h3 className="goal-group__name">{name} <span className="muted small">· {progress(list)}</span></h3>
                  <ul className="goals">{list.map((g) => <GoalCard key={g.id} goal={g} today={today} canEdit={false} canComment onChanged={load} />)}</ul>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
