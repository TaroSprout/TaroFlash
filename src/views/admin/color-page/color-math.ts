// Editing happens in HSL because that is what the stylesheet spells; every comparison between two
// colours goes through OKLCH instead, where equal steps look equal.

import type { Hsl } from './catalog'

export type Oklch = { l: number; c: number; h: number }

type Rgb = { r: number; g: number; b: number }

/** Wraps hue and clamps saturation/lightness so a stepped channel can't leave its own range. */
export function normalizeHsl({ h, s, l }: Hsl): Hsl {
  return {
    h: ((Math.round(h) % 360) + 360) % 360,
    s: clamp(Math.round(s), 0, 100),
    l: clamp(Math.round(l), 0, 100)
  }
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex)

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const span = max - min
  const l = (max + min) / 2

  if (span === 0) return { h: 0, s: 0, l: Math.round(l * 100) }

  const s = span / (1 - Math.abs(2 * l - 1))

  let h = 0
  if (max === r) h = ((g - b) / span) % 6
  else if (max === g) h = (b - r) / span + 2
  else h = (r - g) / span + 4

  return normalizeHsl({ h: h * 60, s: s * 100, l: l * 100 })
}

export function hslToHex(hsl: Hsl): string {
  const { r, g, b } = hslToRgb(hsl)
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
}

/** WCAG 2.2 contrast ratio, 1–21, order-independent. */
export function contrastRatio(a: Hsl, b: Hsl): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)

  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * APCA Lc for `text` read on `bg`, roughly -108…106. Order matters and the sign carries the
 * polarity: positive is dark-on-light, negative is light-on-dark.
 */
export function apcaLc(text: Hsl, bg: Hsl): number {
  const text_y = softClampBlack(apcaLuminance(text))
  const bg_y = softClampBlack(apcaLuminance(bg))

  if (Math.abs(bg_y - text_y) < 0.0005) return 0

  const contrast =
    bg_y > text_y ? (bg_y ** 0.56 - text_y ** 0.57) * 1.14 : (bg_y ** 0.65 - text_y ** 0.62) * 1.14

  return Math.round(applyLowClip(contrast, bg_y > text_y) * 100)
}

/** Perceptual lightness, 0–1: the OKLCH channel that says whether a family steps evenly. */
export function oklchOf(hsl: Hsl): Oklch {
  const { r, g, b } = hslToRgb(hsl)

  const lr = toLinear(r)
  const lg = toLinear(g)
  const lb = toLinear(b)

  const long = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const medium = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const short = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)

  const lab_a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short
  const lab_b = 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short

  return {
    l: 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
    c: Math.hypot(lab_a, lab_b),
    h: ((Math.atan2(lab_b, lab_a) * 180) / Math.PI + 360) % 360
  }
}

/** How far apart two colours sit in perceptual lightness, signed from `ground` up to `shade`. */
export function lightnessDelta(shade: Hsl, ground: Hsl): number {
  return oklchOf(shade).l - oklchOf(ground).l
}

export function relativeLuminance(hsl: Hsl): number {
  const { r, g, b } = hslToRgb(hsl)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function sameHsl(a: Hsl, b: Hsl): boolean {
  return a.h === b.h && a.s === b.s && a.l === b.l
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Accepts `#rgb` and `#rrggbb`; anything else reads as black. */
function hexToRgb(hex: string): Rgb {
  const body = hex.replace('#', '')
  const full =
    body.length === 3
      ? body
          .split('')
          .map((char) => char + char)
          .join('')
      : body

  if (full.length !== 6) return { r: 0, g: 0, b: 0 }

  return {
    r: parseInt(full.slice(0, 2), 16) / 255,
    g: parseInt(full.slice(2, 4), 16) / 255,
    b: parseInt(full.slice(4, 6), 16) / 255
  }
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sat = s / 100
  const light = l / 100

  const chroma = (1 - Math.abs(2 * light - 1)) * sat
  const sector = h / 60
  const second = chroma * (1 - Math.abs((sector % 2) - 1))
  const lift = light - chroma / 2

  const [r, g, b] = rgbBySector(sector, chroma, second)

  return { r: r + lift, g: g + lift, b: b + lift }
}

function rgbBySector(sector: number, chroma: number, second: number): [number, number, number] {
  if (sector < 1) return [chroma, second, 0]
  if (sector < 2) return [second, chroma, 0]
  if (sector < 3) return [0, chroma, second]
  if (sector < 4) return [0, second, chroma]
  if (sector < 5) return [second, 0, chroma]
  return [chroma, 0, second]
}

function apcaLuminance(hsl: Hsl): number {
  const { r, g, b } = hslToRgb(hsl)
  return 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4
}

// Near-black pairs otherwise read as far more contrast than the eye finds there, so APCA lifts the
// darker end before comparing.
function softClampBlack(y: number): number {
  return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
}

// A pair too close to tell apart reports as zero rather than as a small number an admin might act on.
function applyLowClip(contrast: number, dark_on_light: boolean): number {
  if (dark_on_light) return contrast < 0.1 ? 0 : contrast - 0.027
  return contrast > -0.1 ? 0 : contrast + 0.027
}

function toLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function channelToHex(channel: number): string {
  return Math.round(clamp(channel, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
}
