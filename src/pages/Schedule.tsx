import { events, nextTournament } from '../data/sample'
import { longToday, todayISO } from '../lib/format'
import { ScheduleBrowser } from '../components/schedule/ScheduleBrowser'
import { NextTournamentCard, ScrimSchedule, TournamentSchedule } from '../components/schedule/SideLists'
import { TodaySchedule } from '../components/schedule/TodaySchedule'

export function Schedule({ now }: { now: Date }) {
  const today = todayISO(now)
  return (
    <>
      <div className="page-head">
        <span className="muted">{longToday(now)}</span>
        <h1 className="page-title">Schedule</h1>
      </div>

      <div className="home-grid">
        <div className="stack">
          <TodaySchedule events={events} now={now} />
          <ScheduleBrowser events={events} today={today} />
        </div>
        <div className="stack">
          <NextTournamentCard t={nextTournament} now={now} />
          <TournamentSchedule events={events} today={today} />
          <ScrimSchedule events={events} today={today} />
        </div>
      </div>
    </>
  )
}
