import type { Placement, ScrimOutcome, ScrimResult, TournamentResult } from '../../data/types'
import { shortDate } from '../../lib/format'

function outcome([us, them]: [number, number]): ScrimOutcome {
  return us > them ? 'win' : us < them ? 'loss' : 'draw'
}

const OUTCOME_LABEL: Record<ScrimOutcome, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' }
const PLACEMENT: Record<Placement, { label: string; tone: string }> = {
  first: { label: '1st', tone: 'gold' },
  second: { label: '2nd', tone: 'gold' },
  top4: { label: 'Top 4', tone: 'neutral' },
  top8: { label: 'Top 8', tone: 'neutral' },
  out: { label: 'Out', tone: 'loss' },
}

function Record({ wins, losses }: { wins: number; losses: number }) {
  return (
    <span className="record">
      This month · <span className="record__w">{wins}W</span> <span className="record__l">{losses}L</span>
    </span>
  )
}

export function TournamentResults({ results }: { results: TournamentResult[] }) {
  const wins = results.reduce((n, r) => n + r.score[0], 0)
  const losses = results.reduce((n, r) => n + r.score[1], 0)
  return (
    <section className="card" aria-labelledby="tres-title">
      <div className="card__head">
        <div className="card__title-row">
          <h2 id="tres-title" className="card__title">Tournament results</h2>
          <Record wins={wins} losses={losses} />
        </div>
        <a href="#tournaments" className="link">All tournaments →</a>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Tournament</th><th className="hide-sm">Stage</th><th>Series</th><th>Placement</th></tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const p = PLACEMENT[r.placement]
              return (
                <tr key={r.id}>
                  <td className="muted">{shortDate(r.date)}</td>
                  <td className="strong">{r.tournament}</td>
                  <td className="muted hide-sm">{r.stage}</td>
                  <td className="score">{r.score[0]} – {r.score[1]}</td>
                  <td><span className={`badge badge--${p.tone}`}>{p.label}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ScrimResults({ results }: { results: ScrimResult[] }) {
  const wins = results.reduce((n, r) => n + r.score[0], 0)
  const losses = results.reduce((n, r) => n + r.score[1], 0)
  return (
    <section className="card" aria-labelledby="scr-title">
      <div className="card__head">
        <div className="card__title-row">
          <h2 id="scr-title" className="card__title">Scrim results</h2>
          <Record wins={wins} losses={losses} />
        </div>
        <a href="#scrims" className="link">All scrims →</a>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Date</th><th>Opponent</th><th className="hide-sm">Games</th><th>Score</th><th>Result</th></tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const o = outcome(r.score)
              return (
                <tr key={r.id}>
                  <td className="muted">{shortDate(r.date)}</td>
                  <td className="strong">{r.opponent}</td>
                  <td className="muted hide-sm">{r.games}</td>
                  <td className="score">{r.score[0]} – {r.score[1]}</td>
                  <td><span className={`badge badge--${o === 'draw' ? 'neutral' : o}`}>{OUTCOME_LABEL[o]}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
