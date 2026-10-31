import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game, TournamentInfo } from '../../data/tournaments'
import { dotabuffMatch, duration, gameDate, heroImg, seriesFor } from '../../data/tournaments'
import { Scoreboard } from './Scoreboard'

interface Highlight {
  label: string
  value: string
  detail: string
  heroKey?: string
}

function highlights(games: Game[]): Highlight[] {
  if (games.length === 0) return []
  const wins = games.filter((g) => g.w)
  const lines = games.flatMap((g) => g.us.map((p) => ({ g, p })))
  const best = <T,>(arr: T[], score: (x: T) => number) => arr.reduce((a, b) => (score(b) > score(a) ? b : a))
  const kda = best(lines, ({ p }) => (p.k + p.a) / Math.max(1, p.d))
  const kills = best(lines, ({ p }) => p.k)
  const nw = best(lines, ({ p }) => p.nw)
  const dmg = best(lines, ({ p }) => p.hd)
  const avg = Math.round(games.reduce((n, g) => n + g.dur, 0) / games.length)
  const out: Highlight[] = [
    { label: 'Games', value: `${wins.length}–${games.length - wins.length}`, detail: `Avg game ${duration(avg)}` },
    { label: 'Best KDA', value: `${kda.p.k}/${kda.p.d}/${kda.p.a}`, detail: `${kda.p.n} · ${kda.p.h} vs ${kda.g.opp}`, heroKey: kda.p.hk },
    { label: 'Most kills', value: String(kills.p.k), detail: `${kills.p.n} · ${kills.p.h} vs ${kills.g.opp}`, heroKey: kills.p.hk },
    { label: 'Top net worth', value: `${(nw.p.nw / 1000).toFixed(1)}k`, detail: `${nw.p.n} · ${nw.p.h}`, heroKey: nw.p.hk },
    { label: 'Top hero damage', value: `${(dmg.p.hd / 1000).toFixed(1)}k`, detail: `${dmg.p.n} · ${dmg.p.h}`, heroKey: dmg.p.hk },
  ]
  if (wins.length) {
    const fast = wins.reduce((a, b) => (b.dur < a.dur ? b : a))
    out.push({ label: 'Fastest win', value: duration(fast.dur), detail: `vs ${fast.opp} · ${gameDate(fast.t)}` })
  }
  return out
}

export function TournamentDialog({ tour, games, onClose }: { tour: TournamentInfo | null; games: Game[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [gameId, setGameId] = useState<number | null>(null)
  const series = useMemo(() => (tour ? seriesFor(games, tour.key) : []), [tour, games])
  const tourGames = useMemo(() => series.flatMap((s) => s.games), [series])
  const hl = useMemo(() => highlights(tourGames), [tourGames])
  const selected = tourGames.find((g) => g.id === gameId) ?? null

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (tour && !el.open) {
      setGameId(null)
      el.showModal()
    } else if (!tour && el.open) {
      el.close()
    }
  }, [tour])

  // Bring the match summary into view when a game is picked.
  useEffect(() => {
    if (gameId != null) boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [gameId])

  const sw = series.filter((s) => s.won).length

  return (
    <dialog ref={ref} className="sheet sheet--wide" aria-labelledby="tour-title" onClose={onClose} onCancel={onClose}>
      {tour && (
        <div className="sheet__form">
          <header className="sheet__head">
            <div className="tour-head">
              <h2 id="tour-title" className="sheet__title">{tour.name}</h2>
              <span className="muted small">{tour.dates} · {tour.info}</span>
            </div>
            <span className={`badge badge--${tour.tone} badge--lg`}>{tour.place}</span>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </header>

          <div className="sheet__body">
            {series.length === 0 ? (
              <p className="notice">
                Game-by-game data for this event isn't in OpenDota, so only the placement is shown (from E-Rankings).
              </p>
            ) : (
              <>
                <section aria-label="Highlights" className="hl-grid">
                  <div className="hl hl--feature">
                    <span className="hl__label">Series</span>
                    <span className="hl__value">{sw}–{series.length - sw}</span>
                    <span className="hl__detail">Placement: {tour.place}</span>
                  </div>
                  {hl.map((h) => (
                    <div key={h.label} className="hl">
                      <span className="hl__label">{h.label}</span>
                      <span className="hl__row">
                        {h.heroKey && <img src={heroImg(h.heroKey)} alt="" width={40} height={22} loading="lazy" />}
                        <span className="hl__value">{h.value}</span>
                      </span>
                      <span className="hl__detail">{h.detail}</span>
                    </div>
                  ))}
                </section>

                <section aria-label="Series" className="series-list">
                  {series.map((s, i) => (
                    <div key={i} className="series">
                      <span className="series__date">{gameDate(s.games[0].t)}</span>
                      <span className="series__opp">vs {s.opp}</span>
                      <span className="series__score">{s.w}–{s.l}</span>
                      <span className={`badge badge--${s.won ? 'win' : 'loss'}`}>{s.won ? 'Won' : 'Lost'}</span>
                      <div className="series__games">
                        {s.games.map((g, n) => (
                          <span key={g.id} className="game-pill">
                            <button type="button" aria-pressed={gameId === g.id}
                              className={`game-chip ${g.w ? 'is-win' : 'is-loss'}${gameId === g.id ? ' is-active' : ''}`}
                              onClick={() => setGameId(gameId === g.id ? null : g.id)}>
                              G{n + 1} · {g.w ? 'W' : 'L'} · {duration(g.dur)}
                            </button>
                            <a className="game-pill__link" href={dotabuffMatch(g.id)} target="_blank" rel="noreferrer"
                              aria-label={`Game ${n + 1} vs ${s.opp} on Dotabuff`}>Dotabuff ↗</a>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>

                {selected ? (
                  <div ref={boardRef}><Scoreboard game={selected} /></div>
                ) : (
                  <p className="muted small">Tap a game to see the full match summary.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
