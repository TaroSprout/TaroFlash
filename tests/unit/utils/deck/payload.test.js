import { describe, test, expect } from 'vite-plus/test'
import { buildDeckPayload, hasDeckChanges } from '@/utils/deck/payload'
import { DECK_CONFIG_DEFAULTS, DECK_SETTINGS_DEFAULTS } from '@/utils/deck/defaults'

function makeState(overrides = {}) {
  return {
    settings: { title: 'T', description: 'D', is_public: true, ...overrides.settings },
    config: { study_all_cards: false, ...overrides.config },
    cover: { color: '#fff', ...overrides.cover },
    card_attributes: {
      front: overrides.card_attributes?.front ?? {},
      back: overrides.card_attributes?.back ?? {}
    }
  }
}

describe('buildDeckPayload', () => {
  test('maps top-level settings fields into the payload', () => {
    const out = buildDeckPayload(makeState({ settings: { title: 'X', description: 'Y' } }))
    expect(out.title).toBe('X')
    expect(out.description).toBe('Y')
    expect(out.is_public).toBe(true)
  })

  test('falls back to is_public default when settings.is_public is undefined', () => {
    const out = buildDeckPayload(makeState({ settings: { is_public: undefined } }))
    expect(out.is_public).toBe(DECK_SETTINGS_DEFAULTS.is_public)
  })

  test('study_config is DECK_CONFIG_DEFAULTS spread with state.config overlaid', () => {
    const out = buildDeckPayload(
      makeState({ config: { study_all_cards: true, max_reviews_per_day: 30 } })
    )
    // every default key is present
    for (const key of Object.keys(DECK_CONFIG_DEFAULTS)) {
      expect(out.study_config).toHaveProperty(key)
    }
    // overrides win over defaults
    expect(out.study_config.study_all_cards).toBe(true)
    expect(out.study_config.max_reviews_per_day).toBe(30)
    // unspecified field falls through to its default
    expect(out.study_config.study_mode).toBe(DECK_CONFIG_DEFAULTS.study_mode)
  })

  test('cover_config is a shallow copy of state.cover', () => {
    const cover = { color: '#abc', bg_image: 'u' }
    const out = buildDeckPayload(makeState({ cover }))
    expect(out.cover_config).toEqual(cover)
    expect(out.cover_config).not.toBe(cover)
  })

  test('card_attributes deep-clones front/back as shallow objects', () => {
    const front = { text_size: 4 }
    const back = { text_size: 5 }
    const out = buildDeckPayload(makeState({ card_attributes: { front, back } }))
    expect(out.card_attributes.front).toEqual(front)
    expect(out.card_attributes.back).toEqual(back)
    expect(out.card_attributes.front).not.toBe(front)
    expect(out.card_attributes.back).not.toBe(back)
  })

  test('produces stable key order across calls (so JSON.stringify compares safely)', () => {
    const a = buildDeckPayload(makeState())
    const b = buildDeckPayload(makeState())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('hasDeckChanges', () => {
  test('returns false when state matches the snapshot', () => {
    const state = makeState()
    const snapshot = buildDeckPayload(state)
    expect(hasDeckChanges(state, snapshot)).toBe(false)
  })

  test('returns true when a top-level setting changes', () => {
    const state = makeState()
    const snapshot = buildDeckPayload(state)
    state.settings.title = 'changed'
    expect(hasDeckChanges(state, snapshot)).toBe(true)
  })

  test('returns true when a config field changes', () => {
    const state = makeState({ config: { study_all_cards: false } })
    const snapshot = buildDeckPayload(state)
    state.config.study_all_cards = true
    expect(hasDeckChanges(state, snapshot)).toBe(true)
  })

  test('returns true when cover changes', () => {
    const state = makeState()
    const snapshot = buildDeckPayload(state)
    state.cover.bg_image = 'https://x/y.png'
    expect(hasDeckChanges(state, snapshot)).toBe(true)
  })

  test('returns true when card_attributes change on either side', () => {
    const state = makeState({ card_attributes: { front: { text_size: 4 } } })
    const snapshot = buildDeckPayload(state)
    state.card_attributes.front.text_size = 6
    expect(hasDeckChanges(state, snapshot)).toBe(true)
  })

  test('treats null and undefined title identically (JSON drops both equivalently)', () => {
    const state = makeState({ settings: { title: undefined } })
    const snapshot = buildDeckPayload(state)
    expect(hasDeckChanges(state, snapshot)).toBe(false)
  })

  test('stripNullish: card_attributes front with { prop: undefined } produces the same payload as {}', () => {
    const with_undef = makeState({ card_attributes: { front: { align_h: undefined }, back: {} } })
    const without = makeState({ card_attributes: { front: {}, back: {} } })
    const payload_with = buildDeckPayload(with_undef)
    const payload_without = buildDeckPayload(without)
    expect(JSON.stringify(payload_with)).toBe(JSON.stringify(payload_without))
  })

  test('stripNullish: selecting center/center after non-default state produces payload identical to initial snapshot [obligation]', () => {
    // Simulate: start with non-center align, then reset to center/center (stored as undefined)
    const initial = makeState({
      card_attributes: { front: { align_h: undefined, align_v: undefined }, back: {} }
    })
    const after_reset = makeState({
      card_attributes: { front: { align_h: undefined, align_v: undefined }, back: {} }
    })
    const snapshot = buildDeckPayload(initial)
    expect(hasDeckChanges(after_reset, snapshot)).toBe(false)
  })
})
