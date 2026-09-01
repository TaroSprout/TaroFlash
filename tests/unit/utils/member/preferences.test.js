import { describe, test, expect } from 'vite-plus/test'
import {
  MEMBER_PREFERENCES_DEFAULTS,
  withMemberPreferencesDefaults,
  toBusVolumes
} from '@/utils/member/preferences'

describe('MEMBER_PREFERENCES_DEFAULTS', () => {
  test('audio defaults to muted=false and both buses = 5', () => {
    expect(MEMBER_PREFERENCES_DEFAULTS.audio).toEqual({
      muted: false,
      interface_sounds: 5,
      hover_sounds: 5
    })
  })

  test('accessibility defaults to left_hand = false', () => {
    expect(MEMBER_PREFERENCES_DEFAULTS.accessibility.left_hand).toBe(false)
  })

  // show_all_ratings flipped false->true regression guard
  test('study.show_all_ratings defaults to false (regression guard on the flip from true)', () => {
    expect(MEMBER_PREFERENCES_DEFAULTS.study.show_all_ratings).toBe(false)
  })

  test('study defaults to the full five-key shape', () => {
    expect(MEMBER_PREFERENCES_DEFAULTS.study).toEqual({
      show_all_ratings: false,
      show_rating_buttons: true,
      show_button_preview: false,
      show_card_preview: true,
      multi_deck_ordering: 'random'
    })
  })
})

describe('toBusVolumes', () => {
  test('maps *_sounds fields onto the bus-keyed shape the player consumes when not muted', () => {
    expect(toBusVolumes({ muted: false, interface_sounds: 2, hover_sounds: 3 })).toEqual({
      interface: 2,
      hover: 3
    })
  })

  // mute is applied through the volume path — muted ignores slider values
  test('returns interface: 0, hover: 0 when muted is true, ignoring slider values', () => {
    expect(toBusVolumes({ muted: true, interface_sounds: 8, hover_sounds: 9 })).toEqual({
      interface: 0,
      hover: 0
    })
  })
})

describe('withMemberPreferencesDefaults', () => {
  test('returns all defaults when called with no argument', () => {
    const result = withMemberPreferencesDefaults()
    expect(result.audio).toEqual({ muted: false, interface_sounds: 5, hover_sounds: 5 })
    expect(result.accessibility.left_hand).toBe(false)
  })

  test('returns all defaults when called with null', () => {
    const result = withMemberPreferencesDefaults(null)
    expect(result.audio).toEqual({ muted: false, interface_sounds: 5, hover_sounds: 5 })
    expect(result.study.show_all_ratings).toBe(false)
  })

  test('returns all defaults when called with undefined', () => {
    const result = withMemberPreferencesDefaults(undefined)
    expect(result.audio).toEqual({ muted: false, interface_sounds: 5, hover_sounds: 5 })
    expect(result.study.show_all_ratings).toBe(false)
  })

  // partial prefs with no `audio` key → all audio fields default
  test('partial prefs with no audio key → audio fields default (muted=false, both buses=5)', () => {
    const result = withMemberPreferencesDefaults({ accessibility: { left_hand: true } })
    expect(result.audio).toEqual({ muted: false, interface_sounds: 5, hover_sounds: 5 })
  })

  // partial prefs with audio.muted=true is preserved through the merge
  test('partial prefs with audio.muted=true → resolved muted is true', () => {
    const result = withMemberPreferencesDefaults({ audio: { muted: true } })
    expect(result.audio.muted).toBe(true)
  })

  test('partial prefs with audio.interface_sounds = 7 → resolved interface_sounds is 7', () => {
    const result = withMemberPreferencesDefaults({ audio: { interface_sounds: 7 } })
    expect(result.audio.interface_sounds).toBe(7)
  })

  test('partial prefs with audio.hover_sounds = 2 → resolved hover_sounds is 2', () => {
    const result = withMemberPreferencesDefaults({ audio: { hover_sounds: 2 } })
    expect(result.audio.hover_sounds).toBe(2)
  })

  test('only the provided audio fields are overridden; others remain at default', () => {
    const result = withMemberPreferencesDefaults({ audio: { interface_sounds: 3 } })
    expect(result.audio.muted).toBe(false)
    expect(result.audio.hover_sounds).toBe(5)
  })

  // partial audio.muted=true + missing bus keys merges correctly over defaults
  test('partial audio.muted=true with missing bus keys merges correctly over defaults', () => {
    const result = withMemberPreferencesDefaults({ audio: { muted: true } })
    expect(result.audio).toEqual({ muted: true, interface_sounds: 5, hover_sounds: 5 })
  })

  test('all audio fields can be overridden at once', () => {
    const result = withMemberPreferencesDefaults({
      audio: { muted: true, interface_sounds: 2, hover_sounds: 3 }
    })
    expect(result.audio).toEqual({ muted: true, interface_sounds: 2, hover_sounds: 3 })
  })

  test('accessibility.left_hand is preserved from partial', () => {
    const result = withMemberPreferencesDefaults({ accessibility: { left_hand: true } })
    expect(result.accessibility.left_hand).toBe(true)
  })

  // ── study namespace ──────────────────────────────────────────

  test('partial prefs with no study key → study defaults to the full five-key shape', () => {
    const result = withMemberPreferencesDefaults({ accessibility: { left_hand: true } })
    expect(result.study).toEqual({
      show_all_ratings: false,
      show_rating_buttons: true,
      show_button_preview: false,
      show_card_preview: true,
      multi_deck_ordering: 'random'
    })
  })

  // a stored `true` for show_all_ratings survives the default flip
  test('a stored show_all_ratings=true is preserved even though the default flipped to false', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: true } })
    expect(result.study.show_all_ratings).toBe(true)
  })

  test('partial prefs with study.show_all_ratings=false is preserved', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: false } })
    expect(result.study.show_all_ratings).toBe(false)
  })

  // each new study key falls back to its own default independently
  test('show_rating_buttons falls back to its default (true) when absent', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: true } })
    expect(result.study.show_rating_buttons).toBe(true)
  })

  test('a stored show_rating_buttons=false is preserved', () => {
    const result = withMemberPreferencesDefaults({ study: { show_rating_buttons: false } })
    expect(result.study.show_rating_buttons).toBe(false)
  })

  test('show_button_preview falls back to its default (false) when absent', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: true } })
    expect(result.study.show_button_preview).toBe(false)
  })

  test('a stored show_button_preview=true is preserved', () => {
    const result = withMemberPreferencesDefaults({ study: { show_button_preview: true } })
    expect(result.study.show_button_preview).toBe(true)
  })

  test('show_card_preview falls back to its default (true) when absent', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: true } })
    expect(result.study.show_card_preview).toBe(true)
  })

  test('a stored show_card_preview=false is preserved', () => {
    const result = withMemberPreferencesDefaults({ study: { show_card_preview: false } })
    expect(result.study.show_card_preview).toBe(false)
  })

  test('multi_deck_ordering falls back to its default ("random") when absent', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: true } })
    expect(result.study.multi_deck_ordering).toBe('random')
  })

  test('a stored multi_deck_ordering="sequential" is preserved', () => {
    const result = withMemberPreferencesDefaults({ study: { multi_deck_ordering: 'sequential' } })
    expect(result.study.multi_deck_ordering).toBe('sequential')
  })

  test('a partial study blob only overrides the given keys, defaulting the rest', () => {
    const result = withMemberPreferencesDefaults({ study: { show_card_preview: false } })
    expect(result.study).toEqual({
      show_all_ratings: false,
      show_rating_buttons: true,
      show_button_preview: false,
      show_card_preview: false,
      multi_deck_ordering: 'random'
    })
  })

  test('does not mutate MEMBER_PREFERENCES_DEFAULTS', () => {
    const before_audio = { ...MEMBER_PREFERENCES_DEFAULTS.audio }
    const before_study = { ...MEMBER_PREFERENCES_DEFAULTS.study }
    withMemberPreferencesDefaults({
      audio: { interface_sounds: 1 },
      study: { show_card_preview: false }
    })
    expect(MEMBER_PREFERENCES_DEFAULTS.audio).toEqual(before_audio)
    expect(MEMBER_PREFERENCES_DEFAULTS.study).toEqual(before_study)
  })
})
