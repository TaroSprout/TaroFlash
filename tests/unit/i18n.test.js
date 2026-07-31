import { describe, test, expect } from 'vite-plus/test'
import { t, currentLocale, i18n } from '@/i18n'

// src/i18n.ts exists specifically so `t()` and `currentLocale()` resolve
// OUTSIDE a component setup (the router guard and store actions build UI
// copy without one, and useI18n() requires an active setup). No mounted
// component anywhere in this file — that's the point being covered.

describe('t()', () => {
  test('resolves a real message key without a mounted component [obligation]', () => {
    expect(t('member.account-deleted')).toBe('This account no longer exists')
  })

  test('interpolates named params', () => {
    expect(t('member.account-deleted', {})).toBe('This account no longer exists')
  })

  test('defaults named to an empty object when omitted', () => {
    expect(() => t('member.account-deleted')).not.toThrow()
  })
})

describe('currentLocale()', () => {
  test('resolves the active locale tag without a mounted component [obligation]', () => {
    expect(currentLocale()).toBe('en-us')
  })
})

describe('i18n instance', () => {
  test('is a legacy: false, en-us default instance', () => {
    expect(i18n.global.locale.value).toBe('en-us')
  })
})
