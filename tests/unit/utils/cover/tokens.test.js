import { describe, test, expect } from 'vite-plus/test'
import { SUPPORTED_PALETTES, coverIconPalette } from '@/utils/cover'

describe('coverIconPalette', () => {
  test('returns purple when the cover palette is yellow, so the icon never vanishes into the fill', () => {
    expect(coverIconPalette('yellow')).toBe('purple')
  })

  test('returns yellow when the cover has no palette', () => {
    expect(coverIconPalette(undefined)).toBe('yellow')
  })

  test.each(SUPPORTED_PALETTES.filter((palette) => palette !== 'yellow'))(
    'returns yellow for the %s cover palette',
    (palette) => {
      expect(coverIconPalette(palette)).toBe('yellow')
    }
  )
})
