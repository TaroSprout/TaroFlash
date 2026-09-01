import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { isoNow, localDayStart, formatShortDate } from '@/utils/date'

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
