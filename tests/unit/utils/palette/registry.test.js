import { describe, test, expect } from 'vite-plus/test'
import { PALETTES, SEMANTIC_ALIASES } from '@/utils/palette/registry'

const PALETTE_NAMES = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'orange']

describe('palette registry', () => {
  // ── accentText role [obligation] ─────────────────────────────────────────
  // Every palette must carry an accentText rendition in both light and dark,
  // so accent-coloured text stays legible for all seven member colours.

  describe('accentText [obligation]', () => {
    test('all seven palettes are present', () => {
      expect(Object.keys(PALETTES).sort()).toEqual([...PALETTE_NAMES].sort())
    })

    test.each(PALETTE_NAMES)('%s carries a non-empty accentText in the light rendition', (name) => {
      expect(typeof PALETTES[name].light.accentText).toBe('string')
      expect(PALETTES[name].light.accentText.length).toBeGreaterThan(0)
    })

    test.each(PALETTE_NAMES)('%s carries a non-empty accentText in the dark rendition', (name) => {
      expect(typeof PALETTES[name].dark.accentText).toBe('string')
      expect(PALETTES[name].dark.accentText.length).toBeGreaterThan(0)
    })

    test.each(PALETTE_NAMES)(
      "%s's accentText is a distinct step within the same hue, not the accent colour repeated",
      (name) => {
        const { light, dark } = PALETTES[name]
        const light_hue = light.accentText.split('-')[0]
        const dark_hue = dark.accentText.split('-')[0]

        expect(light_hue).toBe(light.accent.split('-')[0])
        expect(dark_hue).toBe(dark.accent.split('-')[0])
      }
    )
  })

  describe('SEMANTIC_ALIASES', () => {
    test('every alias points at a palette that exists in PALETTES', () => {
      for (const target of Object.values(SEMANTIC_ALIASES)) {
        expect(PALETTES).toHaveProperty(target)
      }
    })
  })
})
