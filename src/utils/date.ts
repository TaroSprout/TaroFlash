export function isoNow(): string {
  return new Date().toISOString()
}

/**
 * Midnight this morning, where the member actually is. Send this with any
 * "today" question rather than letting the server decide when today began.
 */
export function localDayStart(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return start.toISOString()
}

type DateInput = string | number | Date

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input)
}

const MEDIUM_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
}

export function formatShortDate(input: DateInput, locale?: string): string {
  return new Intl.DateTimeFormat(locale, MEDIUM_OPTIONS).format(toDate(input))
}
