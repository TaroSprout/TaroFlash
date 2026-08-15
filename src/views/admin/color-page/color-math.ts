import type { Hsl } from './catalog'

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
function hexToRgb(hex: string): { r: number; g: number; b: number } {
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

function hslToRgb({ h, s, l }: Hsl): { r: number; g: number; b: number } {
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

function toLinear(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function channelToHex(channel: number): string {
  return Math.round(clamp(channel, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
}
