import { describe, test, expect, beforeEach } from 'vite-plus/test'
import {
  captureReturnDestination,
  consumeReturnDestination
} from '@/composables/auth/return-destination'

const STORAGE_KEY = 'auth-return-destination'

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('captureReturnDestination', () => {
  test('stores an in-app absolute path', () => {
    captureReturnDestination('/deck/123')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('/deck/123')
  })

  test('ignores a full URL (rejects the open-redirect)', () => {
    captureReturnDestination('https://evil.com')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('ignores a protocol-relative URL', () => {
    captureReturnDestination('//evil.com')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('ignores the backslash-trick host (/\\evil.com)', () => {
    captureReturnDestination('/\\evil.com')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('ignores a non-string value', () => {
    captureReturnDestination(42)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('ignores undefined (no ?next= present)', () => {
    captureReturnDestination(undefined)
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('clears a previously stored value when called again with a non-in-app value', () => {
    captureReturnDestination('/deck/123')
    captureReturnDestination('https://evil.com')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

describe('consumeReturnDestination', () => {
  test('reads and clears the stashed in-app path, returning it', () => {
    captureReturnDestination('/deck/123')

    const result = consumeReturnDestination()

    expect(result).toBe('/deck/123')
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('returns null when nothing was stashed', () => {
    expect(consumeReturnDestination()).toBeNull()
  })

  test('returns null and clears a stored non-in-app value (defensive — capture already filters these)', () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'https://evil.com')

    const result = consumeReturnDestination()

    expect(result).toBeNull()
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('a second consume call returns null — the value only survives one read', () => {
    captureReturnDestination('/deck/123')

    consumeReturnDestination()
    const second = consumeReturnDestination()

    expect(second).toBeNull()
  })
})
