import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'

// Font px per text-size level (1–10) on the enshrined full-size card
// (--card-w-full, 314px). Level 4 is the deck default and the calibration
// anchor: every other level is expressed as a multiplier of its 30px.
const LEVEL_PX_AT_FULL = [16, 20, 24, 30, 36, 44, 52, 60, 70, 84]
const FULL_BASE_PX = LEVEL_PX_AT_FULL[CARD_ATTRIBUTES_DEFAULTS.text_size - 1]

export const DEFAULT_TEXT_LEVEL = CARD_ATTRIBUTES_DEFAULTS.text_size

/**
 * Multiplier the card face applies to its fluid base font size for a deck's
 * text-size level. Out-of-range / fractional levels clamp and round the same
 * way the old per-size px table did.
 */
export function cardTextScale(level?: number): number {
  const clamped = Math.min(
    LEVEL_PX_AT_FULL.length,
    Math.max(1, Math.round(level ?? DEFAULT_TEXT_LEVEL))
  )
  return LEVEL_PX_AT_FULL[clamped - 1] / FULL_BASE_PX
}
