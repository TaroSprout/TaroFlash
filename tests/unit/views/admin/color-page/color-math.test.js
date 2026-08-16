import { describe, test, expect } from 'vite-plus/test'
import {
  apcaLc,
  contrastRatio,
  hexToHsl,
  hslToHex,
  lightnessDelta,
  normalizeHsl,
  oklchOf
} from '@/views/admin/color-page/color-math'

const WHITE = { h: 0, s: 0, l: 100 }
const BLACK = { h: 0, s: 0, l: 0 }

describe('color-math', () => {
  // ── normalizeHsl ────────────────────────────────────────────────────────────

  test('wraps a hue above 360 back into range', () => {
    expect(normalizeHsl({ h: 400, s: 50, l: 50 }).h).toBe(40)
  })

  test('wraps a negative hue into range', () => {
    expect(normalizeHsl({ h: -30, s: 50, l: 50 }).h).toBe(330)
  })

  test('clamps saturation and lightness to 0-100', () => {
    expect(normalizeHsl({ h: 0, s: 150, l: -20 })).toEqual({ h: 0, s: 100, l: 0 })
  })

  // ── hex <-> hsl round trip ──────────────────────────────────────────────────

  test.each([
    ['#ffffff', { h: 0, s: 0, l: 100 }],
    ['#000000', { h: 0, s: 0, l: 0 }],
    ['#ff0000', { h: 0, s: 100, l: 50 }],
    ['#11b7d4', { h: 189, s: 85, l: 45 }]
  ])('hexToHsl(%s) reads back as %o', (hex, expected) => {
    expect(hexToHsl(hex)).toEqual(expected)
  })

  test('hexToHsl expands a 3-digit hex the same as its 6-digit spelling', () => {
    expect(hexToHsl('#f00')).toEqual(hexToHsl('#ff0000'))
  })

  test.each(['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff'])(
    'round-trips %s through hexToHsl -> hslToHex unchanged',
    (hex) => {
      expect(hslToHex(hexToHsl(hex))).toBe(hex)
    }
  )

  // ── contrastRatio ───────────────────────────────────────────────────────────

  test('WCAG contrast of white against black is 21', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 1)
  })

  test('contrastRatio is order-independent', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(contrastRatio(BLACK, WHITE), 10)
  })

  test('contrastRatio of a colour against itself is 1', () => {
    const grey = { h: 0, s: 0, l: 50 }
    expect(contrastRatio(grey, grey)).toBeCloseTo(1, 10)
  })

  // ── apcaLc — polarity and sign ──────────────────────────────────────────────

  test('apcaLc is positive for dark text on a light background', () => {
    expect(apcaLc(BLACK, WHITE)).toBeGreaterThan(0)
  })

  test('apcaLc is negative for light text on a dark background', () => {
    expect(apcaLc(WHITE, BLACK)).toBeLessThan(0)
  })

  test('apcaLc magnitude does not simply mirror between the two polarities', () => {
    // APCA is not symmetric — text/bg swapped is not just a sign flip of the same number.
    expect(Math.abs(apcaLc(BLACK, WHITE))).not.toBeCloseTo(Math.abs(apcaLc(WHITE, BLACK)), 3)
  })

  test('apcaLc reads near zero for a pair too close to tell apart', () => {
    const a = { h: 0, s: 0, l: 50 }
    const b = { h: 0, s: 0, l: 50.2 }
    expect(apcaLc(a, b)).toBe(0)
  })

  // ── oklchOf / lightnessDelta on shipped shades ───────────────────────────────

  test('oklchOf(white) has l near 1 and c near 0', () => {
    const { l, c } = oklchOf(WHITE)
    expect(l).toBeCloseTo(1, 1)
    expect(c).toBeCloseTo(0, 1)
  })

  test('oklchOf(black) has l near 0', () => {
    expect(oklchOf(BLACK).l).toBeCloseTo(0, 1)
  })

  test('lightnessDelta is positive when the shade is lighter than its ground', () => {
    expect(lightnessDelta(WHITE, BLACK)).toBeGreaterThan(0)
  })

  test('lightnessDelta is negative when the shade is darker than its ground', () => {
    expect(lightnessDelta(BLACK, WHITE)).toBeLessThan(0)
  })

  test('lightnessDelta on shipped shades: brown-700 ink sits below brown-100 page surface', () => {
    const ink = hexToHsl('#744e2a') // brown-700
    const surface = hexToHsl('#f3f1ea') // brown-100
    expect(lightnessDelta(ink, surface)).toBeLessThan(0)
  })
})
