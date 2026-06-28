/**
 * Single source of truth for deck-shaped defaults: settings, study config,
 * card attributes, and the UI bounds the deck-settings forms apply on top.
 * Both the editor (when staging a fresh deck) and the runtime study-session
 * core (when filling missing fields on a loaded deck) read from here.
 */

export const DECK_SETTINGS_DEFAULTS = {
  is_public: true
} as const

export const DECK_CONFIG_DEFAULTS: Required<DeckConfig> = {
  study_mode: 'flashcard',
  study_all_cards: false,
  shuffle: false,
  max_reviews_per_day: null,
  max_new_per_day: null,
  flip_cards: false,
  is_spaced: true,
  auto_play: false,
  show_all_ratings: true
}

export const CARD_ATTRIBUTES_DEFAULTS: Required<
  Pick<CardAttributes, 'text_size' | 'image_layout'>
> = {
  text_size: 4,
  image_layout: 'above'
}

/**
 * UI bounds for the daily-limit spinboxes in tab-study. Step + min are shared;
 * each row has its own max + default. `null` on the model means "no cap" (the
 * "all" pill is active).
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
 * Explicit `null` is preserved (it means "all" / unbounded for the daily limits).
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
