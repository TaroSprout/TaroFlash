import { describe, test, expect } from 'vite-plus/test'
import {
  MEMBER_SETTINGS_DEFAULTS,
  MEMBER_CARD_COVER_DEFAULTS,
  withMemberCardCoverDefaults
} from '@/utils/member/defaults'

describe('member/defaults', () => {
  test('MEMBER_SETTINGS_DEFAULTS exposes empty strings for editable fields', () => {
    expect(MEMBER_SETTINGS_DEFAULTS).toEqual({ display_name: '', description: '' })
  })

  test('MEMBER_CARD_COVER_DEFAULTS exposes a green palette + bank-note pattern', () => {
    expect(MEMBER_CARD_COVER_DEFAULTS).toEqual({
      palette: 'green',
      pattern: 'bank-note'
    })
  })

  test('withMemberCardCoverDefaults returns a clone of defaults when called with no partial', () => {
    const out = withMemberCardCoverDefaults()
    expect(out).toEqual(MEMBER_CARD_COVER_DEFAULTS)
    expect(out).not.toBe(MEMBER_CARD_COVER_DEFAULTS)
  })

  test('withMemberCardCoverDefaults returns a clone of defaults when called with undefined', () => {
    const out = withMemberCardCoverDefaults(undefined)
    expect(out).toEqual(MEMBER_CARD_COVER_DEFAULTS)
  })

  test('withMemberCardCoverDefaults overrides only the keys present on the partial', () => {
    const out = withMemberCardCoverDefaults({ palette: 'blue' })
    expect(out).toEqual({
      palette: 'blue',
      pattern: 'bank-note'
    })
  })

  test('withMemberCardCoverDefaults ignores undefined values on the partial', () => {
    const out = withMemberCardCoverDefaults({ palette: undefined, pattern: 'endless-clouds' })
    expect(out).toEqual({
      palette: 'green',
      pattern: 'endless-clouds'
    })
  })

  test('withMemberCardCoverDefaults can override every field at once', () => {
    const out = withMemberCardCoverDefaults({
      palette: 'red',
      pattern: 'endless-clouds'
    })
    expect(out).toEqual({
      palette: 'red',
      pattern: 'endless-clouds'
    })
  })

  test('withMemberCardCoverDefaults does not mutate the defaults object', () => {
    const before = { ...MEMBER_CARD_COVER_DEFAULTS }
    withMemberCardCoverDefaults({ palette: 'red' })
    expect(MEMBER_CARD_COVER_DEFAULTS).toEqual(before)
  })
})
