import { describe, test, expect } from 'vite-plus/test'
import { memberCoverBindings } from '@/components/member/cover'
import { MEMBER_CARD_COVER_DEFAULTS } from '@/utils/member/defaults'

describe('memberCoverBindings', () => {
  test('always passes border: false — border is never rendered [obligation]', () => {
    const result = memberCoverBindings({ theme: 'green-500', pattern: 'wave' })
    expect(result.style.border).toBeUndefined()
  })

  test('uses MEMBER_CARD_COVER_DEFAULTS when cover is omitted [obligation]', () => {
    const result = memberCoverBindings()
    expect(result['data-theme']).toBe(MEMBER_CARD_COVER_DEFAULTS.theme)
    expect(result['data-theme-dark']).toBe(MEMBER_CARD_COVER_DEFAULTS.theme_dark)
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

  test('forwards cover theme to data-theme', () => {
    const result = memberCoverBindings({ theme: 'blue-700', pattern: 'aztec' })
    expect(result['data-theme']).toBe('blue-700')
  })

  test('forwards cover theme_dark to data-theme-dark', () => {
    const result = memberCoverBindings({ theme: 'red-500', theme_dark: 'red-900', pattern: 'saw' })
    expect(result['data-theme-dark']).toBe('red-900')
  })

  test('merges a supplied cover over defaults — partial cover overrides only named keys', () => {
    const result = memberCoverBindings({ theme: 'purple-500' })
    expect(result['data-theme']).toBe('purple-500')
    // pattern defaults to MEMBER_CARD_COVER_DEFAULTS.pattern
    expect(result.class).toContain('pattern-mask')
  })

  test('emits pattern bindings from the cover config', () => {
    const result = memberCoverBindings({ theme: 'teal-400', pattern: 'wave' })
    expect(result.class).toContain('pattern-mask')
    expect(result.style['--bgx-image']).toBe('var(--bgx-wave)')
    expect(result.style['--bgx-fill']).toBe('var(--theme-neutral)')
  })
})
