/**
 * What a deck's settings are when nobody has chosen. Read them here whether
 * you're creating a deck or filling gaps in a loaded one — the two drifting
 * apart is how a deck studies differently from how its settings screen reads.
 */

import { randomCoverConfig } from '@/utils/cover'

export const DECK_SETTINGS_DEFAULTS = {
  is_public: true
} as const

export const DECK_TITLE_MAX_LENGTH = 15

export const DECK_CONFIG_DEFAULTS: Required<DeckConfig> = {
  shuffle: false,
  starting_side: 'front',
  is_spaced: true,
  auto_play: false
}

export const CARD_ATTRIBUTES_DEFAULTS: Required<
  Pick<CardAttributes, 'text_size' | 'image_layout'>
> = {
  text_size: 4,
  image_layout: 'above'
}

/**
 * Bounds for the daily-limit steppers. Deliberately open-ended upward — decks
 * grow, so a limit above today's card count is a reasonable thing to set.
 */
export const DAILY_LIMIT_BOUNDS = {
  step: 5,
  // 0 is the "all" / no-limit sentinel; the model stores it as `null`.
  min: 0
} as const

/** Fills a deck's unset settings in from the defaults above. */
export function withDeckConfigDefaults(partial?: Partial<DeckConfig>): Required<DeckConfig> {
  const out = { ...DECK_CONFIG_DEFAULTS }
  if (!partial) return out
  for (const k of Object.keys(partial) as (keyof DeckConfig)[]) {
    const v = partial[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** Payload for a freshly created deck: given title, default settings, a random cover. */
export function buildNewDeckPayload(title: string): Deck {
  return {
    title,
    is_public: DECK_SETTINGS_DEFAULTS.is_public,
    study_config: {},
    cover_config: randomCoverConfig()
  } as Deck
}
