import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AddEventDialog } from './components/events/AddEventDialog'
import { MatchDialog } from './components/tournaments/MatchDialog'
import { EventDialog } from './components/events/EventDialog'
import { ScrimResultDialog } from './components/events/ScrimResultDialog'
import { ScrimReportDialog } from './components/events/ScrimReportDialog'
import { Scrims } from './pages/Scrims'
import { AppShell } from './components/layout/AppShell'
import { EventsProvider } from './data/events'
import { Home } from './pages/Home'
import { Schedule } from './pages/Schedule'
import { Tournaments } from './pages/Tournaments'
import { TournamentsUpcoming } from './pages/TournamentsUpcoming'

export default function App() {
  const [now, setNow] = useState(() => new Date())

  // Keep countdowns, "now" and "today" fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <BrowserRouter>
      <EventsProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home now={now} />} />
            <Route path="/schedule" element={<Schedule now={now} />} />
            <Route path="/scrims" element={<Scrims now={now} />} />
            <Route path="/tournaments" element={<Tournaments now={now} />} />
            <Route path="/tournaments/upcoming" element={<TournamentsUpcoming />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <AddEventDialog />
        <MatchDialog />
        <EventDialog />
        <ScrimResultDialog />
        <ScrimReportDialog />
      </EventsProvider>
    </BrowserRouter>
  )
}
