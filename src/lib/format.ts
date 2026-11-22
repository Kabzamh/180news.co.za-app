/**
 * Date and number formatting helpers. All wall-clock times are South African
 * Standard Time (Africa/Johannesburg), the same zone the newsroom works in.
 */
export const SAST = 'Africa/Johannesburg'

const longDate = new Intl.DateTimeFormat('en-ZA', {
  timeZone: SAST,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const mediumDate = new Intl.DateTimeFormat('en-ZA', {
  timeZone: SAST,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const shortDate = new Intl.DateTimeFormat('en-ZA', { timeZone: SAST, day: 'numeric', month: 'short' })
const clock = new Intl.DateTimeFormat('en-GB', {
  timeZone: SAST,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const fullDate = new Intl.DateTimeFormat('en-ZA', {
  timeZone: SAST,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const isoDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const formatLongDate = (d: number): string => longDate.format(d)
export const formatTime = (d: number): string => clock.format(d)
export const formatShortDate = (d: number): string => shortDate.format(d)
export const formatFull = (d: number): string => `${fullDate.format(d)} at ${clock.format(d)} SAST`
export const dayKey = (d: number): string => isoDay.format(d)

export function timeAgo(at: number | null, now: number): string {
  if (at === null) return ''
  const minutes = Math.floor(Math.max(0, now - at) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return dayKey(at) === dayKey(now - 86400000) ? 'Yesterday' : shortDate.format(at)
}

export function dayLabel(at: number, now: number): string {
  const key = dayKey(at)
  if (key === dayKey(now)) return 'Today'
  if (key === dayKey(now - 86400000)) return 'Yesterday'
  return mediumDate.format(at)
}

export function inFuture(at: number, now: number): string {
  const minutes = Math.ceil((at - now) / 60000)
  if (minutes <= 1) return 'in under a minute'
  if (minutes < 60) return `in ${minutes} minutes`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  const days = Math.round(hours / 24)
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}

export function formatAt(at: number, now: number): string {
  return dayKey(at) === dayKey(now) ? formatTime(at) : `${formatShortDate(at)}, ${formatTime(at)}`
}

/** Thousands-separated integer with plain spaces (en-ZA style). */
export function formatNum(n: number): string {
  return Math.round(n)
    .toLocaleString('en-ZA')
    .replace(/[\u00a0\u202f,]/g, ' ')
}
