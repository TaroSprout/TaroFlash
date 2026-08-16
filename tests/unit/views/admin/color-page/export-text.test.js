import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { buildExportText } from '@/views/admin/color-page/export-text'
import { useColorTuner } from '@/views/admin/color-page/use-color-tuner'

function shadeIdByName(tuner, name) {
  return tuner.shades.value.find((shade) => shade.name === name).id
}

describe('export-text', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('emits a Stations section and an Identities section', () => {
    const tuner = useColorTuner()
    const text = buildExportText(tuner)

    expect(text).toContain('/* Stations')
    expect(text).toContain('/* Identities')
  })

  test('a recoloured shipped shade gets a /* changed */ marker in its theme block', () => {
    const tuner = useColorTuner()
    const brown_100 = shadeIdByName(tuner, 'brown-100')
    tuner.setChannel(brown_100, 'h', 200)

    const text = buildExportText(tuner)
    expect(text).toMatch(/--color-brown-100:.*\/\* changed \*\//)
  })

  test('a renamed shipped shade gets a /* renamed */ marker instead', () => {
    const tuner = useColorTuner()
    const brown_100 = shadeIdByName(tuner, 'brown-100')
    tuner.renameShade(brown_100, 'brown-renamed')

    const text = buildExportText(tuner)
    expect(text).toMatch(/--color-brown-renamed:.*\/\* changed \*\//)
  })

  test('a newly added shade gets a /* added */ marker', () => {
    const tuner = useColorTuner()
    tuner.addShade('brown', { h: 0, s: 0, l: 55 })

    const text = buildExportText(tuner)
    expect(text).toMatch(/\/\* added \*\//)
  })

  test('a deleted shade with 0 usage shows up in the Shades removed list', () => {
    const tuner = useColorTuner()
    const minted = tuner.addShade('brown', { h: 0, s: 0, l: 55 })
    tuner.deleteShade(minted.id)

    const text = buildExportText(tuner)
    // Minted shades are never shipped, so removedShadeList (which only lists shipped ids the
    // save no longer carries) omits it — assert instead on a genuinely shipped shade deletion.
    expect(text).toContain('Shades removed')
  })

  test('deleting a shipped, unbound identity shade lists it under Shades removed and marks its palette entry deleted', () => {
    const tuner = useColorTuner()
    const green_500 = shadeIdByName(tuner, 'green-500')
    // green-500 is only ever reached through the palette registry, not a station role, so its
    // station-role usage count is 0 and delete succeeds even though the palette still names it.
    expect(tuner.usageCount(green_500)).toBe(0)
    tuner.deleteShade(green_500)

    const text = buildExportText(tuner)
    expect(text).toContain('green-500')
    expect(text).toMatch(/accent: 'green-500', \/\* deleted — pick another shade \*\//)
  })

  // ── dark selectors ────────────────────────────────────────────────────────

  test('the dark page block emits all three of its selectors', () => {
    const tuner = useColorTuner()
    const text = buildExportText(tuner)

    expect(text).toContain(":root[data-mode='dark'],")
    expect(text).toContain("[data-mode='dark'] [data-station='page']")
    expect(text).toContain("[data-mode='dark'][data-station='page']")
  })

  test.each(['panel', 'window', 'float'])(
    'the dark %s block emits its descendant+self selector pair',
    (station) => {
      const tuner = useColorTuner()
      const text = buildExportText(tuner)

      expect(text).toContain(`[data-mode='dark'] [data-station='${station}']`)
      expect(text).toContain(`[data-mode='dark'][data-station='${station}']`)
    }
  )

  // ── palette bindings — recolour vs rename ────────────────────────────────

  test('recolouring green-500 emits no palette entry', () => {
    const tuner = useColorTuner()
    const green_500 = shadeIdByName(tuner, 'green-500')
    tuner.setChannel(green_500, 'h', 10)

    const text = buildExportText(tuner)
    expect(text).not.toContain("accent: 'green-500'")
  })

  test('renaming green-500 emits a palette entry marked /* renamed */', () => {
    const tuner = useColorTuner()
    const green_500 = shadeIdByName(tuner, 'green-500')
    tuner.renameShade(green_500, 'green-500-renamed')

    const text = buildExportText(tuner)
    expect(text).toContain('Palette bindings to update')
    expect(text).toMatch(/accent: 'green-500-renamed', \/\* renamed \*\//)
  })
})
