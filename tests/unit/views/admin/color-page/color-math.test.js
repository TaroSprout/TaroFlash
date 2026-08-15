import { describe, test, expect } from 'vite-plus/test'
import {
  contrastRatio,
  hexToHsl,
  hslToHex,
  normalizeHsl,
  relativeLuminance,
  sameHsl
} from '@/views/admin/color-page/color-math'

describe('color-math — hexToHsl / hslToHex round trip', () => {
  test('a hex value survives hex -> hsl -> hex unchanged [obligation]', () => {
    const hex = '#744e2a'
    expect(hslToHex(hexToHsl(hex))).toBe(hex)
  })

  test('white round-trips to white', () => {
    expect(hslToHex(hexToHsl('#ffffff'))).toBe('#ffffff')
  })

  test('black round-trips to black', () => {
    expect(hslToHex(hexToHsl('#000000'))).toBe('#000000')
  })

  test('a 3-digit shorthand hex expands before converting', () => {
    expect(hexToHsl('#fff')).toEqual({ h: 0, s: 0, l: 100 })
  })

  test('an unparsable hex reads as black', () => {
    expect(hexToHsl('#zz')).toEqual({ h: 0, s: 0, l: 0 })
  })
})

describe('color-math — hslToHex across every hue sector', () => {
  test.each([
    [30, '#bf8040'],
    [90, '#80bf40'],
    [150, '#40bf80'],
    [210, '#4080bf'],
    [270, '#8040bf'],
    [330, '#bf4080']
  ])('renders a saturated colour at hue %i as a valid 6-digit hex', (h, expected) => {
    expect(hslToHex({ h, s: 50, l: 50 })).toBe(expected)
  })
})

describe('color-math — normalizeHsl', () => {
  test('wraps a hue above 360 back into range', () => {
    expect(normalizeHsl({ h: 400, s: 50, l: 50 })).toEqual({ h: 40, s: 50, l: 50 })
  })

  test('wraps a negative hue into range', () => {
    expect(normalizeHsl({ h: -10, s: 50, l: 50 })).toEqual({ h: 350, s: 50, l: 50 })
  })

  test('clamps saturation above 100', () => {
    expect(normalizeHsl({ h: 10, s: 150, l: 50 })).toEqual({ h: 10, s: 100, l: 50 })
  })

  test('clamps lightness below 0', () => {
    expect(normalizeHsl({ h: 10, s: 50, l: -20 })).toEqual({ h: 10, s: 50, l: 0 })
  })
})

describe('color-math — contrastRatio [obligation]', () => {
  test('white against black is the maximum contrast of 21', () => {
    const white = hexToHsl('#ffffff')
    const black = hexToHsl('#000000')
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1)
  })

  test('contrast is order-independent', () => {
    const white = hexToHsl('#ffffff')
    const black = hexToHsl('#000000')
    expect(contrastRatio(white, black)).toBe(contrastRatio(black, white))
  })

  test('brown-700 on brown-100 lands close to the shipped 6.55 ratio', () => {
    const ink = hexToHsl('#744e2a')
    const surface = hexToHsl('#f3f1ea')
    expect(contrastRatio(ink, surface)).toBeCloseTo(6.55, 1)
  })

  test('a colour against itself is the minimum contrast of 1', () => {
    const hsl = hexToHsl('#744e2a')
    expect(contrastRatio(hsl, hsl)).toBeCloseTo(1, 5)
  })
})

describe('color-math — relativeLuminance', () => {
  test('white is fully luminant', () => {
    expect(relativeLuminance(hexToHsl('#ffffff'))).toBeCloseTo(1, 5)
  })

  test('black has no luminance', () => {
    expect(relativeLuminance(hexToHsl('#000000'))).toBeCloseTo(0, 5)
  })
})

describe('color-math — sameHsl', () => {
  test('two identical hsl values are the same', () => {
    expect(sameHsl({ h: 1, s: 2, l: 3 }, { h: 1, s: 2, l: 3 })).toBe(true)
  })

  test('a difference in a single channel is not the same', () => {
    expect(sameHsl({ h: 1, s: 2, l: 3 }, { h: 1, s: 2, l: 4 })).toBe(false)
  })
})
