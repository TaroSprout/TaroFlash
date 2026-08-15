import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import {
  useColorTuner,
  injectColorTuner,
  colorTunerKey
} from '@/views/admin/color-page/use-color-tuner'
import { createApp, h, provide } from 'vue'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useColorTuner — stepRole [obligation]', () => {
  test('steps to the next darker shade within the same family', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'ink', 'brown-500')

    tuner.stepRole('light', 'page', 'ink', 1)

    const shade = tuner.shadeOf(tuner.roleId('light', 'page', 'ink'))
    expect(shade.family).toBe('brown')
    expect(shade.id).not.toBe('brown-500')
  })

  test('clamps at the darkest end of the family and does not cross into another family', () => {
    const tuner = useColorTuner()
    const brown_family = tuner.families.value.get('brown')
    const darkest = brown_family[brown_family.length - 1]

    tuner.setRole('light', 'page', 'ink', darkest.id)
    tuner.stepRole('light', 'page', 'ink', 1)

    expect(tuner.roleId('light', 'page', 'ink')).toBe(darkest.id)
  })

  test('clamps at the lightest end of the family', () => {
    const tuner = useColorTuner()
    const brown_family = tuner.families.value.get('brown')
    const lightest = brown_family[0]

    tuner.setRole('light', 'page', 'ink', lightest.id)
    tuner.stepRole('light', 'page', 'ink', -1)

    expect(tuner.roleId('light', 'page', 'ink')).toBe(lightest.id)
  })

  test('never crosses into a neighbouring family', () => {
    const tuner = useColorTuner()
    const brown_family = tuner.families.value.get('brown')
    const darkest = brown_family[brown_family.length - 1]

    tuner.setRole('light', 'page', 'ink', darkest.id)
    tuner.stepRole('light', 'page', 'ink', 1)

    const shade = tuner.shadeOf(tuner.roleId('light', 'page', 'ink'))
    expect(shade.family).toBe('brown')
  })
})

describe('useColorTuner — readRole [obligation]', () => {
  test('flags a role whose ratio falls below its floor', () => {
    const tuner = useColorTuner()
    // ink floors at 4.5:1 against surface; point both ink and surface at near-identical shades.
    tuner.setRole('light', 'page', 'surface', 'brown-100')
    tuner.setRole('light', 'page', 'ink', 'brown-200')

    const reading = tuner.readRole('light', 'page', 'ink')
    expect(reading.floor).toBe(4.5)
    expect(reading.flagged).toBe(true)
  })

  test('leaves an unfloored role unflagged regardless of its ratio', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'surface', 'brown-100')
    tuner.setRole('light', 'page', 'line', 'brown-200')

    const reading = tuner.readRole('light', 'page', 'line')
    expect(reading.floor).toBe(null)
    expect(reading.flagged).toBe(false)
  })
})

describe('useColorTuner — renameShade [obligation]', () => {
  test('rejects a duplicate name and returns false', () => {
    const tuner = useColorTuner()
    const before = tuner.shadeOf('brown-100').name

    const accepted = tuner.renameShade('brown-100', 'brown-200')

    expect(accepted).toBe(false)
    expect(tuner.shadeOf('brown-100').name).toBe(before)
  })

  test('leaves role bindings pointing at the renamed shade by id', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'ink', 'brown-700')

    const accepted = tuner.renameShade('brown-700', 'my-custom-brown')

    expect(accepted).toBe(true)
    expect(tuner.roleId('light', 'page', 'ink')).toBe('brown-700')
    expect(tuner.shadeOf(tuner.roleId('light', 'page', 'ink')).name).toBe('my-custom-brown')
  })
})

describe('useColorTuner — usageCount [obligation]', () => {
  test('counts a role bound on a station and mode that are not on screen', () => {
    const tuner = useColorTuner()
    const before = tuner.usageCount('brown-500')

    tuner.setRole('dark', 'float', 'line', 'brown-500')

    expect(tuner.usageCount('brown-500')).toBe(before + 1)
  })

  test('counts a backdrop binding too', () => {
    const tuner = useColorTuner()
    const before = tuner.usageCount('brown-100')

    tuner.setBackdrop('light', 'brown-100')

    expect(tuner.usageCount('brown-100')).toBe(before + 1)
  })
})

describe('useColorTuner — deleteShade refuses when in use [obligation]', () => {
  test('refuses to delete a shade with usageCount > 0', () => {
    const tuner = useColorTuner()
    // brown-700 ships as `ink` on every light station, so its usage count is already > 0.
    expect(tuner.usageCount('brown-700')).toBeGreaterThan(0)

    tuner.deleteShade('brown-700')

    expect(tuner.shadeOf('brown-700')).not.toBe(null)
  })

  test('deletes a shade with a usage count of 0', () => {
    const tuner = useColorTuner()
    const shade = tuner.addShade('brown', { h: 10, s: 10, l: 10 })
    expect(tuner.usageCount(shade.id)).toBe(0)

    tuner.deleteShade(shade.id)

    expect(tuner.shadeOf(shade.id)).toBe(null)
  })
})

describe('useColorTuner — undo/redo runs [obligation]', () => {
  test('a beginRun/endRun span of many recolorShade calls undoes in one step', () => {
    const tuner = useColorTuner()
    const shade = tuner.shadeOf('brown-100')
    const original_hsl = { ...shade.hsl }

    tuner.beginRun({ key: 'admin.color-page.change.recolor', params: { name: shade.name } })
    tuner.recolorShade('brown-100', { h: 10, s: 10, l: 10 })
    tuner.recolorShade('brown-100', { h: 20, s: 20, l: 20 })
    tuner.recolorShade('brown-100', { h: 30, s: 30, l: 30 })
    tuner.endRun()

    expect(tuner.shadeOf('brown-100').hsl).toEqual({ h: 30, s: 30, l: 30 })

    tuner.undo()

    expect(tuner.shadeOf('brown-100').hsl).toEqual(original_hsl)
  })

  test('add-and-point (addShade + setRole inside one run) undoes in one step', () => {
    const tuner = useColorTuner()
    const before_role = tuner.roleId('light', 'page', 'ink')
    const before_count = tuner.shades.value.length

    tuner.beginRun({ key: 'admin.color-page.change.add-and-point', params: { role: 'ink' } })
    const shade = tuner.addShade('brown', { h: 5, s: 5, l: 5 })
    tuner.setRole('light', 'page', 'ink', shade.id)
    tuner.endRun()

    expect(tuner.roleId('light', 'page', 'ink')).toBe(shade.id)
    expect(tuner.shades.value.length).toBe(before_count + 1)

    tuner.undo()

    expect(tuner.roleId('light', 'page', 'ink')).toBe(before_role)
    expect(tuner.shades.value.length).toBe(before_count)
  })

  test('resetAll is itself undoable', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'ink', 'brown-500')

    tuner.resetAll()
    expect(tuner.roleId('light', 'page', 'ink')).not.toBe('brown-500')

    tuner.undo()

    expect(tuner.roleId('light', 'page', 'ink')).toBe('brown-500')
  })

  test('undo_label names the pending change', () => {
    const tuner = useColorTuner()
    expect(tuner.undo_label.value).toBe(null)

    tuner.setRole('light', 'page', 'ink', 'brown-500')

    expect(tuner.undo_label.value).toEqual({
      key: 'admin.color-page.change.set-role',
      params: { role: 'ink' }
    })
  })

  test('redo replays an undone change', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'ink', 'brown-500')
    tuner.undo()
    expect(tuner.roleId('light', 'page', 'ink')).not.toBe('brown-500')

    tuner.redo()

    expect(tuner.roleId('light', 'page', 'ink')).toBe('brown-500')
  })

  test('endRun on a run with no net change does not record a history entry', () => {
    const tuner = useColorTuner()
    tuner.beginRun({ key: 'admin.color-page.change.recolor', params: { name: 'noop' } })
    tuner.endRun()

    expect(tuner.undo_label.value).toBe(null)
  })

  test('endRun with no open run is a no-op', () => {
    const tuner = useColorTuner()
    tuner.endRun()
    expect(tuner.undo_label.value).toBe(null)
  })

  test('a second beginRun while one is already open is ignored', () => {
    const tuner = useColorTuner()
    tuner.beginRun({ key: 'admin.color-page.change.recolor', params: { name: 'a' } })
    tuner.recolorShade('brown-100', { h: 1, s: 1, l: 1 })
    tuner.beginRun({ key: 'admin.color-page.change.recolor', params: { name: 'b' } })
    tuner.endRun()

    expect(tuner.undo_label.value).toEqual({
      key: 'admin.color-page.change.recolor',
      params: { name: 'a' }
    })
  })
})

describe('useColorTuner — injectColorTuner', () => {
  test('throws when used outside the colour page', () => {
    let error = null
    const app = createApp({
      setup() {
        try {
          injectColorTuner()
        } catch (caught) {
          error = caught
        }
        return () => null
      }
    })
    const host = document.createElement('div')
    app.mount(host)
    app.unmount()

    expect(error?.message).toBe('Colour tuner used outside the colour page')
  })

  test('returns the provided tuner', () => {
    const provided = useColorTuner()
    let received = null
    const Child = {
      setup() {
        received = injectColorTuner()
        return () => null
      }
    }
    const app = createApp({
      setup() {
        provide(colorTunerKey, provided)
        return () => h(Child)
      }
    })
    const host = document.createElement('div')
    app.mount(host)
    app.unmount()

    expect(received).toBe(provided)
  })
})

describe('useColorTuner — fallbacks and guards', () => {
  test('paintShade falls back to the surface when the role is unanswered', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'line', null)

    const painted = tuner.paintShade('light', 'page', 'line')
    const surface = tuner.shadeOf(tuner.roleId('light', 'page', 'surface'))

    expect(painted?.id).toBe(surface?.id)
  })

  test('groundShade resolves the backdrop ground for a surface role', () => {
    const tuner = useColorTuner()
    const ground = tuner.groundShade('light', 'page', 'surface')
    expect(ground).toEqual(tuner.backdropShade('light'))
  })

  test('groundShade returns null for an unknown role', () => {
    const tuner = useColorTuner()
    expect(tuner.groundShade('light', 'page', 'not-a-real-role')).toBe(null)
  })

  test('unansweredCount counts roles with no shade for a station', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'line', null)
    tuner.setRole('light', 'page', 'skeleton', null)

    expect(tuner.unansweredCount('light', 'page')).toBeGreaterThanOrEqual(2)
  })

  test('readRole reports null steps and step buttons disabled for an unanswered role', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'line', null)

    const reading = tuner.readRole('light', 'page', 'line')
    expect(reading.steps).toBe(null)
    expect(reading.can_step_up).toBe(false)
    expect(reading.can_step_down).toBe(false)
  })

  test('stepRole is a no-op when there is no neighbour to step to', () => {
    const tuner = useColorTuner()
    tuner.setRole('light', 'page', 'line', null)
    tuner.stepRole('light', 'page', 'line', 1)

    expect(tuner.roleId('light', 'page', 'line')).toBe(null)
  })

  test('renameShade rejects a blank (whitespace-only) name', () => {
    const tuner = useColorTuner()
    const before = tuner.shadeOf('brown-100').name

    expect(tuner.renameShade('brown-100', '   ')).toBe(false)
    expect(tuner.shadeOf('brown-100').name).toBe(before)
  })

  test('freeName picks the next free index when the first is taken', () => {
    const tuner = useColorTuner()
    tuner.addShade('brown', { h: 1, s: 1, l: 1 })
    const second = tuner.addShade('brown', { h: 2, s: 2, l: 2 })

    expect(second.name).toBe('brown-new-2')
  })

  test('deleteShade is a no-op for an id that does not exist', () => {
    const tuner = useColorTuner()
    const before = tuner.shades.value.length

    tuner.deleteShade('does-not-exist')

    expect(tuner.shades.value.length).toBe(before)
  })

  test('canResetShade is false for a shade that never shipped', () => {
    const tuner = useColorTuner()
    const added = tuner.addShade('brown', { h: 1, s: 1, l: 1 })

    expect(tuner.canResetShade(added)).toBe(false)
  })

  test('resetShade is a no-op for a shade that never shipped', () => {
    const tuner = useColorTuner()
    const added = tuner.addShade('brown', { h: 1, s: 1, l: 1 })
    const before_hsl = { ...added.hsl }

    tuner.resetShade(added.id)

    expect(tuner.shadeOf(added.id).hsl).toEqual(before_hsl)
  })

  test('shippedHexOf returns null for a shade that never shipped', () => {
    const tuner = useColorTuner()
    const added = tuner.addShade('brown', { h: 1, s: 1, l: 1 })

    expect(tuner.shippedHexOf(added)).toBe(null)
  })

  test('shippedHexOf returns the shipped hex for a shipped shade', () => {
    const tuner = useColorTuner()
    expect(tuner.shippedHexOf(tuner.shadeOf('brown-100'))).toBe('#f3f1ea')
  })
})
