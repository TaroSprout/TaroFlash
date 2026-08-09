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
  if (!Number.isFinite(diffSeconds)) return formatter.format(0, 'second')
  return formatter.format(Math.round(diffSeconds / perUnit), unit)
}

/**
 * Formats dates shown side by side — the four rating buttons — so no two of
 * them read the same.
 *
 * When any two would collide, the whole group drops to days together, since
 * "1 week / 1 week / 9 days" is worse than "8 days / 8 days / 9 days". Anything
 * less than a day out stays in hours regardless, rather than showing "0 days".
 */
// Largest first. No week unit, deliberately — a six-day gap should read "6d"
// rather than rounding up to "1w".
const SHORT_UNITS: [number, string][] = [
  [31_536_000, 'y'],
  [2_592_000, 'mo'],
  [86_400, 'd'],
  [3_600, 'h'],
  [60, 'min'],
  [1, 's']
]

/**
 * How far off a date is, squeezed to fit a button — "1min", "1d", "2mo". Says
 * nothing about direction, so only use it where past and future can't be
 * confused. `toRelative` is the one that reads as prose.
 */
export function toShortDuration(input: DateInput): string {
  const diffSeconds = Math.abs((toDate(input).getTime() - Date.now()) / 1000)

  for (const [perUnit, abbr] of SHORT_UNITS) {
    const rounded = Math.round(diffSeconds / perUnit)
    if (rounded >= 1) return `${rounded}${abbr}`
  }

  return 'now'
}

export function toRelativeDistinct(inputs: DateInput[], options: RelativeOptions = {}): string[] {
  const labels = inputs.map((d) => toRelative(d, options))
  const has_collision = labels.some((label, i) =>
    labels.some((other, j) => j !== i && other === label)
  )
  if (!has_collision) return labels

  return inputs.map((input) => {
    const diffSeconds = (toDate(input).getTime() - Date.now()) / 1000
    const unit = Math.abs(diffSeconds) < 86_400 ? 'hour' : 'day'
    return toRelativeAtUnit(input, unit, options)
  })
}
