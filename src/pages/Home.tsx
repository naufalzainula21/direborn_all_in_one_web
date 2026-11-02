import { useEvents } from '../data/events'
import { useRole } from '../lib/role'
import { CurrentTournamentCard, pickCurrent } from '../components/tournaments/CurrentTournament'
import { longToday } from '../lib/format'
import { nextTournamentMatch } from '../lib/schedule'
import { MonthCalendar } from '../components/home/MonthCalendar'
import { NextMatchBanner } from '../components/home/NextMatchBanner'
import { RecentMatches } from '../components/home/RecentMatches'
import { UpcomingTournaments } from '../components/home/UpcomingTournaments'

export function Home({ now }: { now: Date }) {
  const { events, tournaments } = useEvents()
  const live = pickCurrent(tournaments, now)
  const { user } = useRole()
  return (
    <>
      <div className="page-head">
        <span className="muted">{longToday(now)}</span>
        <h1 className="page-title">Welcome back, {user.name.split(' ')[0]}</h1>
      </div>

      <div className="home-grid">
        <div className="stack">
          <CurrentTournamentCard now={now} />
          {!(live && live.direborn.some((m) => !m.finished)) && <NextMatchBanner match={nextTournamentMatch(events, now)} now={now} />}
          <MonthCalendar events={events} today={now} />
          <RecentMatches />
        </div>
        <div className="stack">
          <UpcomingTournaments now={now} />
        </div>
      </div>
    </>
  )
}
