import { useEffect, useRef, useState } from 'react'
import { useEvents } from '../../data/events'
import { dotabuffMatch, duration, running } from '../../data/tournaments'
import { countdown, parseDay } from '../../lib/format'
import { Scoreboard } from './Scoreboard'

/** Popup with a series summary and the match scoreboard. Opened from any page via openMatch(). */
export function MatchDialog() {
  const { matchKey, closeMatch, series } = useEvents()
  const ref = useRef<HTMLDialogElement>(null)
  const s = series.find((x) => x.key === matchKey) ?? null
  const [gameId, setGameId] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (s && !el.open) {
      setGameId(s.games[0]?.id ?? null)
      el.showModal()
    } else if (!s && el.open) {
      el.close()
    }
  }, [s])

  const game = s?.games.find((g) => g.id === gameId) ?? null
  const sgt = (t: string) => { const [h, m] = t.split(':').map(Number); return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
  const start = s && s.time !== 'TBD' ? `${s.date}T${s.time}:00+07:00` : null
  const oppRow = s && s.tourKey === 'EPL S19' ? running.standings.findIndex(([t]) => t === s.opp) : -1
  const usRow = running.standings.findIndex(([t]) => t === 'Direborn')
  const facts: [string, string][] = s ? [
    ['Tournament', s.tournament],
    ...(s.stage ? [['Stage', s.stage] as [string, string]] : []),
    ['Format', s.format],
    ['Time', s.time === 'TBD' ? 'To be confirmed' : `${s.time} WIB · ${sgt(s.time)} SGT`],
    ['Status', s.won === null ? (start ? countdown(start, new Date()) : 'Upcoming') : `${s.won ? 'Won' : 'Lost'} ${s.w}–${s.l}`],
    ...(oppRow >= 0 ? [
      ['Opponent in standings', `${oppRow + 1}. ${s.opp} · ${running.standings[oppRow][1]} (games ${running.standings[oppRow][2]})`] as [string, string],
      ['Direborn in standings', `${usRow + 1}. Direborn · ${running.standings[usRow][1]} (games ${running.standings[usRow][2]})`] as [string, string],
    ] : []),
  ] : []
  const dateLabel = s ? parseDay(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <dialog ref={ref} className="sheet sheet--wide" aria-labelledby="match-title" onClose={closeMatch} onCancel={closeMatch}>
      {s && (
        <div className="sheet__form">
          <header className="sheet__head">
            <div className="tour-head">
              <span className="muted small">{s.tournament}</span>
              <h2 id="match-title" className="sheet__title">Direborn vs {s.opp}</h2>
              <span className="muted small">{dateLabel}{s.time !== 'TBD' ? ` · ${s.time} WIB` : ''}</span>
            </div>
            {s.won !== null ? (
              <span className={`match-score ${s.won ? 'is-win' : 'is-loss'}`}>{s.w}–{s.l}</span>
            ) : (
              <span className="badge badge--next badge--lg">Upcoming</span>
            )}
            <button type="button" className="icon-btn" aria-label="Close" onClick={closeMatch}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>

          <div className="sheet__body">
            <dl className="facts">
              {facts.map(([k, v]) => (
                <div key={k} className="facts__item"><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            {s.note && <p className="notice">{s.note}</p>}
            {s.games.length > 0 ? (
              <>
                <div className="series__games">
                  {s.games.map((g, n) => (
                    <span key={g.id} className="game-pill">
                      <button type="button" aria-pressed={gameId === g.id}
                        className={`game-chip ${g.w ? 'is-win' : 'is-loss'}${gameId === g.id ? ' is-active' : ''}`}
                        onClick={() => setGameId(g.id)}>
                        G{n + 1} · {g.w ? 'W' : 'L'} · {duration(g.dur)}
                      </button>
                      <a className="game-pill__link" href={dotabuffMatch(g.id)} target="_blank" rel="noreferrer"
                        aria-label={`Game ${n + 1} on Dotabuff`}>Dotabuff ↗</a>
                    </span>
                  ))}
                </div>
                {game && <Scoreboard game={game} />}
              </>
            ) : (
              <p className="notice">
                {s.won === null
                  ? 'Not played yet. Scoreboards appear here after the games.'
                  : 'Game scoreboards for this series aren’t in OpenDota yet, so only the series score is shown.'}
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
