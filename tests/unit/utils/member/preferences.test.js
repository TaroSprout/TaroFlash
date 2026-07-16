import { describe, test, expect } from 'vite-plus/test'
import {
  MEMBER_PREFERENCES_DEFAULTS,
  withMemberPreferencesDefaults,
  toBusVolumes
} from '@/utils/member/preferences'

describe('MEMBER_PREFERENCES_DEFAULTS', () => {
  test('audio defaults match AUDIO_VOLUME_DEFAULTS (all three fields = 5)', () => {
    expect(MEMBER_PREFERENCES_DEFAULTS.audio).toEqual({
      study_sounds: 5,
      interface_sounds: 5,
      hover_sounds: 5
    })
  })

  test('accessibility defaults to left_hand = false', () => {
    expect(MEMBER_PREFERENCES_DEFAULTS.accessibility.left_hand).toBe(false)
  })

  test('study defaults to show_all_ratings=true only — no FSRS fields [obligation]', () => {
    // desired_retention/learning_steps/relearning_steps moved to
    // review_pacing_presets; MemberPreferences.study was trimmed down to
    // just show_all_ratings.
    expect(MEMBER_PREFERENCES_DEFAULTS.study).toEqual({ show_all_ratings: true })
  })
})

describe('toBusVolumes', () => {
  test('maps *_sounds fields onto the bus-keyed shape the player consumes', () => {
    expect(toBusVolumes({ study_sounds: 1, interface_sounds: 2, hover_sounds: 3 })).toEqual({
      study: 1,
      interface: 2,
      hover: 3
    })
  })
})

describe('withMemberPreferencesDefaults', () => {
  test('returns all defaults when called with no argument', () => {
    const result = withMemberPreferencesDefaults()
    expect(result.audio).toEqual({ study_sounds: 5, interface_sounds: 5, hover_sounds: 5 })
    expect(result.accessibility.left_hand).toBe(false)
  })

  test('returns all defaults when called with null', () => {
    const result = withMemberPreferencesDefaults(null)
    expect(result.audio).toEqual({ study_sounds: 5, interface_sounds: 5, hover_sounds: 5 })
    expect(result.study).toEqual({ show_all_ratings: true })
  })

  test('returns all defaults when called with undefined', () => {
    const result = withMemberPreferencesDefaults(undefined)
    expect(result.audio).toEqual({ study_sounds: 5, interface_sounds: 5, hover_sounds: 5 })
    expect(result.study).toEqual({ show_all_ratings: true })
  })

  // [obligation] partial prefs with no `audio` key → all three audio fields default to 5
  test('partial prefs with no audio key → all three audio fields default to 5', () => {
    const result = withMemberPreferencesDefaults({ accessibility: { left_hand: true } })
    expect(result.audio).toEqual({ study_sounds: 5, interface_sounds: 5, hover_sounds: 5 })
  })

  // [obligation] partial prefs with audio.study_sounds = 3 → resolved is 3
  test('partial prefs with audio.study_sounds = 3 → resolved study_sounds is 3', () => {
    const result = withMemberPreferencesDefaults({ audio: { study_sounds: 3 } })
    expect(result.audio.study_sounds).toBe(3)
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
    const result = withMemberPreferencesDefaults({ audio: { study_sounds: 3 } })
    expect(result.audio.interface_sounds).toBe(5)
    expect(result.audio.hover_sounds).toBe(5)
  })

  test('all three audio fields can be overridden at once', () => {
    const result = withMemberPreferencesDefaults({
      audio: { study_sounds: 1, interface_sounds: 2, hover_sounds: 3 }
    })
    expect(result.audio).toEqual({ study_sounds: 1, interface_sounds: 2, hover_sounds: 3 })
  })

  test('accessibility.left_hand is preserved from partial', () => {
    const result = withMemberPreferencesDefaults({ accessibility: { left_hand: true } })
    expect(result.accessibility.left_hand).toBe(true)
  })

  // ── study namespace [obligation] ──────────────────────────────────────────

  test('partial prefs with no study key → study defaults to show_all_ratings=true [obligation]', () => {
    const result = withMemberPreferencesDefaults({ accessibility: { left_hand: true } })
    expect(result.study).toEqual({ show_all_ratings: true })
  })

  test('partial prefs with study.show_all_ratings=false is preserved [obligation]', () => {
    const result = withMemberPreferencesDefaults({ study: { show_all_ratings: false } })
    expect(result.study).toEqual({ show_all_ratings: false })
  })

  test('does not mutate MEMBER_PREFERENCES_DEFAULTS', () => {
    const before_audio = { ...MEMBER_PREFERENCES_DEFAULTS.audio }
    withMemberPreferencesDefaults({ audio: { study_sounds: 1 } })
    expect(MEMBER_PREFERENCES_DEFAULTS.audio).toEqual(before_audio)
  })
})
