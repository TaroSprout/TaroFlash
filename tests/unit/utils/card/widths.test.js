import { describe, test, expect, afterEach } from 'vite-plus/test'
import { cardWidthPx } from '@/utils/card/widths'

afterEach(() => {
  ;['full', 'md', 'sm', 'xs', '2xs'].forEach((token) =>
    document.documentElement.style.removeProperty(`--card-w-${token}`)
  )
})

describe('cardWidthPx', () => {
  test('reads --card-w-<token> off document.documentElement', () => {
    document.documentElement.style.setProperty('--card-w-full', '314px')
    expect(cardWidthPx('full')).toBe(314)
  })

  test('resolves a different token to its own custom property', () => {
    document.documentElement.style.setProperty('--card-w-sm', '192px')
    document.documentElement.style.setProperty('--card-w-xs', '172px')
    expect(cardWidthPx('sm')).toBe(192)
    expect(cardWidthPx('xs')).toBe(172)
  })

  test('reflects a live update to the custom property', () => {
    document.documentElement.style.setProperty('--card-w-md', '260px')
    expect(cardWidthPx('md')).toBe(260)
    document.documentElement.style.setProperty('--card-w-md', '240px')
    expect(cardWidthPx('md')).toBe(240)
  })
})
