/**
 * Single source of truth for deck-shaped defaults: settings, study config,
 * card attributes, and the UI bounds the deck-settings forms apply on top.
 * Both the editor (when staging a fresh deck) and the runtime study-session
 * core (when filling missing fields on a loaded deck) read from here.
 */

import { randomCoverConfig } from '@/utils/cover'

export const DECK_SETTINGS_DEFAULTS = {
  is_public: true
} as const

export const DECK_TITLE_MAX_LENGTH = 15

export const DECK_CONFIG_DEFAULTS: Required<DeckConfig> = {
  study_all_cards: false,
  shuffle: false,
  flip_cards: false,
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
 * UI bounds for the daily-limit spinboxes in tab-review-pacing. Step + min
 * are shared; each row has its own max + default. `null` on the model means
 * "no cap" (the "all" pill is active).
 */
export const DAILY_LIMIT_BOUNDS = {
  step: 5,
  min: 5,
  reviews: { max: 200, default: 50 },
  new_cards: { max: 100, default: 20 }
} as const

/**
 * Merge a `Partial<DeckConfig>` over `DECK_CONFIG_DEFAULTS`, ignoring keys
 * whose override value is `undefined` so they don't leak past the default.
 */
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
    study_config: { study_all_cards: DECK_CONFIG_DEFAULTS.study_all_cards },
    cover_config: randomCoverConfig()
  } as Deck
}
