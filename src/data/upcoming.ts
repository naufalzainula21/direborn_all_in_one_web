// Dota 2 events Nov 2026 – Dec 2027, compiled 31 Oct 2026.
// Sources: organiser announcements as reported by Metaratings (ESL calendar), esports.gg (PGL, FISSURE),
// rdy.gg (BLAST), Hawk Live (DreamLeague S30), dota2.ru (DreamLeague S31, 1win), dust2.in / players.com.ua (EWC 2027),
// esports.ru (TI 2027 rumour), GosuGamers / E-Rankings (EPL). Estimates are marked as such.

export type Confidence = 'confirmed' | 'estimate' | 'rumour' | 'tba'
export type DirebornStatus = 'qualified' | 'open' | 'watch' | 'invite' | 'out' | 'unknown'

export interface UpcomingEvent {
  id: string
  name: string
  organizer: string
  /** First day of the main event (YYYY-MM-DD) for sorting and the calendar; null when unknown */
  start: string | null
  dates: string
  month: string // grouping label, e.g. "Nov 2026"
  location: string
  prize: string
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'TBA'
  confidence: Confidence
  direborn: DirebornStatus
  /** How a SEA team gets in */
  route: string
  /** Extra notes: format, what we know */
  notes?: string
  source: { label: string; url: string }
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  confirmed: 'Confirmed', estimate: 'Estimate', rumour: 'Rumour', tba: 'TBA',
}
export const DIREBORN_LABEL: Record<DirebornStatus, string> = {
  qualified: 'Qualified', open: 'Open to enter', watch: 'Watch for qualifiers', invite: 'Invite only', out: 'Eliminated', unknown: 'Route unknown',
}

export const upcomingEvents: UpcomingEvent[] = [
  {
    id: 'epl-s19-po', name: 'EPL World Series SEA · Season 19 playoffs', organizer: 'EPL', start: '2026-11-03', dates: 'Early Nov 2026 · ends 5 Nov',
    month: 'Nov 2026', location: 'Online (SEA)', prize: '$10,000', tier: 'Tier 3', confidence: 'confirmed', direborn: 'qualified',
    route: 'Top 6 from the group stage. Direborn finished the group 2nd or better (5–1 with one match left).',
    notes: 'Double elimination, Bo3. Top 4 start in the upper bracket.',
    source: { label: 'GosuGamers', url: 'https://www.gosugamers.net/dota2/tournaments/63207-epl-world-series-southeast-asia-season-19' },
  },
  {
    id: 'dl-d2-5', name: 'DreamLeague Division 2 · Season 5', organizer: 'ESL', start: '2026-11-06', dates: '6–19 Nov 2026',
    month: 'Nov 2026', location: 'Online', prize: '$50,000', tier: 'Tier 2', confidence: 'confirmed', direborn: 'watch',
    route: 'ESL’s league for emerging teams. Top finishers earn spots in later DreamLeague events. Entry route not published for SEA.',
    source: { label: 'Metaratings (ESL calendar)', url: 'https://cybersport.metaratings.ru/news/esl-predstavila-kalendar-turnirov-po-dota-2-na-sezon-2026-27-652644/' },
  },
  {
    id: '1win-3', name: '1win Essence III', organizer: '1win', start: '2026-11-12', dates: '12–18 Nov 2026',
    month: 'Nov 2026', location: 'Online', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'invite',
    route: 'Invitational. No open or SEA qualifier found.', notes: 'Postponed from September after roster changes across tier-1 teams.',
    source: { label: 'dota2.ru', url: 'https://dota2.ru/news/67398-1win-obasnila-pocemu-essence-3-ne-nacalsa-2-sentabra/' },
  },
  {
    id: 'epl-s20', name: 'EPL World Series SEA · Season 20', organizer: 'EPL', start: null, dates: 'Expected mid–late Nov 2026',
    month: 'Nov 2026', location: 'Online (SEA)', prize: '~$10,000', tier: 'Tier 3', confidence: 'estimate', direborn: 'open',
    route: 'Recent seasons ran back to back (S16 Jun, S17 Aug–Sep, S18 Sep–Oct, S19 Oct–Nov). Direborn has played the last four seasons.',
    notes: 'Not announced yet. Estimate based on the season pattern.',
    source: { label: 'E-Rankings', url: 'https://www.e-rankings.com/dota-2/teams/46773-direborn-esports/' },
  },
  {
    id: 'blast-9', name: 'BLAST Slam IX', organizer: 'BLAST', start: '2026-11-20', dates: '20–29 Nov 2026',
    month: 'Nov 2026', location: 'Online', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'out',
    route: 'SEA closed qualifier (RES Unchained 6) on 12–13 Sep 2026. Direborn lost 1–2 to Team Nemesis.',
    notes: '16 teams, GSL groups, Bo3 throughout. Fully online, no LAN finals.',
    source: { label: 'rdy.gg', url: 'https://rdy.gg/en/dota2/news/blast-slam-ix-moves-fully-online-dota2' },
  },
  {
    id: 'dl-30', name: 'DreamLeague Season 30', organizer: 'ESL', start: '2026-12-02', dates: '2–13 Dec 2026',
    month: 'Dec 2026', location: 'Online', prize: '$750,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'out',
    route: 'SEA closed qualifier 15–17 Oct 2026 (1 slot). Direborn beat Kinetix, lost to Royal Bear and Xipto.',
    notes: '24 teams, Swiss group stage, Bo3. $10,000 and 100 EPT points per series win.',
    source: { label: 'Metaratings (ESL calendar)', url: 'https://cybersport.metaratings.ru/news/esl-predstavila-kalendar-turnirov-po-dota-2-na-sezon-2026-27-652644/' },
  },
  {
    id: 'dl-31-q', name: 'DreamLeague Season 31 · SEA qualifiers', organizer: 'ESL', start: null, dates: 'Likely early–mid Dec 2026',
    month: 'Dec 2026', location: 'Online (SEA)', prize: '—', tier: 'Tier 1', confidence: 'estimate', direborn: 'watch',
    route: 'S30 ran open qualifiers about 8 weeks before its main event and the closed qualifier about 7 weeks before. Expect the same for S31.',
    notes: 'Not announced yet. Register for the open qualifier as soon as it opens.',
    source: { label: 'Hawk Live (S30 pattern)', url: 'https://hawk.live/posts/dreamleague-season-30-qualifiers-schedule-standings-results' },
  },
  {
    id: 'dl-d2-6', name: 'DreamLeague Division 2 · Season 6', organizer: 'ESL', start: '2027-01-09', dates: '9–18 Jan 2027',
    month: 'Jan 2027', location: 'Online', prize: '$30,000', tier: 'Tier 2', confidence: 'confirmed', direborn: 'watch',
    route: 'Emerging-team league; top finishers move up to DreamLeague events.',
    source: { label: 'Metaratings (ESL calendar)', url: 'https://cybersport.metaratings.ru/news/esl-predstavila-kalendar-turnirov-po-dota-2-na-sezon-2026-27-652644/' },
  },
  {
    id: 'dl-31', name: 'DreamLeague Season 31', organizer: 'ESL', start: '2027-01-20', dates: '20–31 Jan 2027',
    month: 'Jan 2027', location: 'Online', prize: '$500,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Has a Southeast Asia slot group through regional qualifiers (dates TBA).',
    notes: '16 teams, two group stages, double-elimination playoffs. Results decide most invites to ESL One Europe and DreamLeague S32.',
    source: { label: 'dota2.ru', url: 'https://dota2.ru/esport/tournament/1212-dreamleague-season-31/' },
  },
  {
    id: 'fissure-1', name: 'FISSURE event #1 (2027)', organizer: 'FISSURE', start: '2027-01-25', dates: '25 Jan – 8 Feb 2027',
    month: 'Jan 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.', notes: 'Dates include travel and media days.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'pgl-w10-q', name: 'PGL Wallachia Season 10 · SEA qualifiers', organizer: 'PGL', start: null, dates: 'Likely Jan 2027',
    month: 'Jan 2027', location: 'Online (SEA)', prize: '—', tier: 'Tier 1', confidence: 'estimate', direborn: 'watch',
    route: 'Earlier Wallachia seasons had SEA open qualifiers feeding a closed qualifier.', notes: 'Not announced yet.',
    source: { label: 'Liquipedia (past seasons)', url: 'https://liquipedia.net/dota2/PGL/Wallachia/10' },
  },
  {
    id: 'pgl-w10', name: 'PGL Wallachia Season 10', organizer: 'PGL', start: '2027-03-02', dates: '2–14 Mar 2027',
    month: 'Mar 2027', location: 'TBA', prize: '$1,000,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Regional qualifiers expected (SEA included in past seasons).',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/pgl-dota-2-20227-events/' },
  },
  {
    id: 'fissure-2', name: 'FISSURE event #2 (2027)', organizer: 'FISSURE', start: '2027-03-18', dates: '18–29 Mar 2027',
    month: 'Mar 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'clavision-27', name: 'Clavision x Dota PIT Masters 2027', organizer: 'Clavision / Dota PIT', start: '2027-03-20', dates: '20–28 Mar 2027',
    month: 'Mar 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'GGCombat', url: 'https://ggcombat.com/en/dota2/tournaments' },
  },
  {
    id: 'esl-one-eu-27', name: 'ESL One Europe 2027', organizer: 'ESL', start: '2027-04-04', dates: '4–11 Apr 2027',
    month: 'Apr 2027', location: 'New European city (LAN, live audience)', prize: '$1,000,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'invite',
    route: 'Mostly invites from DreamLeague S31 results and EPT points.', notes: '16 teams. 35,460 EPT points on offer.',
    source: { label: 'Metaratings (ESL calendar)', url: 'https://cybersport.metaratings.ru/news/esl-predstavila-kalendar-turnirov-po-dota-2-na-sezon-2026-27-652644/' },
  },
  {
    id: 'dl-d2-7', name: 'DreamLeague Division 2 · Season 7', organizer: 'ESL', start: '2027-04-13', dates: '13–24 Apr 2027',
    month: 'Apr 2027', location: 'Online', prize: '$50,000', tier: 'Tier 2', confidence: 'confirmed', direborn: 'watch',
    route: 'Emerging-team league; top finishers move up to DreamLeague events.',
    source: { label: 'Metaratings (ESL calendar)', url: 'https://cybersport.metaratings.ru/news/esl-predstavila-kalendar-turnirov-po-dota-2-na-sezon-2026-27-652644/' },
  },
  {
    id: 'dl-32', name: 'DreamLeague Season 32', organizer: 'ESL', start: '2027-04-26', dates: '26 Apr – 9 May 2027',
    month: 'Apr 2027', location: 'Online', prize: '$750,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Partly invites from DreamLeague S31; regional qualifiers likely for the rest.', notes: 'Final EPT standings are set after this event.',
    source: { label: 'Metaratings (ESL calendar)', url: 'https://cybersport.metaratings.ru/news/esl-predstavila-kalendar-turnirov-po-dota-2-na-sezon-2026-27-652644/' },
  },
  {
    id: 'fissure-3', name: 'FISSURE event #3 (2027)', organizer: 'FISSURE', start: '2027-04-28', dates: '28 Apr – 9 May 2027',
    month: 'Apr 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'pgl-2', name: 'PGL event #2 (2027)', organizer: 'PGL', start: '2027-05-11', dates: '11–23 May 2027',
    month: 'May 2027', location: 'TBA', prize: '$1,000,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Qualification not announced; PGL events usually include regional qualifiers.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/pgl-dota-2-20227-events/' },
  },
  {
    id: 'ti-27-q', name: 'The International 2027 · SEA qualifiers', organizer: 'Valve', start: null, dates: 'Likely Jun 2027',
    month: 'Jun 2027', location: 'Online (SEA)', prize: '—', tier: 'Tier 1', confidence: 'estimate', direborn: 'open',
    route: 'In 2026 Valve ran two SEA open qualifiers feeding a regional closed qualifier (19–20 Jun). Direborn reached that regional qualifier.',
    notes: 'Not announced. Expect the same structure.',
    source: { label: 'Liquipedia (TI 2026 SEA)', url: 'https://liquipedia.net/dota2/The_International/2026/Southeast_Asia' },
  },
  {
    id: 'ewc-27-q', name: 'Esports World Cup 2027 · SEA qualifiers', organizer: 'EWC Foundation', start: null, dates: 'Likely May–Jun 2027',
    month: 'Jun 2027', location: 'Online (SEA)', prize: '—', tier: 'Tier 1', confidence: 'estimate', direborn: 'open',
    route: 'In 2026 there was a SEA open qualifier and a closed qualifier (3–4 Jun). Top EPT teams also get direct slots.',
    notes: 'Not announced. Expect a similar path.',
    source: { label: 'Liquipedia (EWC 2026 SEA)', url: 'https://liquipedia.net/dota2/Esports_World_Cup/2026/Southeast_Asia' },
  },
  {
    id: 'fissure-4', name: 'FISSURE event #4 (2027)', organizer: 'FISSURE', start: '2027-06-27', dates: '27 Jun – 5 Jul 2027',
    month: 'Jun 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'ewc-27', name: 'Esports World Cup 2027 · Dota 2', organizer: 'EWC Foundation', start: '2027-07-16', dates: 'EWC runs 16 Jul – 1 Aug 2027 (Dota dates TBA)',
    month: 'Jul 2027', location: 'Riyadh, Saudi Arabia', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Direct slots for top EPT teams plus regional qualifiers.', notes: 'Dota 2 is confirmed in the 2027 lineup.',
    source: { label: 'players.com.ua', url: 'https://players.com.ua/en/news/esports-world-cup-2027-lineup-first-confirmed-titles/' },
  },
  {
    id: 'fissure-5', name: 'FISSURE event #5 (2027)', organizer: 'FISSURE', start: '2027-08-04', dates: '4–15 Aug 2027',
    month: 'Aug 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'ti-27', name: 'The International 2027', organizer: 'Valve', start: null, dates: 'TBA (TI 2026 was 13–23 Aug)',
    month: 'Aug 2027', location: 'Rumoured: Singapore', prize: 'TBA', tier: 'Tier 1', confidence: 'rumour', direborn: 'watch',
    route: 'Direct invites plus regional qualifiers (see TI SEA qualifiers).', notes: 'Location is a rumour from multiple sources. Valve hasn’t announced anything.',
    source: { label: 'esports.ru', url: 'https://esports.ru/dota-2/news/sleduyushhij-ti-mozhet-vernutsya-v-singapur/' },
  },
  {
    id: 'pgl-3', name: 'PGL event #3 (2027)', organizer: 'PGL', start: '2027-10-19', dates: '19–31 Oct 2027',
    month: 'Oct 2027', location: 'TBA', prize: '$1,000,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/pgl-dota-2-20227-events/' },
  },
  {
    id: 'fissure-6', name: 'FISSURE event #6 (2027)', organizer: 'FISSURE', start: '2027-11-03', dates: '3–15 Nov 2027',
    month: 'Nov 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'pgl-4', name: 'PGL event #4 (2027)', organizer: 'PGL', start: '2027-11-16', dates: '16–28 Nov 2027',
    month: 'Nov 2027', location: 'TBA', prize: '$1,000,000', tier: 'Tier 1', confidence: 'confirmed', direborn: 'watch',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/pgl-dota-2-20227-events/' },
  },
  {
    id: 'fissure-7', name: 'FISSURE event #7 (2027)', organizer: 'FISSURE', start: '2027-12-11', dates: '11–28 Dec 2027',
    month: 'Dec 2027', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'confirmed', direborn: 'unknown',
    route: 'Qualification not announced.',
    source: { label: 'esports.gg', url: 'https://esports.gg/news/dota-2/fissure-dota-2-events-2027/' },
  },
  {
    id: 'blast-10', name: 'BLAST Slam X', organizer: 'BLAST', start: null, dates: 'TBA (2027)',
    month: 'Date TBA', location: 'TBA', prize: 'TBA', tier: 'Tier 1', confidence: 'tba', direborn: 'watch',
    route: 'Recent Slams had a SEA closed qualifier run by RES Unchained.', notes: 'BLAST has teased 2027 plans but hasn’t announced dates.',
    source: { label: 'rdy.gg', url: 'https://rdy.gg/en/dota2/news/blast-slam-ix-moves-fully-online-dota2' },
  },
]
