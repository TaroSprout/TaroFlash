export function isoNow(): string {
  return new Date().toISOString()
}

/**
 * ISO timestamp of the start of the caller's local day (00:00 in their
 * current timezone). Used to scope "today's" daily-cap counts on the
 * backend without baking a timezone assumption into SQL.
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

type RelativeStyle = 'long' | 'short' | 'narrow'

type RelativeOptions = {
  style?: RelativeStyle
  locale?: string
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1]
]

export function toRelative(input: DateInput, options: RelativeOptions = {}): string {
  const { style = 'long', locale } = options
  const diffSeconds = (toDate(input).getTime() - Date.now()) / 1000
  const formatter = new Intl.RelativeTimeFormat(locale, { style })

  for (const [unit, perUnit] of RELATIVE_UNITS) {
    const rounded = Math.round(diffSeconds / perUnit)
    if (Math.abs(rounded) >= 1) return formatter.format(rounded, unit)
  }

  return formatter.format(0, 'second')
}

function toRelativeAtUnit(
  input: DateInput,
  unit: Intl.RelativeTimeFormatUnit,
  options: RelativeOptions = {}
): string {
  const { style = 'long', locale } = options
  const diffSeconds = (toDate(input).getTime() - Date.now()) / 1000
  const perUnit = RELATIVE_UNITS.find(([u]) => u === unit)![1]
  const formatter = new Intl.RelativeTimeFormat(locale, { style })
  return formatter.format(Math.round(diffSeconds / perUnit), unit)
}

/**
 * Formats a batch of dates that are displayed together (e.g. one per FSRS
 * rating). Any dates that would otherwise render identical text collapse to
 * day-level granularity instead, so "1 week" / "1 week" becomes "8 days" /
 * "9 days".
 */
export function toRelativeDistinct(inputs: DateInput[], options: RelativeOptions = {}): string[] {
  const labels = inputs.map((d) => toRelative(d, options))
  return labels.map((label, i) => {
    const collides = labels.some((other, j) => j !== i && other === label)
    return collides ? toRelativeAtUnit(inputs[i]!, 'day', options) : label
  })
}
