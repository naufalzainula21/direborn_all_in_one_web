const TZ = 'Asia/Jakarta'

/** Today's date in WIB as YYYY-MM-DD, whatever the device time zone. */
export function todayISO(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Current WIB time as HH:mm. */
export function nowHHMM(now: Date): string {
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
}

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Monday of the week containing iso. */
export function mondayOf(iso: string): string {
  const d = parseDay(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "30 Oct" */
export function shortDate(iso: string): string {
  return parseDay(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "Saturday, 31 October 2026" */
export function longToday(now: Date): string {
  return now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ,
  })
}

/** "Today, 19:00 WIB" / "Sat 31 Oct, 19:00 WIB" */
export function matchTime(startIso: string, now: Date): string {
  const start = new Date(startIso)
  const time = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const sameDay =
    start.toLocaleDateString('en-GB', { timeZone: TZ }) === now.toLocaleDateString('en-GB', { timeZone: TZ })
  const day = sameDay
    ? 'Today'
    : start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ })
  return `${day}, ${time} WIB`
}

/** "Starts in 1d 4h" / "Starts in 45m" / "Live now" */
export function countdown(startIso: string, now: Date): string {
  const ms = new Date(startIso).getTime() - now.getTime()
  if (ms <= 0) return 'Live now'
  const mins = Math.floor(ms / 60000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d > 0) return `Starts in ${d}d ${h}h`
  if (h > 0) return `Starts in ${h}h ${m}m`
  return `Starts in ${m}m`
}
