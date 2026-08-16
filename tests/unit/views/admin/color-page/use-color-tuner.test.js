import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { useColorTuner } from '@/views/admin/color-page/use-color-tuner'
import { NEUTRAL_FAMILIES, ACCENT_FAMILIES } from '@/views/admin/color-page/catalog'

describe('useColorTuner', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── family_names ──────────────────────────────────────────────────────────

  test('family_names lists every neutral family before every identity family', () => {
    const tuner = useColorTuner()
    const names = tuner.family_names.value

    const last_neutral_index = Math.max(...NEUTRAL_FAMILIES.map((f) => names.indexOf(f)))
    const first_accent_index = Math.min(...ACCENT_FAMILIES.map((f) => names.indexOf(f)))

    expect(last_neutral_index).toBeLessThan(first_accent_index)
  })

  test('family_names does not reorder a family when one of its shades is recoloured', () => {
    const tuner = useColorTuner()
    const before = tuner.family_names.value

    const blue_shade = tuner.shades.value.find((shade) => shade.family === 'blue')
    tuner.setChannel(blue_shade.id, 'h', 10)

    expect(tuner.family_names.value).toEqual(before)
  })

  // ── neutral_shades ────────────────────────────────────────────────────────

  test('neutral_shades excludes every identity family shade, e.g. red-500', () => {
    const tuner = useColorTuner()
    const names = tuner.neutral_shades.value.map((shade) => shade.name)

    expect(names).not.toContain('red-500')
  })

  test('neutral_shades includes a neutral shade, e.g. brown-700', () => {
    const tuner = useColorTuner()
    const names = tuner.neutral_shades.value.map((shade) => shade.name)

    expect(names).toContain('brown-700')
  })

  // ── run grouping ──────────────────────────────────────────────────────────

  test('a stream of setChannel calls on the same shade banks as one undo step once quiet', () => {
    vi.useFakeTimers()
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    const original_h = shade.hsl.h
    const before = tuner.undo_label.value

    tuner.setChannel(shade.id, 'h', 10)
    tuner.setChannel(shade.id, 'h', 20)
    tuner.setChannel(shade.id, 'h', 30)

    vi.advanceTimersByTime(600)

    // Reading past.length indirectly via undo(): one undo call must fully revert the whole stream.
    expect(tuner.undo_label.value).not.toBe(before)
    tuner.undo()
    expect(tuner.shadeOf(shade.id).hsl.h).toBe(original_h)
    expect(tuner.undo_label.value).toBe(before)
  })

  // ── mintBeyond ────────────────────────────────────────────────────────────

  test('mintBeyond mints a shade and rebinds the role, undone together as one step', () => {
    const tuner = useColorTuner()
    const before_role = tuner.roleId('dark', 'panel', 'line')
    const before_count = tuner.shades.value.length

    // dark/panel/line -> black, the last shade in the 2-member `base` family (white, black), so
    // stepping darker has nowhere to land and mints instead.
    tuner.mintBeyond('dark', 'panel', 'line', 1)

    expect(tuner.shades.value.length).toBe(before_count + 1)
    const minted_id = tuner.roleId('dark', 'panel', 'line')
    expect(minted_id).not.toBe(before_role)

    tuner.undo()

    expect(tuner.roleId('dark', 'panel', 'line')).toBe(before_role)
    expect(tuner.shades.value.length).toBe(before_count)
  })

  // ── setHex ────────────────────────────────────────────────────────────────

  test('a stream of setHex calls folds into one undo entry', () => {
    vi.useFakeTimers()
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    const before = tuner.undo_label.value

    tuner.setHex(shade.id, '#123456')
    tuner.setHex(shade.id, '#654321')
    vi.advanceTimersByTime(600)

    expect(tuner.undo_label.value).not.toBe(before)
    tuner.undo()
    expect(tuner.undo_label.value).toBe(before)
  })

  // ── deleteShade ───────────────────────────────────────────────────────────

  test('deleteShade refuses when usage count is greater than 0', () => {
    const tuner = useColorTuner()
    const shade_id = tuner.roleId('light', 'page', 'surface')
    const before_count = tuner.shades.value.length

    tuner.deleteShade(shade_id)

    expect(tuner.shades.value.length).toBe(before_count)
    expect(tuner.shadeOf(shade_id)).not.toBeNull()
  })

  test('deleteShade succeeds once usage count is 0', () => {
    const tuner = useColorTuner()
    const minted = tuner.addShade('brown', { h: 0, s: 0, l: 50 })
    expect(tuner.usageCount(minted.id)).toBe(0)

    tuner.deleteShade(minted.id)

    expect(tuner.shadeOf(minted.id)).toBeNull()
  })

  // ── usageCount ────────────────────────────────────────────────────────────

  test('usageCount counts every station/mode slot, not just what is on screen', () => {
    const tuner = useColorTuner()
    const shade_id = tuner.roleId('light', 'page', 'surface')

    const before = tuner.usageCount(shade_id)
    // Bind the same shade into a slot far from the one already counted — a dark-mode, different
    // station, different role — to prove usage tallies across the whole matrix.
    tuner.setRole('dark', 'float', 'ink-muted', shade_id)

    expect(tuner.usageCount(shade_id)).toBe(before + 1)
  })

  // ── readRole ──────────────────────────────────────────────────────────────

  test('readRole flags line when its contrast against surface drops below the 3:1 floor', () => {
    const tuner = useColorTuner()
    const line_id = tuner.roleId('light', 'page', 'line')
    const surface_id = tuner.roleId('light', 'page', 'surface')

    // Recolour the line shade to match the surface shade exactly — contrast ratio collapses to 1.
    const surface_hsl = tuner.shadeOf(surface_id).hsl
    tuner.setChannel(line_id, 'h', surface_hsl.h)
    tuner.setChannel(line_id, 's', surface_hsl.s)
    tuner.setChannel(line_id, 'l', surface_hsl.l)

    const reading = tuner.readRole('light', 'page', 'line')
    expect(reading.ratio).toBeLessThan(3)
    expect(reading.flagged).toBe(true)
  })

  test('readRole reports no ground for the page station surface role', () => {
    const tuner = useColorTuner()
    const reading = tuner.readRole('light', 'page', 'surface')

    expect(reading.ground).toBeNull()
    expect(reading.ratio).toBeNull()
    expect(reading.flagged).toBe(false)
  })

  test('readRole reports a ground for a non-page station surface role', () => {
    const tuner = useColorTuner()
    const reading = tuner.readRole('light', 'panel', 'surface')

    expect(reading.ground).not.toBeNull()
  })

  // ── redo ──────────────────────────────────────────────────────────────────

  test('redo replays an undone change and clears once nothing is left to redo', () => {
    const tuner = useColorTuner()
    expect(tuner.redo_label.value).toBeNull()

    tuner.resetAll()
    tuner.undo()
    expect(tuner.redo_label.value).not.toBeNull()

    tuner.redo()
    expect(tuner.redo_label.value).toBeNull()
  })

  test('redo is a no-op with nothing to redo', () => {
    const tuner = useColorTuner()
    const before = tuner.shades.value
    tuner.redo()
    expect(tuner.shades.value).toBe(before)
  })

  test('undo is a no-op with nothing to undo', () => {
    const tuner = useColorTuner()
    const before = tuner.shades.value
    tuner.undo()
    expect(tuner.shades.value).toBe(before)
  })

  // ── nudgeRole ─────────────────────────────────────────────────────────────

  test('nudgeRole points a role at the neighbouring shade in its own family', () => {
    const tuner = useColorTuner()
    const before = tuner.roleId('light', 'page', 'ink')
    tuner.nudgeRole('light', 'page', 'ink', -1)

    expect(tuner.roleId('light', 'page', 'ink')).not.toBe(before)
  })

  test('nudgeRole is a no-op at the end of a family (no neighbour to point at)', () => {
    const tuner = useColorTuner()
    const before = tuner.roleId('dark', 'panel', 'line') // -> black, last of the base family
    tuner.nudgeRole('dark', 'panel', 'line', 1)

    expect(tuner.roleId('dark', 'panel', 'line')).toBe(before)
  })

  // ── setChannel / setHex guard against an unknown id ──────────────────────

  test('setChannel is a no-op for an id with no shade', () => {
    const tuner = useColorTuner()
    const before = tuner.shades.value
    tuner.setChannel('not-a-real-id', 'h', 10)
    expect(tuner.shades.value).toBe(before)
  })

  test('setHex is a no-op for an id with no shade', () => {
    const tuner = useColorTuner()
    const before = tuner.shades.value
    tuner.setHex('not-a-real-id', '#123456')
    expect(tuner.shades.value).toBe(before)
  })

  // ── renameShade ───────────────────────────────────────────────────────────

  test('renameShade renames and returns true', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    expect(tuner.renameShade(shade.id, 'brand-new-name')).toBe(true)
    expect(tuner.shadeOf(shade.id).name).toBe('brand-new-name')
  })

  test('renameShade refuses an empty name and returns false', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    expect(tuner.renameShade(shade.id, '   ')).toBe(false)
    expect(tuner.shadeOf(shade.id).name).toBe(shade.name)
  })

  test('renameShade refuses a name already taken by another shade', () => {
    const tuner = useColorTuner()
    const [first, second] = tuner.shades.value
    expect(tuner.renameShade(second.id, first.name)).toBe(false)
  })

  test('renameShade is a silent no-op success when the new name equals the current one', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    const before_undo_label = tuner.undo_label.value

    expect(tuner.renameShade(shade.id, shade.name)).toBe(true)
    expect(tuner.undo_label.value).toBe(before_undo_label)
  })

  test('isNameTaken is false against the shade own current name', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    expect(tuner.isNameTaken(shade.name, shade.id)).toBe(false)
  })

  // ── addShade / freeName ───────────────────────────────────────────────────

  test('addShade mints a fresh name that increments past a collision', () => {
    const tuner = useColorTuner()
    const first = tuner.addShade('brown', { h: 0, s: 0, l: 60 })
    const second = tuner.addShade('brown', { h: 0, s: 0, l: 61 })

    expect(first.name).toBe('brown-new-1')
    expect(second.name).toBe('brown-new-2')
  })

  // ── reset ─────────────────────────────────────────────────────────────────

  test('canResetShade is false for a shade that already matches its shipped value', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    expect(tuner.canResetShade(shade)).toBe(false)
  })

  test('canResetShade is true once a shipped shade has been recoloured, and resetShade reverts it', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value[0]
    tuner.setChannel(shade.id, 'h', 123)

    expect(tuner.canResetShade(tuner.shadeOf(shade.id))).toBe(true)

    tuner.resetShade(shade.id)
    expect(tuner.shadeOf(shade.id).hsl).toEqual(shade.hsl)
  })

  test('resetShade is a no-op for a minted shade with nothing shipped to revert to', () => {
    const tuner = useColorTuner()
    const minted = tuner.addShade('brown', { h: 10, s: 10, l: 10 })
    tuner.resetShade(minted.id)
    expect(tuner.shadeOf(minted.id).hsl).toEqual({ h: 10, s: 10, l: 10 })
  })

  test('shippedHexOf returns null for a minted shade', () => {
    const tuner = useColorTuner()
    const minted = tuner.addShade('brown', { h: 10, s: 10, l: 10 })
    expect(tuner.shippedHexOf(minted)).toBeNull()
  })

  // ── exportHex ─────────────────────────────────────────────────────────────

  test('exportHex returns the shipped spelling for an untouched shade', () => {
    const tuner = useColorTuner()
    const white = tuner.shades.value.find((shade) => shade.name === 'white')
    expect(tuner.exportHex(white)).toBe('#ffffff')
  })

  test('exportHex derives the hex from HSL once a shade has been recoloured', () => {
    const tuner = useColorTuner()
    const shade = tuner.shades.value.find((shade) => shade.name === 'white')
    tuner.setChannel(shade.id, 'l', 50)
    expect(tuner.exportHex(tuner.shadeOf(shade.id))).not.toBe('#ffffff')
  })

  // ── resetAll ──────────────────────────────────────────────────────────────

  test('resetAll restores the default state after a change', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'surface', null)
    expect(tuner.roleId('light', 'page', 'surface')).toBeNull()

    tuner.resetAll()
    expect(tuner.roleId('light', 'page', 'surface')).not.toBeNull()
  })

  // ── hexOf / groundShade / paintShade / roleStatus ────────────────────────

  test('hexOf returns null for a null shade', () => {
    const tuner = useColorTuner()
    expect(tuner.hexOf(null)).toBeNull()
  })

  test('paintShade falls back to the station surface when the role itself is unanswered', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'ink', null)
    const surface_id = tuner.roleId('light', 'page', 'surface')

    expect(tuner.paintShade('light', 'page', 'ink').id).toBe(surface_id)
  })

  test('roleStatus reads shipped for an unmodified role and changed after a rebind', () => {
    const tuner = useColorTuner()
    expect(tuner.roleStatus('light', 'page', 'surface')).toBe('shipped')

    tuner.setRole('light', 'page', 'surface', tuner.roleId('light', 'page', 'well'))
    expect(tuner.roleStatus('light', 'page', 'surface')).toBe('changed')
  })

  test('roleStatus reads unanswered once a role binding is cleared', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'surface', null)
    expect(tuner.roleStatus('light', 'page', 'surface')).toBe('unanswered')
  })
})
