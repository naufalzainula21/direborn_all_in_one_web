/**
 * Liquipedia (dota2) tournament reader.
 *
 * Uses the public MediaWiki API (api.php) under Liquipedia's API terms:
 * a descriptive User-Agent, gzip, and at most one request every 2 seconds.
 * Pages are read as wikitext (action=query, not action=parse, which is limited to 1 per 30 s)
 * and parsed here, so one tournament costs one or two requests.
 */

export const LP_BASE = 'https://liquipedia.net/dota2'
let API = `${LP_BASE}/api.php`
/** Local testing only: point at a stand-in server (env LP_API). */
export const setApiBase = (url: string) => { API = url }

/** Names Direborn appears under on Liquipedia. Compared after lowercasing and removing spaces/punctuation. */
const ALIASES = ['direborn', 'direbornesports', 'direbornesport', 'teamdireborn']
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
export const isDireborn = (name: string) => ALIASES.includes(norm(name))

// ---------- Fetching ----------

let lastRequest = 0
/** One request at a time, at least 2.1 s apart (per Worker instance). */
async function lpFetch(params: Record<string, string>, userAgent: string): Promise<unknown> {
  const wait = lastRequest + 2100 - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequest = Date.now()
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`
  const res = await fetch(url, { headers: { 'User-Agent': userAgent, 'Accept-Encoding': 'gzip' } })
  if (res.status === 429) throw new LiquipediaError('Liquipedia is limiting requests right now. Try again in a few minutes.')
  if (!res.ok) throw new LiquipediaError(`Liquipedia answered ${res.status}.`)
  try { return await res.json() } catch { throw new LiquipediaError('Liquipedia sent an unexpected answer.') }
}

export class LiquipediaError extends Error {}

export interface SearchHit { page: string; title: string }

/**
 * Find tournament pages from what someone typed, e.g. "EPL season 19".
 * Liquipedia's title search is prefix-based, so we search on the first word
 * and rank the results by how many of the typed words and numbers they contain.
 */
export async function searchTournaments(query: string, userAgent: string): Promise<SearchHit[]> {
  const words = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const stop = new Set(['season', 'the', 'of', 's'])
  const first = words.find((w) => !stop.has(w) && !/^\d+$/.test(w)) ?? words[0]
  const data = await lpFetch({ action: 'opensearch', search: first, limit: '100', namespace: '0', redirects: 'resolve' }, userAgent) as [string, string[]]
  const titles = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : []
  const want = words.filter((w) => !stop.has(w))
  const nums = want.filter((w) => /^\d+$/.test(w))
  const scored = titles.map((t) => {
    const parts = t.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    let score = 0
    for (const w of want) if (parts.includes(w)) score += /^\d+$/.test(w) ? 3 : 2; else if (parts.some((p) => p.startsWith(w))) score += 1
    // A number the person typed should match the page's number (season, edition), not just appear somewhere.
    if (nums.length && !nums.every((n) => parts.includes(n))) score -= 4
    // Prefer main tournament pages over sub-pages like /Qualifier or /Statistics.
    score -= (t.split('/').length - 1) * 0.1
    return { t, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ t }) => ({ page: t.replace(/ /g, '_'), title: prettyTitle(t) }))
}

/** "EPL/World Series/Southeast Asia/19" -> "EPL World Series Southeast Asia 19" */
const prettyTitle = (t: string) => t.replace(/_/g, ' ').split('/').join(' · ')

/** Wikitext of a page and of the sub-pages it pulls matches from (max 2 requests). */
async function fetchTournamentText(page: string, userAgent: string): Promise<{ title: string; text: string }> {
  const read = async (titles: string[]) => {
    const data = await lpFetch({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: titles.join('|') }, userAgent) as {
      query?: { pages?: { title: string; missing?: boolean; revisions?: { slots: { main: { content: string } } }[] }[] }
    }
    return (data.query?.pages ?? []).filter((p) => !p.missing && p.revisions?.length).map((p) => ({ title: p.title, text: p.revisions![0].slots.main.content }))
  }
  const [main] = await read([page.replace(/_/g, ' ')])
  if (!main) throw new LiquipediaError('That page was not found on Liquipedia.')
  // Matches are sometimes kept on sub-pages, transcluded ({{:Page/Group Stage}}) or linked from tabs.
  const subs = new Set<string>()
  const prefix = main.title + '/'
  for (const m of main.text.matchAll(/\{\{:([^}|]+)\}\}/g)) if (m[1].trim().startsWith(prefix)) subs.add(m[1].trim())
  for (const m of main.text.matchAll(/\|link\d+=([^|}\n]+)/g)) if (m[1].trim().startsWith(prefix)) subs.add(m[1].trim())
  let text = main.text
  if (subs.size) {
    const pages = await read([...subs].slice(0, 10))
    for (const p of pages) text += `\n==${p.title.slice(prefix.length)}==\n${p.text}`
  }
  return { title: main.title, text }
}

// ---------- Wikitext helpers ----------

/** Index just after the template that starts at `start` ("{{"), respecting nesting. */
function templateEnd(s: string, start: number): number {
  let depth = 0
  for (let i = start; i < s.length - 1; i++) {
    if (s[i] === '{' && s[i + 1] === '{') { depth++; i++ }
    else if (s[i] === '}' && s[i + 1] === '}') { depth--; i++; if (depth === 0) return i + 1 }
  }
  return s.length
}

/** Top-level parameters of a template body: positional ("1", "2"...) and named. */
function params(tpl: string): Record<string, string> {
  const body = tpl.replace(/^\{\{/, '').replace(/\}\}$/, '')
  const parts: string[] = []
  let depth = 0, cur = ''
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2)
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue }
    if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue }
    cur += body[i]
  }
  parts.push(cur)
  const out: Record<string, string> = { _name: parts[0].trim() }
  let pos = 1
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=')
    const named = eq > 0 && !/\{\{|\[\[/.test(p.slice(0, eq))
    if (named) out[p.slice(0, eq).trim()] = p.slice(eq + 1).trim()
    else out[String(pos++)] = p.trim()
  }
  return out
}

/** Plain text: drop links, templates, refs and HTML. */
function plain(s: string | undefined): string {
  if (!s) return ''
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s([^\]]+)\]/g, '$1')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Offsets from UTC (hours) for the zones Liquipedia uses. */
const ZONES: Record<string, number> = {
  UTC: 0, GMT: 0, WET: 0, WEST: 1, CET: 1, CEST: 2, EET: 2, EEST: 3, MSK: 3, GST: 4, PKT: 5, IST: 5.5,
  ICT: 7, WIB: 7, SGT: 8, PHT: 8, MYT: 8, CST: 8, AWST: 8, HKT: 8, KST: 9, JST: 9, AEST: 10, AEDT: 11,
  EST: -5, EDT: -4, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7, BRT: -3, ART: -3, PET: -5, CLT: -4, CLST: -3,
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const pad = (n: number) => String(n).padStart(2, '0')

/** "October 20, 2026 - 14:00 {{Abbr/SGT}}" -> date and time in WIB. Time 'TBD' when not given. */
export function toWib(raw: string | undefined): { date: string; time: string } | null {
  if (!raw) return null
  const zone = raw.match(/\{\{Abbr\/([A-Z]+)\}\}/)?.[1] ?? raw.match(/\b([A-Z]{3,4})\b/)?.[1]
  const m = raw.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?/) ?? null
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})(?:\s*-?\s*(\d{1,2}):(\d{2}))?/)
  let y: number, mo: number, d: number, hh: number | null = null, mm = 0
  if (m) {
    mo = MONTHS.indexOf(m[1].toLowerCase()); if (mo < 0) return null
    y = +m[3]; d = +m[2]
    if (m[4]) { hh = +m[4]; mm = +m[5] }
  } else if (iso) {
    y = +iso[1]; mo = +iso[2] - 1; d = +iso[3]
    if (iso[4]) { hh = +iso[4]; mm = +iso[5] }
  } else return null
  if (hh === null) return { date: `${y}-${pad(mo + 1)}-${pad(d)}`, time: 'TBD' }
  const offset = zone && zone in ZONES ? ZONES[zone] : 0
  const t = Date.UTC(y, mo, d, hh, mm) - offset * 3600_000 + 7 * 3600_000
  const w = new Date(t)
  return { date: `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}`, time: `${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}` }
}

// ---------- Parsing ----------

export interface LpMatch {
  key: string
  stage: string
  round: string
  date: string | null
  time: string
  team1: string
  team2: string
  score1: number
  score2: number
  bestOf: number
  finished: boolean
}

export interface StandingRow { team: string; played: number; w: number; d: number; l: number; gw: number; gl: number; pts: number; us: boolean }
export interface StandingGroup { name: string; rows: StandingRow[]; showPoints: boolean }
export interface BracketRound { name: string; matches: LpMatch[] }

export interface DirebornMatch {
  key: string
  date: string
  time: string
  opponent: string
  stage: string
  bestOf: number
  scoreUs: number | null
  scoreThem: number | null
  finished: boolean
}

export interface TournamentData {
  page: string
  name: string
  url: string
  startDate: string | null
  endDate: string | null
  prize: string | null
  format: string | null
  type: string | null
  teams: string[]
  matches: LpMatch[]
  groups: StandingGroup[]
  bracket: BracketRound[]
  direborn: DirebornMatch[]
  /** Direborn is listed as a participant (even if no matches are scheduled yet). */
  participating: boolean
  fetchedAt: string
}

function teamOf(v: string | undefined): string {
  if (!v) return ''
  const start = v.indexOf('{{')
  if (start < 0) return plain(v)
  const p = params(v.slice(start, templateEnd(v, start)))
  return plain(p['1'] ?? p.template ?? '')
}

function scoreOf(v: string | undefined): number | null {
  if (!v) return null
  const start = v.indexOf('{{')
  if (start < 0) return null
  const s = params(v.slice(start, templateEnd(v, start))).score
  return s && /^\d+$/.test(s) ? +s : null
}

function parseMatch(tpl: string, key: string, stage: string, round: string): LpMatch {
  const p = params(tpl)
  const team1 = teamOf(p.opponent1), team2 = teamOf(p.opponent2)
  let s1 = 0, s2 = 0, maps = 0, played = 0
  for (const [k, v] of Object.entries(p)) {
    if (!/^map\d+$/.test(k)) continue
    maps++
    const start = v.indexOf('{{')
    if (start < 0) continue
    const mp = params(v.slice(start, templateEnd(v, start)))
    if (mp.finished === 'skip') continue
    if (mp.winner === '1') { s1++; played++ } else if (mp.winner === '2') { s2++; played++ }
  }
  const o1 = scoreOf(p.opponent1), o2 = scoreOf(p.opponent2)
  if (o1 != null && o2 != null) { s1 = o1; s2 = o2 }
  const bestOf = p.bestof && /^\d+$/.test(p.bestof) ? +p.bestof : Math.max(maps, 1)
  const need = Math.floor(bestOf / 2) + 1
  const finished = p.finished === 'true' || s1 >= need || s2 >= need || (bestOf % 2 === 0 && s1 + s2 >= bestOf) || (played > 0 && /skip/.test(tpl) && s1 !== s2)
  const when = toWib(p.date)
  return { key, stage, round, date: when?.date ?? null, time: when?.time ?? 'TBD', team1, team2, score1: s1, score2: s2, bestOf, finished }
}

export function parseTournament(page: string, title: string, text: string): TournamentData {
  const box = (() => {
    const i = text.search(/\{\{Infobox league/i)
    return i >= 0 ? params(text.slice(i, templateEnd(text, i))) : {} as Record<string, string>
  })()
  const name = plain(text.match(/\{\{DISPLAYTITLE:([^}]+)\}\}/)?.[1]) || plain(box.name) || title.replace(/\//g, ' ')

  // Participants
  const teams: string[] = []
  for (const m of text.matchAll(/\{\{(?:Opponent|TeamOpponent)\|([^|}\n]+)/g)) {
    const t = plain(m[1])
    if (t && !teams.includes(t)) teams.push(t)
  }

  // Walk the page in order, remembering headings, containers and bracket round labels.
  const matches: LpMatch[] = []
  const groupOf = new Map<string, string>()
  const marker = /(^==+\s*([^=\n]+?)\s*==+\s*$)|(<!--\s*([^>]*?)\s*-->)|(\{\{(Matchlist|Bracket|SingleMatch|MatchList)\b)|(\|(\w+)=\{\{Match\b)/gm
  let h2 = '', h3 = '', label = '', container = '', containerKind = ''
  let m: RegExpExecArray | null
  while ((m = marker.exec(text))) {
    if (m[1]) {
      const level = m[1].match(/^=+/)![0].length
      const heading = plain(m[2])
      if (level <= 2) { h2 = heading; h3 = '' } else if (level === 3) h3 = heading
      label = ''
    } else if (m[3]) {
      label = plain(m[4])
    } else if (m[5]) {
      const start = m.index
      const head = text.slice(start, Math.min(text.length, start + 400))
      container = head.match(/\|id=([A-Za-z0-9_]+)/)?.[1] ?? `${m[6]}${start}`
      containerKind = m[6] === 'Bracket' ? 'bracket' : 'list'
      label = containerKind === 'list' ? plain(head.match(/\|title=([^|\n}]+)/)?.[1]) : ''
    } else if (m[7]) {
      const slot = m[8]
      const start = m.index + m[0].length - '{{Match'.length
      const end = templateEnd(text, start)
      const stage = h2 || 'Matches'
      const round = containerKind === 'bracket' ? (label || stage) : (h3 && !/^(matches|results|schedule)$/i.test(h3) ? h3 : label || stage)
      const match = parseMatch(text.slice(start, end), `${container}_${slot}`, stage, round)
      matches.push(match)
      if (containerKind === 'list') {
        const inGroup = /group|league|round.?robin|swiss/i.test(stage)
        if (inGroup) groupOf.set(match.key, /^group\s+\w+$/i.test(h3) ? h3 : 'Group stage')
      }
      marker.lastIndex = end
    }
  }

  // Standings computed from finished group matches, using the page's points rule when it has one.
  const gs = (() => {
    const i = text.search(/\{\{GroupStandings/)
    return i >= 0 ? params(text.slice(i, templateEnd(text, i))) : null
  })()
  const pointRule = new Map<string, number>()
  if (gs?.points) for (const part of gs.points.split(',')) {
    const pm = part.trim().match(/^(\d+)-(\d+)\s*=\s*(\d+)$/)
    if (pm) pointRule.set(`${pm[1]}-${pm[2]}`, +pm[3])
  }
  const pointsFor = (a: number, b: number) => pointRule.get(`${a}-${b}`) ?? (a > b ? (pointRule.size ? 3 : 1) : a === b ? (pointRule.size ? 1 : 0) : 0)
  const groupsMap = new Map<string, Map<string, StandingRow>>()
  for (const mt of matches) {
    const g = groupOf.get(mt.key)
    if (!g) continue
    if (!groupsMap.has(g)) groupsMap.set(g, new Map())
    const rows = groupsMap.get(g)!
    for (const t of [mt.team1, mt.team2]) if (t && !rows.has(t)) rows.set(t, { team: t, played: 0, w: 0, d: 0, l: 0, gw: 0, gl: 0, pts: 0, us: isDireborn(t) })
    if (!mt.finished || !mt.team1 || !mt.team2) continue
    const a = rows.get(mt.team1)!, b = rows.get(mt.team2)!
    a.played++; b.played++
    a.gw += mt.score1; a.gl += mt.score2; b.gw += mt.score2; b.gl += mt.score1
    if (mt.score1 > mt.score2) { a.w++; b.l++ } else if (mt.score2 > mt.score1) { b.w++; a.l++ } else { a.d++; b.d++ }
    a.pts += pointsFor(mt.score1, mt.score2); b.pts += pointsFor(mt.score2, mt.score1)
  }
  const showPoints = pointRule.size > 0
  const groups: StandingGroup[] = [...groupsMap].map(([gname, rows]) => ({
    name: gname,
    showPoints,
    rows: [...rows.values()].sort((x, y) => (showPoints ? y.pts - x.pts : 0) || y.w - x.w || (y.gw - y.gl) - (x.gw - x.gl) || x.l - y.l || x.team.localeCompare(y.team)),
  }))

  // Playoff bracket rounds in page order.
  const bracket: BracketRound[] = []
  for (const mt of matches) {
    if (groupOf.has(mt.key)) continue
    if (!/playoff|bracket|final|knockout|elimination/i.test(mt.stage + ' ' + mt.round)) continue
    let r = bracket.find((x) => x.name === mt.round)
    if (!r) { r = { name: mt.round, matches: [] }; bracket.push(r) }
    r.matches.push(mt)
  }

  const direborn: DirebornMatch[] = matches
    .filter((mt) => mt.date && (isDireborn(mt.team1) || isDireborn(mt.team2)))
    .map((mt) => {
      const usFirst = isDireborn(mt.team1)
      const played = mt.finished || mt.score1 + mt.score2 > 0
      const stageName = mt.round && mt.round !== mt.stage && !/^(october|november|december|january|february|march|april|may|june|july|august|september)\b/i.test(mt.round) ? `${mt.stage} · ${mt.round}` : mt.stage
      return {
        key: mt.key,
        date: mt.date!,
        time: mt.time,
        opponent: (usFirst ? mt.team2 : mt.team1) || 'TBD',
        stage: stageName,
        bestOf: mt.bestOf,
        scoreUs: played ? (usFirst ? mt.score1 : mt.score2) : null,
        scoreThem: played ? (usFirst ? mt.score2 : mt.score1) : null,
        finished: mt.finished,
      }
    })
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const prize = box.prizepoolusd ? `$${plain(box.prizepoolusd)}` : box.prizepool ? plain(box.prizepool) : null
  return {
    page,
    name,
    url: `${LP_BASE}/${page}`,
    startDate: toWib(box.sdate)?.date ?? null,
    endDate: toWib(box.edate)?.date ?? null,
    prize,
    format: plain(box.format?.replace(/<br\s*\/?>/g, ' · ')) || null,
    type: plain(box.type) || null,
    teams,
    matches,
    groups,
    bracket,
    direborn,
    participating: teams.some(isDireborn) || direborn.length > 0,
    fetchedAt: new Date().toISOString(),
  }
}

/** Accepts a page name or a pasted Liquipedia link. */
export function pageFromInput(v: string): string | null {
  const s = v.trim()
  const link = s.match(/liquipedia\.net\/dota2\/([^?#\s]+)/)
  const page = decodeURIComponent(link ? link[1] : s).replace(/ /g, '_')
  return /^[A-Za-z0-9_\-./():'&!,+]+$/.test(page) && page.length <= 200 && !page.startsWith('Special:') ? page : null
}

export async function fetchTournament(page: string, userAgent: string): Promise<TournamentData> {
  const { title, text } = await fetchTournamentText(page, userAgent)
  return parseTournament(title.replace(/ /g, '_'), title, text)
}
