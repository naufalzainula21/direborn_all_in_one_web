import type { Game, PlayerLine } from '../../data/tournaments'
import { compact, dotabuffMatch, duration, gameClock, gameDate, heroImg, itemImg, opendotaMatch } from '../../data/tournaments'

function HeroCell({ p }: { p: PlayerLine }) {
  return (
    <span className="sb-hero">
      <img src={heroImg(p.hk)} alt="" width={48} height={27} loading="lazy" />
      <span className="sb-hero__text">
        <span className="sb-hero__name">{p.h}</span>
        <span className="muted small">Lv {p.lv}</span>
      </span>
    </span>
  )
}

function Items({ p }: { p: PlayerLine }) {
  return (
    <span className="sb-items">
      {p.it.map((it, i) => (
        <img key={i} src={itemImg(it.k)} alt={it.n} title={it.n} width={33} height={24} loading="lazy" />
      ))}
      {p.nt && (
        <img className="sb-items__neutral" src={itemImg(p.nt.k)} alt={`Neutral: ${p.nt.n}`} title={`Neutral: ${p.nt.n}`} width={24} height={24} loading="lazy" />
      )}
    </span>
  )
}

function TeamTable({ team, side, players, us }: { team: string; side: string; players: PlayerLine[]; us: boolean }) {
  return (
    <div className="sb-team">
      <div className="sb-team__head">
        <span className={`dot dot--lg ${us ? 'dot--tournament' : 'dot--other'}`} />
        <span className="sb-team__name">{team}</span>
        <span className="muted small">{side}</span>
      </div>
      <div className="table-wrap sb-wrap">
        <table className="sb">
          <thead>
            <tr>
              <th className="l">Hero</th><th className="l">Player</th>
              <th>K</th><th>D</th><th>A</th><th>Net</th><th>LH / DN</th><th>GPM / XPM</th>
              <th>Dmg</th><th>Heal</th><th>Bld</th><th>Wards</th><th className="l">Items</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={i}>
                <td className="l"><HeroCell p={p} /></td>
                <td className="l">{p.n}</td>
                <td className="strong">{p.k}</td><td>{p.d}</td><td>{p.a}</td>
                <td className="sb-nw">{compact(p.nw)}</td>
                <td>{p.lh} / {p.dn}</td>
                <td>{p.gpm} / {p.xpm}</td>
                <td>{compact(p.hd)}</td>
                <td>{p.hh ? compact(p.hh) : '–'}</td>
                <td>{compact(p.td)}</td>
                <td>{p.obs ?? 0} / {p.sen ?? 0}</td>
                <td className="l"><Items p={p} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Scoreboard({ game }: { game: Game }) {
  const other = game.side === 'Radiant' ? 'Dire' : 'Radiant'
  return (
    <div className="scoreboard">
      <div className="scoreboard__head">
        <div className="scoreboard__title">
          <span className={`scoreboard__result ${game.w ? 'is-win' : 'is-loss'}`}>
            {game.w ? 'Direborn victory' : `${game.opp} victory`}
          </span>
          <span className="muted small">
            {gameDate(game.t)} · {gameClock(game.t)} WIB · vs {game.opp} · Direborn on {game.side}
          </span>
        </div>
        <div className="scoreboard__score" aria-label={`Kills ${game.ks[0]} to ${game.ks[1]}, duration ${duration(game.dur)}`}>
          <span className="is-win">{game.ks[0]}</span>
          <span className="scoreboard__dur">{duration(game.dur)}</span>
          <span className="is-loss">{game.ks[1]}</span>
        </div>
        <div className="scoreboard__links">
          <a className="ext-link" href={dotabuffMatch(game.id)} target="_blank" rel="noreferrer">Dotabuff ↗</a>
          <a className="ext-link ext-link--ghost" href={opendotaMatch(game.id)} target="_blank" rel="noreferrer">OpenDota ↗</a>
        </div>
      </div>

      <TeamTable team="Direborn" side={game.side} players={game.us} us />
      <TeamTable team={game.opp} side={other} players={game.them} us={false} />

      {game.pb.length > 0 && (
        <div className="draft">
          <span className="draft__title">Draft</span>
          <ol className="draft__list">
            {game.pb.map((p) => (
              <li key={p.o} className={`draft__item${p.p ? ' is-pick' : ' is-ban'}${p.us ? ' is-us' : ' is-them'}`}
                title={`${p.o + 1}. ${p.us ? 'Direborn' : game.opp} ${p.p ? 'pick' : 'ban'}: ${p.h}`}>
                <img src={heroImg(p.hk)} alt="" width={48} height={27} loading="lazy" />
                <span className="draft__meta">{p.o + 1} · {p.p ? 'Pick' : 'Ban'}</span>
                <span className="sr-only">{p.us ? 'Direborn' : game.opp} {p.p ? 'pick' : 'ban'} {p.h}</span>
              </li>
            ))}
          </ol>
          <span className="muted small">Red = Direborn, grey = {game.opp}. Faded = ban.</span>
        </div>
      )}
    </div>
  )
}
