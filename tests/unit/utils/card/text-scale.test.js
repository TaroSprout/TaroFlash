import { describe, test, expect } from 'vite-plus/test'
import { cardTextScale, DEFAULT_TEXT_LEVEL } from '@/utils/card/text-scale'
import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'

// LEVEL_PX_AT_FULL = [16, 20, 24, 30, 36, 44, 52, 60, 70, 84] — the historical
// xl-size px-per-level row. Level 4 (30px) is the deck default and calibration
// anchor, so cardTextScale(4) === 1 and every other level is px/30.
const LEVEL_PX_AT_FULL = [16, 20, 24, 30, 36, 44, 52, 60, 70, 84]
const FULL_BASE_PX = LEVEL_PX_AT_FULL[3]

describe('DEFAULT_TEXT_LEVEL', () => {
  test('sources from CARD_ATTRIBUTES_DEFAULTS.text_size, not a literal', () => {
    expect(DEFAULT_TEXT_LEVEL).toBe(CARD_ATTRIBUTES_DEFAULTS.text_size)
  })
})

describe('cardTextScale', () => {
  test('returns exactly 1 for the default level (4)', () => {
    expect(cardTextScale(4)).toBe(1)
  })

  test('returns exactly 1 when no level is given (falls back to the default)', () => {
    expect(cardTextScale()).toBe(1)
  })

  test.each(LEVEL_PX_AT_FULL.map((px, i) => [i + 1, px]))(
    'level %i maps to the historical xl px row (%ipx / 30)',
    (level, px) => {
      expect(cardTextScale(level)).toBeCloseTo(px / FULL_BASE_PX, 10)
    }
  )

  test('clamps a level below 1 up to level 1', () => {
    expect(cardTextScale(0)).toBe(cardTextScale(1))
  })

  test('clamps a level above 10 down to level 10', () => {
    expect(cardTextScale(11)).toBe(cardTextScale(10))
  })

  test('rounds a fractional level to the nearest level', () => {
    expect(cardTextScale(4.4)).toBe(cardTextScale(4))
  })

  test('rounds a fractional level up when past the midpoint', () => {
    expect(cardTextScale(4.6)).toBe(cardTextScale(5))
  })
})
