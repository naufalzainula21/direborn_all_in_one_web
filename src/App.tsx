import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'

export default function App() {
  const [now, setNow] = useState(() => new Date())

  // Keep the countdown and "today" fresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <AppShell active="home">
      <Home now={now} />
    </AppShell>
  )
}
