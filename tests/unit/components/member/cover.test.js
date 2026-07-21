import { describe, test, expect } from 'vite-plus/test'
import { memberCoverBindings } from '@/components/member/cover'
import { MEMBER_CARD_COVER_DEFAULTS } from '@/utils/member/defaults'

describe('memberCoverBindings', () => {
  test('always passes border: false — border is never rendered [obligation]', () => {
    const result = memberCoverBindings({ palette: 'green', pattern: 'wave' })
    expect(result.style.border).toBeUndefined()
  })

  test('uses MEMBER_CARD_COVER_DEFAULTS when cover is omitted [obligation]', () => {
    const result = memberCoverBindings()
    expect(result['data-palette']).toBe(MEMBER_CARD_COVER_DEFAULTS.palette)
    expect(result.class).toContain('pattern-mask')
  })

  test('merges caller overrides — patternOpacity override applies to both modes [obligation]', () => {
    const result = memberCoverBindings(undefined, { patternOpacity: '0.42' })
    expect(result.style['--bgx-opacity-light']).toBe('0.42')
    expect(result.style['--bgx-opacity-dark']).toBe('0.42')
  })

  test('merges caller overrides — patternOpacityDark overrides only dark mode [obligation]', () => {
    const result = memberCoverBindings(undefined, {
      patternOpacity: '0.42',
      patternOpacityDark: '0.12'
    })
    expect(result.style['--bgx-opacity-light']).toBe('0.42')
    expect(result.style['--bgx-opacity-dark']).toBe('0.12')
  })

  test('merges caller overrides — patternSize override is applied [obligation]', () => {
    const result = memberCoverBindings(undefined, { patternSize: '64px' })
    expect(result.style['--bgx-size']).toBe('64px')
  })

  test('forwards cover palette to data-palette', () => {
    const result = memberCoverBindings({ palette: 'blue', pattern: 'aztec' })
    expect(result['data-palette']).toBe('blue')
  })

  test('merges a supplied cover over defaults — partial cover overrides only named keys', () => {
    const result = memberCoverBindings({ palette: 'purple' })
    expect(result['data-palette']).toBe('purple')
    // pattern defaults to MEMBER_CARD_COVER_DEFAULTS.pattern
    expect(result.class).toContain('pattern-mask')
  })

  test('emits pattern bindings from the cover config', () => {
    const result = memberCoverBindings({ palette: 'teal', pattern: 'wave' })
    expect(result.class).toContain('pattern-mask')
    expect(result.style['--bgx-image']).toBe('var(--bgx-wave)')
  })
})
