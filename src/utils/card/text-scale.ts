import { CARD_ATTRIBUTES_DEFAULTS } from '@/utils/deck/defaults'

// Calibrated against a full-size card. Level 4 is the anchor every other level
// is measured from, so changing it rescales all ten.
const LEVEL_PX_AT_FULL = [16, 20, 24, 30, 36, 44, 52, 60, 70, 84]
const FULL_BASE_PX = LEVEL_PX_AT_FULL[CARD_ATTRIBUTES_DEFAULTS.text_size - 1]

export const DEFAULT_TEXT_LEVEL = CARD_ATTRIBUTES_DEFAULTS.text_size

/**
 * How much to scale a card's text for a deck's chosen size. A multiplier, not
 * a pixel size — the card's own font size already varies with how big the card
 * is being drawn.
 */
export function cardTextScale(level?: number): number {
  const clamped = Math.min(
    LEVEL_PX_AT_FULL.length,
    Math.max(1, Math.round(level ?? DEFAULT_TEXT_LEVEL))
  )
  return LEVEL_PX_AT_FULL[clamped - 1] / FULL_BASE_PX
}
