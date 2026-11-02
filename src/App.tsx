import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AddEventDialog } from './components/events/AddEventDialog'
import { MatchDialog } from './components/tournaments/MatchDialog'
import { EventDialog } from './components/events/EventDialog'
import { ScrimResultDialog } from './components/events/ScrimResultDialog'
import { ScrimReportDialog } from './components/events/ScrimReportDialog'
import { Scrims } from './pages/Scrims'
import { AppShell } from './components/layout/AppShell'
import { EventsProvider } from './data/events'
import { Home } from './pages/Home'
import { PlayerHome } from './pages/PlayerHome'
import { OwnerHome } from './pages/OwnerHome'
import { CreativeHome } from './pages/CreativeHome'
import { Goals } from './pages/Goals'
import { People } from './pages/People'
import { ChangePassword, Login } from './pages/Login'
import { AuthProvider, useAuth } from './lib/role'
import { canManagePeople, type Role } from './lib/permissions'
import { Schedule } from './pages/Schedule'
import { Tournaments } from './pages/Tournaments'
import { TournamentsUpcoming } from './pages/TournamentsUpcoming'

function HomeFor({ role, now }: { role: Role; now: Date }) {
  switch (role) {
    case 'admin':
    case 'coach': return <Home now={now} />
    case 'player': return <PlayerHome now={now} />
    default: return <OwnerHome now={now} /> // owner, management, creative
  }
}

function Account() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  return (
    <section className="card account">
      {saved && <p className="notice" role="status">Password changed. Other devices were logged out.</p>}
      <ChangePassword onDone={() => setSaved(true)} />
      <button type="button" className="link link--btn" onClick={() => navigate('/')}>← Back</button>
    </section>
  )
}

function Routed({ now }: { now: Date }) {
  const { status, role } = useAuth()
  if (status === 'loading') return <div className="role-picker"><p className="muted">Loading…</p></div>
  if (status === 'signed-out' || status === 'offline') return <Login />
  if (status === 'must-change') return <ChangePassword forced />
  if (!role) return <Login />
  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomeFor role={role} now={now} />} />
          <Route path="/schedule" element={<Schedule now={now} />} />
          <Route path="/scrims" element={<Scrims now={now} />} />
          <Route path="/tournaments" element={<Tournaments now={now} />} />
          <Route path="/tournaments/upcoming" element={<TournamentsUpcoming />} />
          <Route path="/goals" element={<Goals now={now} />} />
          {role === 'creative' && <Route path="/planner" element={<CreativeHome now={now} />} />}
          {canManagePeople(role) && <Route path="/people" element={<People />} />}
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <AddEventDialog />
      <MatchDialog />
      <EventDialog />
      <ScrimResultDialog />
      <ScrimReportDialog />
    </>
  )
}

export default function App() {
  const [now, setNow] = useState(() => new Date())

  // Keep countdowns, "now" and "today" fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <BrowserRouter>
      <AuthProvider>
        <EventsProvider>
          <Routed now={now} />
        </EventsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
