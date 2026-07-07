import { describe, test, expect } from 'vite-plus/test'
import { isEmail } from '@/utils/is-email'

describe('isEmail', () => {
  test('returns true for a well-formed email', () => {
    expect(isEmail('user@example.com')).toBe(true)
  })

  test('trims surrounding whitespace before checking', () => {
    expect(isEmail('  user@example.com  ')).toBe(true)
  })

  test('returns false when missing an @', () => {
    expect(isEmail('userexample.com')).toBe(false)
  })

  test('returns false when missing a domain', () => {
    expect(isEmail('user@')).toBe(false)
  })

  test('returns false when missing a dot in the domain', () => {
    expect(isEmail('user@example')).toBe(false)
  })

  test('returns false for an empty string', () => {
    expect(isEmail('')).toBe(false)
  })

  test('returns false when the value contains whitespace', () => {
    expect(isEmail('user @example.com')).toBe(false)
  })
})
