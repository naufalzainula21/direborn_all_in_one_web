import { useEvents } from '../data/events'
import { longToday, todayISO } from '../lib/format'
import { nextTournamentSummary } from '../lib/schedule'
import { ScheduleBrowser } from '../components/schedule/ScheduleBrowser'
import { NextTournamentCard, ScrimSchedule, TournamentSchedule } from '../components/schedule/SideLists'
import { TodaySchedule } from '../components/schedule/TodaySchedule'

export function Schedule({ now }: { now: Date }) {
  const today = todayISO(now)
  const { events, source } = useEvents()
  return (
    <>
      <div className="page-head">
        <span className="muted">{longToday(now)}</span>
        <h1 className="page-title">Schedule</h1>
      </div>
      {source === 'offline' && (
        <p className="notice">The shared database isn't reachable right now. Official matches still show; team events will load when it's back.</p>
      )}

      <div className="home-grid">
        <div className="stack">
          <TodaySchedule events={events} now={now} />
          <ScheduleBrowser events={events} today={today} />
        </div>
        <div className="stack">
          <NextTournamentCard t={nextTournamentSummary(events, now)} now={now} />
          <TournamentSchedule events={events} today={today} />
          <ScrimSchedule events={events} today={today} />
        </div>
      </div>
    </>
  )
}
