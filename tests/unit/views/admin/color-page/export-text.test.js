import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { buildExportText } from '@/views/admin/color-page/export-text'
import { useColorTuner } from '@/views/admin/color-page/use-color-tuner'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('buildExportText — untouched shade [obligation]', () => {
  test('an untouched shade exports at its shipped hex, unmarked', () => {
    const tuner = useColorTuner()
    const text = buildExportText(tuner)

    expect(text).toContain('--color-white: #ffffff;')
    expect(text).not.toMatch(/--color-white: #ffffff;\s*\/\* changed \*\//)
  })
})

describe('buildExportText — changed section [obligation]', () => {
  test('a recoloured shade is marked with a /* changed */ note', () => {
    const tuner = useColorTuner()
    tuner.recolorShade('brown-100', { h: 10, s: 10, l: 10 })

    const text = buildExportText(tuner)

    expect(text).toMatch(/--color-brown-100: #[0-9a-f]{6};\s*\/\* changed \*\//)
  })

  test('lists the recoloured shade under "Shades recoloured or renamed"', () => {
    const tuner = useColorTuner()
    tuner.recolorShade('brown-100', { h: 10, s: 10, l: 10 })

    const text = buildExportText(tuner)
    const section = text.split('/* Shades recoloured or renamed */')[1].split('/*')[0]

    expect(section).toContain('brown-100')
  })
})

describe('buildExportText — added section [obligation]', () => {
  test('a newly added shade is marked "added" and listed under "Shades added"', () => {
    const tuner = useColorTuner()
    const shade = tuner.addShade('brown', { h: 5, s: 5, l: 5 })

    const text = buildExportText(tuner)

    expect(text).toMatch(new RegExp(`--color-${shade.name}: #[0-9a-f]{6};\\s*/\\* added \\*/`))

    const section = text.split('/* Shades added */')[1].split('/*')[0]
    expect(section).toContain(shade.name)
  })
})

describe('buildExportText — removed section [obligation]', () => {
  test('a deleted (unused) shade is listed under "Shades removed"', () => {
    const tuner = useColorTuner()
    const shade = tuner.addShade('brown', { h: 5, s: 5, l: 5 })
    tuner.deleteShade(shade.id)

    const text = buildExportText(tuner)
    expect(text).toContain('/* Shades removed */')
    expect(text).toContain('(none)')
  })

  test('a shipped shade removed from the live set is listed with its shipped hex', () => {
    const tuner = useColorTuner()
    // brown-450 ships unused by any role/backdrop today.
    expect(tuner.usageCount('brown-450')).toBe(0)
    tuner.deleteShade('brown-450')

    const text = buildExportText(tuner)
    const section = text.split('/* Shades removed */')[1].split('/*')[0]

    expect(section).toContain('brown-450')
    expect(section).toContain('#cfbeb0')
  })
})

describe('buildExportText — families ordered lightest to darkest [obligation]', () => {
  test('shades within a family list from lightest to darkest', () => {
    const tuner = useColorTuner()
    const text = buildExportText(tuner)
    const shade_block = text.split('@theme {')[1].split('}')[0]
    const brown_lines = shade_block
      .split('\n')
      .filter((line) => /--color-brown-\d+:/.test(line))
      .map((line) => Number(line.match(/--color-brown-(\d+):/)[1]))

    const sorted = [...brown_lines].sort((a, b) => a - b)
    expect(brown_lines).toEqual(sorted)
  })
})

describe('buildExportText — element bindings changed', () => {
  test('a re-pointed fill lists the element under "Preview bindings changed"', () => {
    const tuner = useColorTuner()
    tuner.setElementBg('canvas', 'raised')

    const text = buildExportText(tuner)
    const section = text.split('/* Preview bindings changed */')[1]

    expect(section).toContain('canvas fill: surface -> raised')
  })

  test('a fill cleared to none renders the "none" label', () => {
    const tuner = useColorTuner()
    tuner.setElementBg('canvas', null)

    const text = buildExportText(tuner)
    const section = text.split('/* Preview bindings changed */')[1]

    expect(section).toContain('canvas fill: surface -> none')
  })

  test('a re-pointed text role lists the element too', () => {
    const tuner = useColorTuner()
    tuner.setElementText('title', 'ink-muted')

    const text = buildExportText(tuner)
    const section = text.split('/* Preview bindings changed */')[1]

    expect(section).toContain('title text: ink -> ink-muted')
  })

  test('no bindings changed renders "(none)"', () => {
    const tuner = useColorTuner()
    const text = buildExportText(tuner)
    const section = text.split('/* Preview bindings changed */')[1]

    expect(section).toContain('(none)')
  })
})
