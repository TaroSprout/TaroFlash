import { describe, test, expect } from 'vite-plus/test'
import { coverBindings, COVER_PATTERNS, BORDER_SIZE_PX } from '@/utils/cover'

describe('coverBindings', () => {
  test('returns empty bindings when called with no argument', () => {
    expect(coverBindings()).toEqual({
      'data-theme': undefined,
      'data-theme-dark': undefined,
      class: [],
      style: {}
    })
  })

  test('falls back to fallbackTheme when config has no theme', () => {
    const result = coverBindings({}, { fallbackTheme: 'blue-500' })
    expect(result['data-theme']).toBe('blue-500')
  })

  test('uses config theme over fallbackTheme', () => {
    const result = coverBindings({ theme: 'pink-400' }, { fallbackTheme: 'blue-500' })
    expect(result['data-theme']).toBe('pink-400')
  })

  test('forwards theme_dark to data-theme-dark when set', () => {
    const result = coverBindings({ theme: 'pink-400', theme_dark: 'pink-700' })
    expect(result['data-theme-dark']).toBe('pink-700')
  })

  test('omits data-theme-dark (undefined) when theme_dark is unset', () => {
    const result = coverBindings({ theme: 'pink-400' })
    expect(result['data-theme-dark']).toBeUndefined()
  })

  test('does not fall back fallbackTheme into data-theme-dark', () => {
    const result = coverBindings({}, { fallbackTheme: 'blue-500' })
    expect(result['data-theme-dark']).toBeUndefined()
  })

  test('emits the pattern-mask class when pattern is set', () => {
    const result = coverBindings({ pattern: 'wave' })
    expect(result.class).toContain('pattern-mask')
  })

  test('points --bgx-image at the pattern var when pattern is set', () => {
    const result = coverBindings({ pattern: 'wave' })
    expect(result.style['--bgx-image']).toBe('var(--bgx-wave)')
  })

  test('sets --bgx-fill and per-mode --bgx-opacity-* when pattern is set', () => {
    const result = coverBindings({ pattern: 'aztec' })
    expect(result.style['--bgx-fill']).toBe('var(--theme-neutral)')
    expect(result.style['--bgx-opacity-light']).toBe(COVER_PATTERNS.aztec.opacity)
    expect(result.style['--bgx-opacity-dark']).toBe(COVER_PATTERNS.aztec.opacityDark)
  })

  test('sets --bgx-size from COVER_PATTERNS[pattern].size when pattern is set', () => {
    const result = coverBindings({ pattern: 'saw' })
    expect(result.style['--bgx-size']).toBe(COVER_PATTERNS.saw.size)
  })

  test('options.patternSize overrides the per-pattern default', () => {
    const result = coverBindings({ pattern: 'wave' }, { patternSize: '20px' })
    expect(result.style['--bgx-size']).toBe('20px')
  })

  test('omits pattern bindings when no pattern is set', () => {
    const result = coverBindings({})
    expect(result.class).toEqual([])
    expect(result.style['--bgx-size']).toBeUndefined()
    expect(result.style['--bgx-fill']).toBeUndefined()
    expect(result.style['--bgx-opacity-light']).toBeUndefined()
  })

  test('omits pattern bindings when pattern option is disabled', () => {
    const result = coverBindings({ pattern: 'wave' }, { pattern: false })
    expect(result.class).toEqual([])
    expect(result.style['--bgx-fill']).toBeUndefined()
    expect(result.style['--bgx-opacity-light']).toBeUndefined()
    expect(result.style['--bgx-size']).toBeUndefined()
  })

  test('options.patternOpacity overrides both modes', () => {
    const result = coverBindings({ pattern: 'aztec' }, { patternOpacity: '0.5' })
    expect(result.style['--bgx-opacity-light']).toBe('0.5')
    expect(result.style['--bgx-opacity-dark']).toBe('0.5')
  })

  test('options.patternOpacityDark overrides only the dark mode', () => {
    const result = coverBindings(
      { pattern: 'aztec' },
      { patternOpacity: '0.5', patternOpacityDark: '0.2' }
    )
    expect(result.style['--bgx-opacity-light']).toBe('0.5')
    expect(result.style['--bgx-opacity-dark']).toBe('0.2')
  })

  test('falls back to COVER_PATTERNS[pattern] opacities when no override is given', () => {
    const result = coverBindings({ pattern: 'wave' })
    expect(result.style['--bgx-opacity-light']).toBe(COVER_PATTERNS.wave.opacity)
    expect(result.style['--bgx-opacity-dark']).toBe(COVER_PATTERNS.wave.opacityDark)
  })

  test('emits themed border style at the static BORDER_SIZE_PX when config is provided', () => {
    const result = coverBindings({ theme: 'green-400' })
    expect(result.style.border).toBe(`${BORDER_SIZE_PX}px solid var(--theme-primary)`)
  })

  test('omits border style when config is omitted', () => {
    expect(coverBindings().style.border).toBeUndefined()
  })

  test('omits border style when border option is disabled', () => {
    const result = coverBindings({ theme: 'green-400' }, { border: false })
    expect(result.style.border).toBeUndefined()
  })

  test('combines all bindings for a fully configured cover', () => {
    const result = coverBindings({
      theme: 'purple-500',
      theme_dark: 'purple-700',
      pattern: 'aztec'
    })

    expect(result['data-theme']).toBe('purple-500')
    expect(result['data-theme-dark']).toBe('purple-700')
    expect(result.class).toEqual(['pattern-mask'])
    expect(result.style['--bgx-size']).toBe(COVER_PATTERNS.aztec.size)
    expect(result.style['--bgx-opacity-light']).toBe(COVER_PATTERNS.aztec.opacity)
    expect(result.style['--bgx-opacity-dark']).toBe(COVER_PATTERNS.aztec.opacityDark)
    expect(result.style['--bgx-fill']).toBe('var(--theme-neutral)')
    expect(result.style.border).toBe(`${BORDER_SIZE_PX}px solid var(--theme-primary)`)
  })
})
