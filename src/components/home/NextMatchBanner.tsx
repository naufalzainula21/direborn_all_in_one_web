import { useEvents } from '../../data/events'
import type { CalendarEvent } from '../../data/types'
import { countdown, matchTime } from '../../lib/format'
import { formatOf, startISO } from '../../lib/schedule'

export function NextMatchBanner({ match, now }: { match?: CalendarEvent; now: Date }) {
  const { openAdd } = useEvents()

  if (!match) {
    return (
      <section className="hero hero--empty" aria-label="Next match">
        <div className="hero__body">
          <span className="hero__eyebrow">Next match</span>
          <h2 className="hero__title">No tournament match scheduled</h2>
        </div>
        <button type="button" className="hero__countdown hero__action staff-only" onClick={() => openAdd()}>Add event</button>
      </section>
    )
  }

  const start = startISO(match)
  const format = formatOf(match)
  return (
    <section className="hero" aria-label="Next match">
      <div className="hero__body">
        <span className="hero__eyebrow">Next match · Tournament{format ? ` · ${format}` : ''}</span>
        <h2 className="hero__title">
          {match.opponent ? (
            <>Direborn <span className="hero__vs">vs</span> {match.opponent}</>
          ) : (
            match.title
          )}
        </h2>
        <span className="hero__meta">
          {match.time === 'TBD' ? 'Time TBD' : matchTime(start, now)} · {match.title}
        </span>
      </div>
      {match.time !== 'TBD' && <span className="hero__countdown">{countdown(start, now)}</span>}
    </section>
  )
}
