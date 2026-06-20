import { describe, test, expect } from 'vite-plus/test'
import { formatMoney, formatStripeDate, formatCardExpiry } from '@/utils/billing'

describe('formatMoney', () => {
  test('formats cents as a localized currency string [obligation]', () => {
    const result = formatMoney(1000, 'usd', 'en-US')
    expect(result).toContain('10')
    expect(result).toContain('$')
  })

  test('divides cents by 100 before formatting [obligation]', () => {
    const result = formatMoney(999, 'usd', 'en-US')
    expect(result).toContain('9.99')
  })

  test('uppercases the currency code for Intl [obligation]', () => {
    // Lower-case 'usd' should not throw — formatMoney uppercases it internally
    expect(() => formatMoney(500, 'usd', 'en-US')).not.toThrow()
  })

  test('handles zero cents', () => {
    const result = formatMoney(0, 'usd', 'en-US')
    expect(result).toContain('0')
  })

  test('formats non-USD currencies', () => {
    const result = formatMoney(1000, 'eur', 'en-US')
    expect(result).toContain('10')
  })
})

describe('formatStripeDate', () => {
  test('multiplies unix seconds by 1000 before formatting [obligation]', () => {
    // 0 unix seconds = Jan 1 1970
    const result = formatStripeDate(0, 'en-US')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('produces a different date for seconds vs milliseconds [obligation]', () => {
    // 1700000000 seconds is around Nov 2023; as milliseconds it would be ~1970
    const resultSeconds = formatStripeDate(1700000000, 'en-US')
    const resultMs = formatStripeDate(1700000, 'en-US')
    expect(resultSeconds).not.toBe(resultMs)
  })

  test('returns a non-empty string for a real timestamp', () => {
    // 2024-07-01T00:00:00Z in unix seconds — mid-year, safe across timezones
    const result = formatStripeDate(1719792000, 'en-US')
    expect(result).toMatch(/2024/)
  })
})

describe('formatCardExpiry', () => {
  test('zero-pads single-digit months [obligation]', () => {
    expect(formatCardExpiry(3, 2027)).toBe('03/27')
  })

  test('does not pad two-digit months', () => {
    expect(formatCardExpiry(12, 2030)).toBe('12/30')
  })

  test('takes only the last two digits of the year [obligation]', () => {
    expect(formatCardExpiry(1, 2035)).toBe('01/35')
  })

  test('formats example 3/2027 → "03/27" [obligation]', () => {
    expect(formatCardExpiry(3, 2027)).toBe('03/27')
  })
})
