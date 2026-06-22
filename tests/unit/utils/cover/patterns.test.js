import { describe, test, expect } from 'vite-plus/test'
import { COVER_PATTERNS, SUPPORTED_PATTERNS } from '@/utils/cover'

describe('COVER_PATTERNS registry', () => {
  test('every entry carries both light and dark opacity', () => {
    for (const [key, pattern] of Object.entries(COVER_PATTERNS)) {
      expect(pattern.opacity, `${key}.opacity`).toBeTypeOf('string')
      expect(pattern.opacityDark, `${key}.opacityDark`).toBeTypeOf('string')
    }
  })
})

describe('SUPPORTED_PATTERNS (picker list)', () => {
  test('includes exactly the patterns flagged pickable', () => {
    const pickable = Object.keys(COVER_PATTERNS).filter((key) => COVER_PATTERNS[key].pickable)
    expect([...SUPPORTED_PATTERNS].sort()).toEqual(pickable.sort())
  })

  test('omits "saw" — renderable but not offered in the picker', () => {
    expect(COVER_PATTERNS.saw.pickable).toBe(false)
    expect(SUPPORTED_PATTERNS).not.toContain('saw')
  })

  test('every other registered pattern is offered', () => {
    const expected = Object.keys(COVER_PATTERNS).filter((key) => key !== 'saw')
    for (const key of expected) {
      expect(SUPPORTED_PATTERNS, key).toContain(key)
    }
  })
})
