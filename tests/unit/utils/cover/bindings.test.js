import { describe, test, expect } from 'vite-plus/test'
import { coverBindings, COVER_PATTERNS, BORDER_SIZE_PX } from '@/utils/cover'

describe('coverBindings', () => {
  test('returns empty bindings when called with no argument', () => {
    expect(coverBindings()).toEqual({
      'data-palette': undefined,
      class: [],
      style: {}
    })
  })

  test('falls back to fallbackPalette when config has no palette', () => {
    const result = coverBindings({}, { fallbackPalette: 'blue' })
    expect(result['data-palette']).toBe('blue')
  })

  test('uses config palette over fallbackPalette', () => {
    const result = coverBindings({ palette: 'pink' }, { fallbackPalette: 'blue' })
    expect(result['data-palette']).toBe('pink')
  })

  test('emits the pattern-mask class when pattern is set', () => {
    const result = coverBindings({ pattern: 'wave' })
    expect(result.class).toContain('pattern-mask')
  })

  test('points --bgx-image at the pattern var when pattern is set', () => {
    const result = coverBindings({ pattern: 'wave' })
    expect(result.style['--bgx-image']).toBe('var(--bgx-wave)')
  })

  test('sets no --bgx-fill and per-mode --bgx-opacity-* when pattern is set', () => {
    const result = coverBindings({ pattern: 'aztec' })
    expect(result.style['--bgx-fill']).toBeUndefined()
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
    expect(result.style['--bgx-opacity-light']).toBeUndefined()
  })

  test('omits pattern bindings when pattern option is disabled', () => {
    const result = coverBindings({ pattern: 'wave' }, { pattern: false })
    expect(result.class).toEqual([])
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
    const result = coverBindings({ palette: 'green' })
    expect(result.style.border).toBe(`${BORDER_SIZE_PX}px solid var(--color-accent)`)
  })

  test('omits border style when config is omitted', () => {
    expect(coverBindings().style.border).toBeUndefined()
  })

  test('omits border style when border option is disabled', () => {
    const result = coverBindings({ palette: 'green' }, { border: false })
    expect(result.style.border).toBeUndefined()
  })

  test('combines all bindings for a fully configured cover', () => {
    const result = coverBindings({
      palette: 'purple',
      pattern: 'aztec'
    })

    expect(result['data-palette']).toBe('purple')
    expect(result.class).toEqual(['pattern-mask'])
    expect(result.style['--bgx-size']).toBe(COVER_PATTERNS.aztec.size)
    expect(result.style['--bgx-opacity-light']).toBe(COVER_PATTERNS.aztec.opacity)
    expect(result.style['--bgx-opacity-dark']).toBe(COVER_PATTERNS.aztec.opacityDark)
    expect(result.style['--bgx-fill']).toBeUndefined()
    expect(result.style.border).toBe(`${BORDER_SIZE_PX}px solid var(--color-accent)`)
  })
})
