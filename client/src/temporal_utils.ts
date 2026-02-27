import { Temporal } from '@js-temporal/polyfill'

function differenceInMinutes(a: Temporal.Instant, b: Temporal.Instant): number {
  const duration = a.since(b)
  return Math.round(duration.total('minutes'))
}

/**
 * Format a time difference as "X hours, Y minutes ago"
 * @param older - Older timestamp
 * @param newer - Newer timestamp
 * @returns Formatted string like "2 hours, 15 minutes ago"
 */
export function formatTimeDifference(older: Temporal.Instant, newer: Temporal.Instant): string {
  const minutes = differenceInMinutes(newer, older)
  const displayHours = Math.floor(minutes / 60)
  const displayMinutes = Math.floor(minutes - displayHours * 60)
  return `${displayHours} hours, ${displayMinutes} minutes ago`
}
