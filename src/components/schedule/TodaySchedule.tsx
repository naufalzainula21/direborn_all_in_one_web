import type { CalendarEvent } from '../../data/types'
import { nowHHMM, parseDay, todayISO } from '../../lib/format'
import { TYPE_LABEL } from './meta'
import { useEvents } from '../../data/events'

type Status = 'done' | 'next' | 'later'
const STATUS_LABEL: Record<Status, string> = { done: 'Done', next: 'Up next', later: 'Later' }

export function TodaySchedule({ events, now }: { events: CalendarEvent[]; now: Date }) {
  const today = todayISO(now)
  const { openEvent } = useEvents()
  const time = nowHHMM(now)
  const items = events.filter((e) => e.date === today)
  const nextIndex = items.findIndex((e) => e.time === 'TBD' || e.time > time)
  const title = parseDay(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <section className="today" aria-labelledby="today-title">
      <div className="today__head">
        <div className="today__heading">
          <span className="today__eyebrow">Today's schedule</span>
          <h2 id="today-title" className="today__title">{title}</h2>
        </div>
        <span className="today__meta">
          {items.length} {items.length === 1 ? 'event' : 'events'} · now {time} WIB
        </span>
      </div>

      {items.length === 0 ? (
        <p className="today__empty">Nothing scheduled today. Rest day.</p>
      ) : (
        <div className="today__grid">
          {items.map((e, i) => {
            const status: Status = nextIndex === -1 || i < nextIndex ? 'done' : i === nextIndex ? 'next' : 'later'
            return (
              <button type="button" key={e.id} onClick={() => openEvent(e)} className={`today-card today-card--btn${e.type === 'tournament' ? ' today-card--match' : ''}`}>
                <span className="today-card__top">
                  <span className="today-card__time">{e.time}</span>
                  <span className={`status status--${status}`}>{STATUS_LABEL[status]}</span>
                </span>
                <span className={`badge badge--type-${e.type}`}>
                  {e.type === 'tournament' ? 'Tournament match' : TYPE_LABEL[e.type]}
                </span>
                <span className="today-card__title">{e.opponent && e.type === 'tournament' ? `vs ${e.opponent}` : e.title}</span>
                <span className="today-card__detail">{e.type === 'tournament' ? `${e.title} · ${e.detail}` : e.detail}</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
