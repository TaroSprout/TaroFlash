import { describe, test, expect } from 'vite-plus/test'
import {
  DECK_SETTINGS_DEFAULTS,
  DECK_CONFIG_DEFAULTS,
  CARD_ATTRIBUTES_DEFAULTS,
  DAILY_LIMIT_BOUNDS,
  withDeckConfigDefaults,
  buildNewDeckPayload
} from '@/utils/deck/defaults'

describe('deck defaults', () => {
  test('DECK_SETTINGS_DEFAULTS exposes is_public default', () => {
    expect(DECK_SETTINGS_DEFAULTS.is_public).toBe(true)
  })

  test('DECK_CONFIG_DEFAULTS covers every DeckConfig field', () => {
    expect(DECK_CONFIG_DEFAULTS).toMatchObject({
      study_all_cards: false,
      shuffle: false,
      max_reviews_per_day: null,
      max_new_per_day: null,
      flip_cards: false,
      is_spaced: true,
      auto_play: false
    })
  })

  test('CARD_ATTRIBUTES_DEFAULTS exposes text_size default', () => {
    expect(CARD_ATTRIBUTES_DEFAULTS.text_size).toBe(4)
  })

  test('CARD_ATTRIBUTES_DEFAULTS exposes image_layout default as "above"', () => {
    expect(CARD_ATTRIBUTES_DEFAULTS.image_layout).toBe('above')
  })

  test('DAILY_LIMIT_BOUNDS exposes shared step + min and per-row max + default', () => {
    expect(DAILY_LIMIT_BOUNDS.step).toBe(5)
    expect(DAILY_LIMIT_BOUNDS.min).toBe(5)
    expect(DAILY_LIMIT_BOUNDS.reviews.max).toBe(200)
    expect(DAILY_LIMIT_BOUNDS.reviews.default).toBe(50)
    expect(DAILY_LIMIT_BOUNDS.new_cards.max).toBe(100)
    expect(DAILY_LIMIT_BOUNDS.new_cards.default).toBe(20)
  })

  describe('withDeckConfigDefaults', () => {
    test('returns the defaults when partial is undefined', () => {
      expect(withDeckConfigDefaults()).toEqual(DECK_CONFIG_DEFAULTS)
    })

    test('returns a fresh object (not the defaults reference)', () => {
      const result = withDeckConfigDefaults()
      expect(result).not.toBe(DECK_CONFIG_DEFAULTS)
    })

    test('overrides defaults with concrete partial values', () => {
      const result = withDeckConfigDefaults({ shuffle: true, max_reviews_per_day: 50 })
      expect(result.shuffle).toBe(true)
      expect(result.max_reviews_per_day).toBe(50)
      expect(result.flip_cards).toBe(false)
    })

    test('preserves explicit null overrides', () => {
      const result = withDeckConfigDefaults({ max_reviews_per_day: null })
      expect(result.max_reviews_per_day).toBeNull()
    })

    test('ignores keys whose override value is undefined', () => {
      const result = withDeckConfigDefaults({ shuffle: undefined, is_spaced: undefined })
      expect(result.shuffle).toBe(false)
      expect(result.is_spaced).toBe(true)
    })
  })

  describe('buildNewDeckPayload [obligation]', () => {
    test('passes the given title through', () => {
      expect(buildNewDeckPayload('My Deck').title).toBe('My Deck')
    })

    test('applies the is_public default', () => {
      expect(buildNewDeckPayload('My Deck').is_public).toBe(DECK_SETTINGS_DEFAULTS.is_public)
    })

    test('applies the study_config default', () => {
      expect(buildNewDeckPayload('My Deck').study_config).toEqual({
        study_all_cards: DECK_CONFIG_DEFAULTS.study_all_cards
      })
    })

    test('populates a cover_config', () => {
      const result = buildNewDeckPayload('My Deck')
      expect(result.cover_config).toBeTruthy()
      expect(typeof result.cover_config).toBe('object')
    })
  })
})
