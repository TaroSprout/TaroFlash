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
      shuffle: false,
      flip_cards: false,
      is_spaced: true,
      auto_play: false
    })
  })

  test('DECK_CONFIG_DEFAULTS no longer carries study_all_cards (dropped with the deck-blind study session) [obligation]', () => {
    expect(DECK_CONFIG_DEFAULTS).not.toHaveProperty('study_all_cards')
  })

  test('DECK_CONFIG_DEFAULTS no longer carries the daily-limit fields (moved to pacing overrides)', () => {
    expect(DECK_CONFIG_DEFAULTS).not.toHaveProperty('max_reviews_per_day')
    expect(DECK_CONFIG_DEFAULTS).not.toHaveProperty('max_new_per_day')
  })

  test('CARD_ATTRIBUTES_DEFAULTS exposes text_size default', () => {
    expect(CARD_ATTRIBUTES_DEFAULTS.text_size).toBe(4)
  })

  test('CARD_ATTRIBUTES_DEFAULTS exposes image_layout default as "above"', () => {
    expect(CARD_ATTRIBUTES_DEFAULTS.image_layout).toBe('above')
  })

  test('DAILY_LIMIT_BOUNDS exposes a shared step and a min of 0 (the "all"/uncapped sentinel) [obligation]', () => {
    expect(DAILY_LIMIT_BOUNDS.step).toBe(5)
    expect(DAILY_LIMIT_BOUNDS.min).toBe(0)
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
      const result = withDeckConfigDefaults({ shuffle: true, flip_cards: true })
      expect(result.shuffle).toBe(true)
      expect(result.flip_cards).toBe(true)
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

    test('applies an empty study_config default', () => {
      expect(buildNewDeckPayload('My Deck').study_config).toEqual({})
    })

    test('populates a cover_config', () => {
      const result = buildNewDeckPayload('My Deck')
      expect(result.cover_config).toBeTruthy()
      expect(typeof result.cover_config).toBe('object')
    })
  })
})
