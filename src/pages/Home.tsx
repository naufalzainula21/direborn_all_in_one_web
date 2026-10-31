import { scrimResults, tournamentResults, upcomingTournaments } from '../data/sample'
import { useEvents } from '../data/events'
import { longToday } from '../lib/format'
import { nextTournamentMatch } from '../lib/schedule'
import { MonthCalendar } from '../components/home/MonthCalendar'
import { NextMatchBanner } from '../components/home/NextMatchBanner'
import { ScrimResults, TournamentResults } from '../components/home/Results'
import { UpcomingTournaments } from '../components/home/UpcomingTournaments'

export function Home({ now }: { now: Date }) {
  const { events } = useEvents()
  return (
    <>
      <div className="page-head">
        <span className="muted">{longToday(now)}</span>
        <h1 className="page-title">Welcome back, Manager</h1>
      </div>

      <div className="home-grid">
        <div className="stack">
          <NextMatchBanner match={nextTournamentMatch(events, now)} now={now} />
          <MonthCalendar events={events} today={now} />
          <TournamentResults results={tournamentResults} />
          <ScrimResults results={scrimResults} />
        </div>
        <div className="stack">
          <UpcomingTournaments items={upcomingTournaments} today={now} />
        </div>
      </div>
    </>
  )
}
