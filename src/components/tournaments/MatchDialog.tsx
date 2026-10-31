import { useEffect, useRef, useState } from 'react'
import { useEvents } from '../../data/events'
import { dotabuffMatch, duration } from '../../data/tournaments'
import { parseDay } from '../../lib/format'
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
                  ? 'This match hasn’t been played yet. The summary appears here after the game.'
                  : 'Game scoreboards for this series aren’t in OpenDota yet, so only the series score is shown.'}
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
