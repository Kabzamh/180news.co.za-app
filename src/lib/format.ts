const TZ = 'Africa/Johannesburg'

const dayFmt = new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dayNoYearFmt = new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, day: 'numeric', month: 'short' })
const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const longFmt = new Intl.DateTimeFormat('en-ZA', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

/** "Tuesday, 10 November 2026" in South African time. */
export function todayLabel(now: number): string {
  return dayFmt.format(now)
}

/** "14:02" in South African time. */
export function clock(ms: number): string {
  return clockFmt.format(ms)
}

export function shortDate(ms: number): string {
  return shortFmt.format(ms)
}

/** "10 November 2026 at 14:02 SAST" */
export function fullDate(ms: number): string {
  return `${longFmt.format(ms)} at ${clockFmt.format(ms)} SAST`
}

export function dayKey(ms: number): string {
  return keyFmt.format(ms)
}

export function timeAgo(ms: number | null, now: number): string {
  if (ms === null) return ''
  const diff = Math.max(0, now - ms)
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  if (dayKey(ms) === dayKey(now - 86_400_000)) return 'Yesterday'
  return shortFmt.format(ms)
}

/** "Today", "Yesterday" or "Sunday, 8 November". */
export function dayHeading(ms: number, now: number): string {
  const key = dayKey(ms)
  if (key === dayKey(now)) return 'Today'
  if (key === dayKey(now - 86_400_000)) return 'Yesterday'
  return dayNoYearFmt.format(ms)
}

/** Time for today, otherwise "10 Nov, 14:02". */
export function stamp(ms: number, now: number): string {
  return dayKey(ms) === dayKey(now) ? clock(ms) : `${shortDate(ms)}, ${clock(ms)}`
}
