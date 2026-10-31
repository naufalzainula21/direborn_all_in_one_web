import { useEvents } from '../../data/events'
import { countdown, matchTime, parseDay } from '../../lib/format'
import { nextTournamentMatch, startISO } from '../../lib/schedule'

/** Next tournament match from the shared schedule (team events + official matches). */
export function NextMatchCard({ now }: { now: Date }) {
  const { events, openMatch } = useEvents()
  const m = nextTournamentMatch(events, now)
  if (!m) {
    return (
      <div className="feature feature--col">
        <span className="feature__meta">Next match</span>
        <span className="feature__name">Nothing scheduled</span>
      </div>
    )
  }
  const when = m.time === 'TBD'
    ? `${parseDay(m.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · time TBC`
    : `${matchTime(startISO(m), now)} · ${countdown(startISO(m), now)}`
  const body = (
    <>
      <span className="feature__meta">Next match · {m.title}</span>
      <span className="feature__name">{m.opponent ? `Direborn vs ${m.opponent}` : m.title}</span>
      <span className="feature__meta">{when}</span>
    </>
  )
  return m.seriesKey ? (
    <button type="button" className="feature feature--col feature--btn" onClick={() => openMatch(m.seriesKey!)}>{body}</button>
  ) : (
    <div className="feature feature--col">{body}</div>
  )
}
