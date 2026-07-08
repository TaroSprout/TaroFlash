import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import {
  isoNow,
  localDayStart,
  formatShortDate,
  toRelative,
  toRelativeDistinct
} from '@/utils/date'

describe('isoNow', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the current time as an ISO 8601 UTC string', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:34:56.000Z'))
    expect(isoNow()).toBe('2026-03-15T12:34:56.000Z')
  })

  test('ends with Z so Postgres timestamptz parses it as UTC', () => {
    // Guards against accidentally reintroducing a local-offset variant, which
    // would still parse correctly but is a silent drift from the old Luxon
    // behavior and harder to reason about in logs.
    expect(isoNow().endsWith('Z')).toBe(true)
  })
})

describe('localDayStart', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns midnight of the local day as a UTC ISO string', () => {
    vi.useFakeTimers()
    // 2026-03-15 14:30 in the host's local timezone — pick a Date constructor
    // form that fixes local fields rather than UTC fields.
    vi.setSystemTime(new Date(2026, 2, 15, 14, 30, 0))
    const expected = new Date(2026, 2, 15).toISOString()
    expect(localDayStart()).toBe(expected)
  })

  test('rolls back to start of day even moments before midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 23, 59, 59))
    const expected = new Date(2026, 2, 15).toISOString()
    expect(localDayStart()).toBe(expected)
  })

  test('returns an ISO string ending in Z (Postgres timestamptz friendly)', () => {
    expect(localDayStart().endsWith('Z')).toBe(true)
  })
})

describe('formatShortDate', () => {
  // Use a mid-day UTC timestamp so the date is unambiguous regardless of the
  // test host's local timezone (Intl.DateTimeFormat defaults to local tz).
  const ISO = '2026-03-15T18:00:00.000Z'

  test('formats an ISO string as "Mon D, YYYY" in en-US', () => {
    expect(formatShortDate(ISO, 'en-US')).toBe('Mar 15, 2026')
  })

  test('accepts a millisecond epoch timestamp', () => {
    expect(formatShortDate(new Date(ISO).getTime(), 'en-US')).toBe('Mar 15, 2026')
  })

  test('accepts a Date instance', () => {
    expect(formatShortDate(new Date(ISO), 'en-US')).toBe('Mar 15, 2026')
  })

  test('respects the provided locale', () => {
    // fr-FR writes short months lowercased with a period (e.g. "15 mars 2026").
    // The exact string differs across ICU versions, so we only assert the
    // locale actually changed the output.
    const us = formatShortDate(ISO, 'en-US')
    const fr = formatShortDate(ISO, 'fr-FR')
    expect(us).not.toBe(fr)
  })
})

describe('toRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('future dates use "in" phrasing in en-US', () => {
    const inOneDay = new Date('2026-03-16T12:00:00.000Z')
    expect(toRelative(inOneDay, { locale: 'en-US' })).toBe('in 1 day')
  })

  test('past dates use "ago" phrasing in en-US', () => {
    const twoHoursAgo = new Date('2026-03-15T10:00:00.000Z')
    expect(toRelative(twoHoursAgo, { locale: 'en-US' })).toBe('2 hours ago')
  })

  test('selects the largest unit whose diff >= one of that unit', () => {
    // +90 seconds → should snap to the minute bucket, not stay at seconds.
    const inNinetySeconds = new Date('2026-03-15T12:01:30.000Z')
    expect(toRelative(inNinetySeconds, { locale: 'en-US' })).toBe('in 2 minutes')
  })

  test('falls back to "in 0 seconds" when the diff rounds to zero', () => {
    // Below 0.5s, the rounded seconds value is 0 so no unit's rounded
    // candidate reaches 1 and the formatter falls back to the zero-seconds
    // string rather than throwing or returning an empty value.
    const almostNow = new Date('2026-03-15T12:00:00.499Z')
    expect(toRelative(almostNow, { locale: 'en-US' })).toBe('in 0 seconds')
  })

  test('short style produces a compact string', () => {
    const inOneDay = new Date('2026-03-16T12:00:00.000Z')
    const long = toRelative(inOneDay, { locale: 'en-US', style: 'long' })
    const short = toRelative(inOneDay, { locale: 'en-US', style: 'short' })
    expect(short.length).toBeLessThanOrEqual(long.length)
  })

  test('defaults to long style when none is provided', () => {
    const inOneDay = new Date('2026-03-16T12:00:00.000Z')
    expect(toRelative(inOneDay, { locale: 'en-US' })).toBe('in 1 day')
  })

  test('accepts a Date, ISO string, and millisecond epoch', () => {
    const iso = '2026-03-16T12:00:00.000Z'
    const date = new Date(iso)
    const ms = date.getTime()
    const expected = 'in 1 day'

    expect(toRelative(iso, { locale: 'en-US' })).toBe(expected)
    expect(toRelative(date, { locale: 'en-US' })).toBe(expected)
    expect(toRelative(ms, { locale: 'en-US' })).toBe(expected)
  })

  test('rounds the candidate unit before picking it, so ~6.9 days and 7.0 days both land on "in 1 week"', () => {
    // Regression: old code picked the unit from a raw threshold then rounded
    // separately, so 6.9 days (just under the 7-day/week threshold) stayed in
    // "days" and rounded up to "7 days", while 7.0 days crossed the threshold
    // and became "1 week" — same real duration, two different unit buckets.
    const sixPointNineDays = new Date(Date.now() + 6.9 * 86_400 * 1000)
    const sevenDays = new Date(Date.now() + 7 * 86_400 * 1000)

    expect(toRelative(sixPointNineDays, { locale: 'en-US' })).toBe('in 1 week')
    expect(toRelative(sevenDays, { locale: 'en-US' })).toBe('in 1 week')
  })

  test('rounds the candidate unit before picking it, so 27-29 days and 30 days both land on "in 1 month"', () => {
    // Regression: 27-29 days rounded to "4 weeks" under the old threshold
    // logic, while 30 days crossed into "1 month" — splitting durations that
    // should round to the same bucket.
    const twentyEightDays = new Date(Date.now() + 28 * 86_400 * 1000)
    const thirtyDays = new Date(Date.now() + 30 * 86_400 * 1000)

    expect(toRelative(twentyEightDays, { locale: 'en-US' })).toBe('in 1 month')
    expect(toRelative(thirtyDays, { locale: 'en-US' })).toBe('in 1 month')
  })
})

// ── toRelativeDistinct [obligation] ─────────────────────────────────────────

describe('toRelativeDistinct [obligation]', () => {
  const day = 86_400 * 1000

  test('demotes two colliding dates to distinct day-level labels [obligation]', () => {
    // 7.6 and 8.6 days out both naturally round to "in 1 week".
    const a = new Date(Date.now() + 7.6 * day)
    const b = new Date(Date.now() + 8.6 * day)

    const [labelA, labelB] = toRelativeDistinct([a, b], { locale: 'en-US' })

    expect(labelA).not.toBe(labelB)
    expect(labelA).toBe('in 8 days')
    expect(labelB).toBe('in 9 days')
  })

  test('leaves non-colliding dates at their natural unit, including sub-day granularity [obligation]', () => {
    const inTwoMinutes = new Date(Date.now() + 2 * 60 * 1000)
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000)

    const [labelA, labelB] = toRelativeDistinct([inTwoMinutes, inThreeHours], { locale: 'en-US' })

    expect(labelA).toBe('in 2 minutes')
    expect(labelB).toBe('in 3 hours')
  })

  test('a collision between two dates bumps every date in the batch to day granularity, except a sub-day sibling which renders in hours [obligation]', () => {
    // Regression: this used to demote only the colliding pair (a, b) and leave
    // the third, non-colliding date at its natural unit. Now one collision
    // anywhere in the batch bumps the whole group together — but a date under
    // a day away is exempted from the day bump (would show "0 days") and
    // renders in hours instead.
    const a = new Date(Date.now() + 7.6 * day)
    const b = new Date(Date.now() + 8.6 * day)
    const distinct = new Date(Date.now() + 2 * 60 * 1000) // in 2 minutes, no collision with a/b

    const [labelA, labelB, labelC] = toRelativeDistinct([a, b, distinct], { locale: 'en-US' })

    expect(labelA).toBe('in 8 days')
    expect(labelB).toBe('in 9 days')
    expect(labelC).toBe('in 0 hours')
  })

  test('within a colliding batch, a date under 24h away renders hour-granularity while day-level siblings stay at day granularity [obligation]', () => {
    const under_a_day = new Date(Date.now() + 5 * 60 * 60 * 1000) // in 5 hours
    const a = new Date(Date.now() + 7.6 * day)
    const b = new Date(Date.now() + 8.6 * day)

    const [labelUnderDay, labelA, labelB] = toRelativeDistinct([under_a_day, a, b], {
      locale: 'en-US'
    })

    expect(labelUnderDay).toBe('in 5 hours')
    expect(labelA).toBe('in 8 days')
    expect(labelB).toBe('in 9 days')
  })

  test('when every date in a colliding batch is >= 1 day away, all bump to day granularity together (no hour exemption applies) [obligation]', () => {
    const a = new Date(Date.now() + 7.6 * day)
    const b = new Date(Date.now() + 8.6 * day)
    const c = new Date(Date.now() + 1.2 * day)

    const [labelA, labelB, labelC] = toRelativeDistinct([a, b, c], { locale: 'en-US' })

    expect(labelA).toBe('in 8 days')
    expect(labelB).toBe('in 9 days')
    expect(labelC).toBe('in 1 day')
  })

  test('preserves each date at its natural granularity when no two labels collide [obligation]', () => {
    const inTwoMinutes = new Date(Date.now() + 2 * 60 * 1000)
    const inThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000)
    const inTwoDays = new Date(Date.now() + 2 * day)

    const [labelA, labelB, labelC] = toRelativeDistinct([inTwoMinutes, inThreeHours, inTwoDays], {
      locale: 'en-US'
    })

    expect(labelA).toBe('in 2 minutes')
    expect(labelB).toBe('in 3 hours')
    expect(labelC).toBe('in 2 days')
  })
})
