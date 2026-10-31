// Tournament history and current season.
// Game-level data lives in public/data/direborn-games.json (from OpenDota, team 10150434).
// Placements without game data come from E-Rankings; EPL S19 from Hawk Live.

export type Tone = 'win' | 'loss' | 'gold' | 'champ' | 'est' | 'neutral' | 'next'

export interface PlayerLine {
  n: string // player
  h: string // hero name
  hk: string // hero image key
  lv: number
  k: number
  d: number
  a: number
  nw: number
  lh: number
  dn: number
  gpm: number
  xpm: number
  hd: number
  hh: number
  td: number
  obs: number | null
  sen: number | null
  it: { n: string; k: string }[]
  nt: { n: string; k: string } | null
}

export interface Game {
  id: number
  t: number // unix seconds
  lg: string // league name, matches TournamentInfo.key
  opp: string
  w: boolean
  side: 'Radiant' | 'Dire'
  dur: number
  ks: [number, number] // kills [us, them]
  us: PlayerLine[]
  them: PlayerLine[]
  pb: { o: number; p: boolean; us: boolean; h: string; hk: string }[]
}

export interface TournamentInfo {
  key: string
  name: string
  dates: string
  place: string
  tone: Tone
  info: string
}

export const pastTournaments: TournamentInfo[] = [
  { key: 'DreamLeague Season 30 Qualifiers', name: 'DreamLeague S30 · SEA closed qualifier', dates: '15–16 Oct 2026', place: 'Out', tone: 'loss', info: 'Double elimination · Bo3 · 1 slot to DreamLeague S30' },
  { key: 'EPL S18', name: 'EPL World Series SEA · Season 18', dates: 'Sep – Oct 2026', place: '3rd', tone: 'gold', info: 'Ended 8 Oct 2026 · Online' },
  { key: 'EPL S17', name: 'EPL World Series SEA · Season 17', dates: 'Aug – Sep 2026', place: '2nd', tone: 'gold', info: 'Ended 16 Sep 2026 · Online' },
  { key: 'RES Unchained - A Blast Dota Slam IX Qualifier SEA', name: 'BLAST Slam IX · SEA qualifier', dates: '12–13 Sep 2026', place: 'Out', tone: 'loss', info: 'RES Unchained 6 · Single elimination · Bo3' },
  { key: 'RES Unchained - A Blast Dota Slam VIII Qualifier SEA', name: 'BLAST Slam VIII · SEA qualifier', dates: '29–30 Aug 2026', place: 'Out', tone: 'loss', info: 'RES Unchained 5 · Single elimination · Bo3' },
  { key: 'LHT8', name: 'Lunar Horse Trophy 8', dates: 'Aug 2026', place: '1st', tone: 'champ', info: 'Ended 11 Aug 2026 · Champions' },
  { key: 'EPL World Series: Southeast Asia 2025-2026 Season', name: 'EPL World Series SEA · Season 16', dates: 'Jun 2026', place: '2nd', tone: 'gold', info: 'Ended 28 Jun 2026 · Online' },
  { key: 'The International 2026 - Regional Qualifier Southeast Asia', name: 'The International 2026 · SEA qualifier', dates: '19–20 Jun 2026', place: 'Out', tone: 'loss', info: 'Regional closed qualifier · Bo3' },
  { key: 'Road To EWC 2026 Regional Qualifiers', name: 'Esports World Cup 2026 · SEA qualifier', dates: '3–4 Jun 2026', place: 'Out', tone: 'loss', info: 'Regional closed qualifier · Bo3' },
]

export const running = {
  name: 'EPL World Series SEA · Season 19',
  stage: 'Group stage',
  info: '20 Oct – 5 Nov 2026 · Online · $10,000 · Round robin Bo3, top 6 to playoffs',
  position: '2nd · 5–1',
  status: 'Playoffs confirmed',
  standings: [
    ['Royal Bear', '5–0', '10–0'],
    ['Direborn', '5–1', '10–2'],
    ['Yangon Galacticos', '5–2', '10–6'],
    ['ZENITH', '2–1', '5–2'],
    ['Team Kinetix', '2–2', '4–6'],
    ['Resp Gaming', '1–4', '3–8'],
    ['Cloud Dawning', '1–4', '3–8'],
    ['Team Nemesis Academy', '0–7', '1–14'],
  ] as [string, string, string][],
  matches: [
    { date: '26 Oct', opp: 'Team Kinetix', score: '2–0', res: 'W' },
    { date: '26 Oct', opp: 'Cloud Dawning', score: '2–0', res: 'W' },
    { date: '28 Oct', opp: 'Yangon Galacticos', score: '2–0', res: 'W' },
    { date: '29 Oct', opp: 'Team Nemesis Academy', score: '2–0', res: 'W' },
    { date: '30 Oct', opp: 'Resp Gaming', score: '2–0', res: 'W' },
    { date: '31 Oct', opp: 'Royal Bear', score: '0–2', res: 'L' },
    { date: '~2 Nov', opp: 'ZENITH', score: '–', res: 'Next' },
  ] as { date: string; opp: string; score: string; res: 'W' | 'L' | 'Next' }[],
}

export const nextMatch = {
  label: 'Next match · EPL S19 group stage',
  title: 'Direborn vs ZENITH',
  detail: 'Around Mon 2 Nov · Bo3 · time to be confirmed',
}

export const upcoming: { name: string; status: string; tone: Tone; qual: string; main: string }[] = [
  { name: 'EPL S19 playoffs', status: 'Qualified', tone: 'win', qual: 'Double elimination · Bo3', main: 'After the group stage · ends 5 Nov 2026' },
  { name: 'DreamLeague Season 31', status: 'Estimate', tone: 'est', qual: 'SEA qualifiers: not announced, likely early–mid Dec 2026', main: 'Main event 20–31 Jan 2027 · $500,000' },
  { name: 'PGL Wallachia Season 10', status: 'Estimate', tone: 'est', qual: 'SEA qualifiers: not announced, likely Jan 2027', main: 'Main event 2–14 Mar 2027 · $1,000,000' },
  { name: 'BLAST Slam X', status: 'TBA', tone: 'neutral', qual: 'No dates yet', main: 'BLAST has teased 2027 plans' },
]

export const calendar: { mon: string; day: string; title: string; sub: string; next?: boolean }[] = [
  { mon: 'Nov', day: '2', title: 'EPL S19 · vs ZENITH', sub: 'Last group match · time TBC', next: true },
  { mon: 'Nov', day: '5', title: 'EPL S19 · playoffs end', sub: 'Double elimination Bo3' },
  { mon: 'Dec', day: '2', title: 'DreamLeague S30 main event', sub: '2–13 Dec · not qualified' },
  { mon: 'Dec', day: '?', title: 'DreamLeague S31 SEA qualifiers', sub: 'Estimate · watch for announcement' },
  { mon: 'Jan', day: '20', title: 'DreamLeague S31 main event', sub: '20–31 Jan 2027' },
  { mon: 'Mar', day: '2', title: 'PGL Wallachia S10', sub: '2–14 Mar 2027' },
]

export const podiums = { count: 4, detail: '1st · 2nd · 2nd · 3rd' }
export const bestFinish = { title: 'Champion', detail: 'Lunar Horse Trophy 8 · Aug 2026' }
export const runningSeries = { w: 5, l: 1 }

// ---------- helpers ----------

export interface Series {
  opp: string
  games: Game[]
  w: number
  l: number
  won: boolean
}

/** Group a tournament's games into series (same opponent, games < 4h apart). */
export function seriesFor(games: Game[], key: string): Series[] {
  const list = games.filter((g) => g.lg === key).sort((a, b) => a.t - b.t)
  const out: { opp: string; games: Game[] }[] = []
  for (const g of list) {
    const last = out[out.length - 1]
    if (last && last.opp === g.opp && g.t - last.games[last.games.length - 1].t < 4 * 3600) last.games.push(g)
    else out.push({ opp: g.opp, games: [g] })
  }
  return out.map((s) => {
    const w = s.games.filter((g) => g.w).length
    const l = s.games.length - w
    return { ...s, w, l, won: w > l }
  })
}

export const heroImg = (key: string) => `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${key}.png`
export const itemImg = (key: string) => `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${key}.png`
export const dotabuffMatch = (id: number) => `https://www.dotabuff.com/matches/${id}`
export const opendotaMatch = (id: number) => `https://www.opendota.com/matches/${id}`

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const wib = (t: number) => new Date((t + 7 * 3600) * 1000)
export const gameDate = (t: number) => { const d = wib(t); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}` }
export const gameClock = (t: number) => { const d = wib(t); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }
export const duration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
export const compact = (n: number | null | undefined) => (n == null ? '–' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
