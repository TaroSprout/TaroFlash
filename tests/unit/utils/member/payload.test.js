import { describe, test, expect } from 'vite-plus/test'
import { buildMemberPayload, hasMemberChanges } from '@/utils/member/payload'

const DEFAULT_PREFS = {
  accessibility: { left_hand: false },
  audio: { study_sounds: 5, interface_sounds: 5, hover_sounds: 5 },
  study: { show_all_ratings: true, desired_retention: 90 }
}

describe('member/payload', () => {
  describe('buildMemberPayload', () => {
    test('returns the settings values when both fields are present', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris', description: 'hi' },
        preferences: {}
      })
      expect(payload).toEqual({
        display_name: 'Chris',
        description: 'hi',
        preferences: DEFAULT_PREFS
      })
    })

    test('falls back to empty-string defaults when display_name is missing', () => {
      const payload = buildMemberPayload({
        settings: { description: 'hi' },
        preferences: {}
      })
      expect(payload).toEqual({
        display_name: '',
        description: 'hi',
        preferences: DEFAULT_PREFS
      })
    })

    test('falls back to empty-string defaults when description is missing', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris' },
        preferences: {}
      })
      expect(payload).toEqual({
        display_name: 'Chris',
        description: '',
        preferences: DEFAULT_PREFS
      })
    })

    test('falls back to defaults when both fields are missing', () => {
      const payload = buildMemberPayload({ settings: {}, preferences: {} })
      expect(payload).toEqual({
        display_name: '',
        description: '',
        preferences: DEFAULT_PREFS
      })
    })

    test('preserves empty strings rather than substituting defaults', () => {
      const payload = buildMemberPayload({
        settings: { display_name: '', description: '' },
        preferences: {}
      })
      expect(payload).toEqual({
        display_name: '',
        description: '',
        preferences: DEFAULT_PREFS
      })
    })

    test('round-trips left_hand preference', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris', description: 'hi' },
        preferences: { accessibility: { left_hand: true } }
      })
      expect(payload.preferences.accessibility.left_hand).toBe(true)
    })
  })

  describe('hasMemberChanges', () => {
    const baseState = (extra = {}) => ({
      settings: { display_name: 'Chris', description: 'hi' },
      preferences: {},
      ...extra
    })
    const baseSnapshot = (extra = {}) => ({
      display_name: 'Chris',
      description: 'hi',
      preferences: DEFAULT_PREFS,
      ...extra
    })

    test('returns false when the live state matches the snapshot', () => {
      expect(hasMemberChanges(baseState(), baseSnapshot())).toBe(false)
    })

    test('returns true when display_name diverges', () => {
      const state = { ...baseState(), settings: { display_name: 'Other', description: 'hi' } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    test('returns true when description diverges', () => {
      const state = { ...baseState(), settings: { display_name: 'Chris', description: 'bye' } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    test('treats a missing field as the default empty string', () => {
      const state = { settings: { display_name: 'Chris' }, preferences: {} }
      const snapshot = baseSnapshot({ description: '' })
      expect(hasMemberChanges(state, snapshot)).toBe(false)
    })

    test('returns true when left_hand preference diverges', () => {
      const state = { ...baseState(), preferences: { accessibility: { left_hand: true } } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })
  })
})
