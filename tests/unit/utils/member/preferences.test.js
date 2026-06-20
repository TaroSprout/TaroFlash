import { describe, test, expect } from 'vite-plus/test'
import {
  MEMBER_PREFERENCES_DEFAULTS,
  withMemberPreferencesDefaults
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
  })

  test('returns all defaults when called with undefined', () => {
    const result = withMemberPreferencesDefaults(undefined)
    expect(result.audio).toEqual({ study_sounds: 5, interface_sounds: 5, hover_sounds: 5 })
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

  test('does not mutate MEMBER_PREFERENCES_DEFAULTS', () => {
    const before_audio = { ...MEMBER_PREFERENCES_DEFAULTS.audio }
    withMemberPreferencesDefaults({ audio: { study_sounds: 1 } })
    expect(MEMBER_PREFERENCES_DEFAULTS.audio).toEqual(before_audio)
  })
})
