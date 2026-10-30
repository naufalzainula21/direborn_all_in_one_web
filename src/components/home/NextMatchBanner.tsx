import type { NextMatch } from '../../data/types'
import { countdown, matchTime } from '../../lib/format'

export function NextMatchBanner({ match, now }: { match: NextMatch; now: Date }) {
  return (
    <section className="hero" aria-label="Next match">
      <div className="hero__body">
        <span className="hero__eyebrow">Next match · {match.format}</span>
        <h2 className="hero__title">
          Direborn <span className="hero__vs">vs</span> {match.opponent}
        </h2>
        <span className="hero__meta">
          {matchTime(match.start, now)} · {match.tournament}
        </span>
      </div>
      <span className="hero__countdown">{countdown(match.start, now)}</span>
    </section>
  )
}
