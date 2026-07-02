import { describe, test, expect } from 'vite-plus/test'
import { buildMemberPayload, hasMemberChanges } from '@/utils/member/payload'
import { MEMBER_CARD_COVER_DEFAULTS } from '@/utils/member/defaults'

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
        preferences: {},
        cover: {}
      })
      expect(payload).toEqual({
        display_name: 'Chris',
        description: 'hi',
        preferences: DEFAULT_PREFS,
        cover_config: MEMBER_CARD_COVER_DEFAULTS
      })
    })

    test('falls back to empty-string defaults when display_name is missing', () => {
      const payload = buildMemberPayload({
        settings: { description: 'hi' },
        preferences: {},
        cover: {}
      })
      expect(payload).toEqual({
        display_name: '',
        description: 'hi',
        preferences: DEFAULT_PREFS,
        cover_config: MEMBER_CARD_COVER_DEFAULTS
      })
    })

    test('falls back to empty-string defaults when description is missing', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris' },
        preferences: {},
        cover: {}
      })
      expect(payload).toEqual({
        display_name: 'Chris',
        description: '',
        preferences: DEFAULT_PREFS,
        cover_config: MEMBER_CARD_COVER_DEFAULTS
      })
    })

    test('falls back to defaults when both fields are missing', () => {
      const payload = buildMemberPayload({ settings: {}, preferences: {}, cover: {} })
      expect(payload).toEqual({
        display_name: '',
        description: '',
        preferences: DEFAULT_PREFS,
        cover_config: MEMBER_CARD_COVER_DEFAULTS
      })
    })

    test('preserves empty strings rather than substituting defaults', () => {
      const payload = buildMemberPayload({
        settings: { display_name: '', description: '' },
        preferences: {},
        cover: {}
      })
      expect(payload).toEqual({
        display_name: '',
        description: '',
        preferences: DEFAULT_PREFS,
        cover_config: MEMBER_CARD_COVER_DEFAULTS
      })
    })

    test('round-trips left_hand preference', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris', description: 'hi' },
        preferences: { accessibility: { left_hand: true } },
        cover: {}
      })
      expect(payload.preferences.accessibility.left_hand).toBe(true)
    })

    // ── cover_config resolution [obligation] ──────────────────────────────

    test('resolves a sparse cover to a fully-defaulted cover_config, no undefined fields [obligation]', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris', description: 'hi' },
        preferences: {},
        cover: { theme: 'red-500' }
      })
      expect(payload.cover_config).toEqual({
        theme: 'red-500',
        theme_dark: MEMBER_CARD_COVER_DEFAULTS.theme_dark,
        pattern: MEMBER_CARD_COVER_DEFAULTS.pattern
      })
      expect(Object.values(payload.cover_config)).not.toContain(undefined)
    })

    test('resolves an empty cover to MEMBER_CARD_COVER_DEFAULTS verbatim', () => {
      const payload = buildMemberPayload({
        settings: { display_name: 'Chris', description: 'hi' },
        preferences: {},
        cover: {}
      })
      expect(payload.cover_config).toEqual(MEMBER_CARD_COVER_DEFAULTS)
    })
  })

  describe('hasMemberChanges', () => {
    const baseState = (extra = {}) => ({
      settings: { display_name: 'Chris', description: 'hi' },
      preferences: {},
      cover: {},
      ...extra
    })
    const baseSnapshot = (extra = {}) => ({
      display_name: 'Chris',
      description: 'hi',
      preferences: DEFAULT_PREFS,
      cover_config: MEMBER_CARD_COVER_DEFAULTS,
      ...extra
    })

    test('returns false when the live state matches the snapshot', () => {
      expect(hasMemberChanges(baseState(), baseSnapshot())).toBe(false)
    })

    test('returns true when display_name diverges', () => {
      const state = {
        ...baseState(),
        settings: { display_name: 'Other', description: 'hi' }
      }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    test('returns true when description diverges', () => {
      const state = {
        ...baseState(),
        settings: { display_name: 'Chris', description: 'bye' }
      }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    test('treats a missing field as the default empty string', () => {
      const state = { settings: { display_name: 'Chris' }, preferences: {}, cover: {} }
      const snapshot = baseSnapshot({ description: '' })
      expect(hasMemberChanges(state, snapshot)).toBe(false)
    })

    test('returns true when left_hand preference diverges', () => {
      const state = { ...baseState(), preferences: { accessibility: { left_hand: true } } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    // ── cover-only dirty state [obligation] ───────────────────────────────

    test('returns true when only cover.theme diverges, settings/preferences unchanged [obligation]', () => {
      const state = { ...baseState(), cover: { theme: 'red-500' } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    test('returns true when only cover.theme_dark diverges [obligation]', () => {
      const state = { ...baseState(), cover: { theme_dark: 'red-700' } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })

    test('returns true when only cover.pattern diverges [obligation]', () => {
      const state = { ...baseState(), cover: { pattern: 'wave' } }
      expect(hasMemberChanges(state, baseSnapshot())).toBe(true)
    })
  })
})
