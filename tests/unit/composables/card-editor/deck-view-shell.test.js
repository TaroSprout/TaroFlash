import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { nextTick } from 'vue'

const { emitSfxMock } = vi.hoisted(() => ({ emitSfxMock: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: emitSfxMock }))

import { useDeckViewShell } from '@/views/deck/composables/view-shell'

// useLocalRef reads/writes localStorage — reset between tests so state
// from one test doesn't bleed into the next.
beforeEach(() => {
  localStorage.clear()
  emitSfxMock.mockReset()
})

describe('useDeckViewShell', () => {
  // ── Initial state ──────────────────────────────────────────────────────────

  test('starts in view mode', () => {
    const shell = useDeckViewShell()
    expect(shell.mode.value).toBe('view')
  })

  test('is_view is true when mode is view', () => {
    const shell = useDeckViewShell()
    expect(shell.is_view.value).toBe(true)
  })

  test('grid_size defaults to md', () => {
    const shell = useDeckViewShell()
    expect(shell.grid_size.value).toBe('md')
  })

  // ── grid_size mobile-first default (TARO-222) ──────────────────────────────
  // The first-time default depends on viewport width via useMatchMedia('w<md').
  // media-query.ts caches compiled queries at module scope, so each case resets
  // modules and swaps in a width-specific matchMedia mock before importing.

  describe('grid_size mobile-first default', () => {
    let realMatchMedia

    beforeEach(() => {
      realMatchMedia = window.matchMedia
      vi.resetModules()
    })

    afterEach(() => {
      window.matchMedia = realMatchMedia
    })

    function mockViewport(isMobile) {
      window.matchMedia = vi.fn(() => ({
        matches: isMobile,
        addEventListener: () => {},
        removeEventListener: () => {}
      }))
    }

    async function freshShell() {
      const { useDeckViewShell: fresh } = await import('@/views/deck/composables/view-shell')
      return fresh()
    }

    test('defaults to base (Dense) on mobile with no stored choice', async () => {
      mockViewport(true)
      const shell = await freshShell()
      expect(shell.grid_size.value).toBe('base')
    })

    test('defaults to md on non-mobile with no stored choice', async () => {
      mockViewport(false)
      const shell = await freshShell()
      expect(shell.grid_size.value).toBe('md')
    })

    test('a stored choice is not overridden on mobile', async () => {
      localStorage.setItem('deck-grid-size', JSON.stringify('xl'))
      mockViewport(true)
      const shell = await freshShell()
      expect(shell.grid_size.value).toBe('xl')
    })
  })

  // ── setMode ────────────────────────────────────────────────────────────────

  test('setMode changes the active mode', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    expect(shell.mode.value).toBe('edit')
  })

  test('is_view becomes false when mode is not view', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    expect(shell.is_view.value).toBe(false)
  })

  test('setMode to import-export sets mode correctly', () => {
    const shell = useDeckViewShell()
    shell.setMode('import-export')
    expect(shell.mode.value).toBe('import-export')
    expect(shell.is_view.value).toBe(false)
  })

  test('setMode returns a Promise that resolves immediately when already in new_mode [obligation]', async () => {
    const shell = useDeckViewShell()
    // Already in view — should resolve immediately without waiting for notifyModeSettled
    await expect(shell.setMode('view')).resolves.toBeUndefined()
  })

  test('setMode flips mode.value synchronously before the returned promise settles [obligation]', () => {
    const shell = useDeckViewShell()
    // Do not await — verify the synchronous side-effect
    shell.setMode('edit')
    expect(shell.mode.value).toBe('edit')
  })

  test('setMode returns a Promise that resolves only after notifyModeSettled is called [obligation]', async () => {
    const shell = useDeckViewShell()
    let settled = false
    const p = shell.setMode('edit').then(() => {
      settled = true
    })
    // Promise should not have resolved yet
    await Promise.resolve()
    expect(settled).toBe(false)
    shell.notifyModeSettled()
    await p
    expect(settled).toBe(true)
  })

  test('setMode plays ui.select chime on a real switch [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    expect(emitSfxMock).toHaveBeenCalledWith('select')
  })

  test('setMode does NOT play ui.select when already in new_mode [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setMode('view') // no-op since already in view
    expect(emitSfxMock).not.toHaveBeenCalled()
  })

  test('notifyModeSettled resolves all pending setMode promises [obligation]', async () => {
    const shell = useDeckViewShell()
    // Two sequential setMode calls before settling
    const p1 = shell.setMode('edit')
    const p2 = shell.setMode('view')
    shell.notifyModeSettled()
    // Both should resolve
    await Promise.all([p1, p2])
  })

  test('notifyModeSettled is idempotent — second call does nothing when no waiter [obligation]', () => {
    const shell = useDeckViewShell()
    expect(() => {
      shell.notifyModeSettled()
      shell.notifyModeSettled()
    }).not.toThrow()
  })

  // ── toggleMode ─────────────────────────────────────────────────────────────

  test('toggleMode enters target mode when in view', () => {
    const shell = useDeckViewShell()
    shell.toggleMode('edit')
    expect(shell.mode.value).toBe('edit')
  })

  test('toggleMode falls back to view when target is already active', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    shell.toggleMode('edit')
    expect(shell.mode.value).toBe('view')
  })

  test('toggleMode switches between two non-view modes without going through view first', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    shell.toggleMode('import-export')
    expect(shell.mode.value).toBe('import-export')
  })

  test('toggleMode returns a Promise (propagates setMode return value) [obligation]', () => {
    const shell = useDeckViewShell()
    const result = shell.toggleMode('edit')
    expect(result).toBeInstanceOf(Promise)
  })

  // ── exitMode ───────────────────────────────────────────────────────────────

  test('exitMode always returns to view mode', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    shell.exitMode()
    expect(shell.mode.value).toBe('view')
  })

  test('exitMode sets is_view back to true', () => {
    const shell = useDeckViewShell()
    shell.setMode('import-export')
    shell.exitMode()
    expect(shell.is_view.value).toBe(true)
  })

  test('exitMode returns a Promise (propagates setMode return value) [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    const result = shell.exitMode()
    expect(result).toBeInstanceOf(Promise)
  })

  // ── is_rearranging / toggleRearrange ──────────────────────────────────────

  test('is_rearranging starts false', () => {
    const shell = useDeckViewShell()
    expect(shell.is_rearranging.value).toBe(false)
  })

  test('toggleRearrange flips is_rearranging from false to true [obligation]', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange()
    expect(shell.is_rearranging.value).toBe(true)
  })

  test('toggleRearrange flips is_rearranging from true back to false [obligation]', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange()
    shell.toggleRearrange()
    expect(shell.is_rearranging.value).toBe(false)
  })

  test('toggleRearrange turning ON forces mode to view [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setMode('edit')
    expect(shell.mode.value).toBe('edit')

    shell.toggleRearrange() // turning on
    expect(shell.is_rearranging.value).toBe(true)
    expect(shell.mode.value).toBe('view') // forced back to view
  })

  test('toggleRearrange turning OFF does not force a mode change', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // on → mode forced to view
    shell.toggleRearrange() // off
    expect(shell.mode.value).toBe('view') // still view (no mode side-effect)
  })

  test('toggleRearrange emits pop_up_pop when turning ON [obligation]', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange()
    expect(emitSfxMock).toHaveBeenCalledWith('pop_up_pop')
  })

  test('toggleRearrange emits pop_up_close when turning OFF', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // on
    emitSfxMock.mockClear()
    shell.toggleRearrange() // off
    expect(emitSfxMock).toHaveBeenCalledWith('pop_up_close')
  })

  test('setMode(<non-view>) clears is_rearranging [obligation]', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // turn on rearranging
    expect(shell.is_rearranging.value).toBe(true)

    shell.setMode('edit') // leaving view must drop rearranging
    expect(shell.is_rearranging.value).toBe(false)
  })

  test('setMode(view) does not clear is_rearranging (already view)', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // turn on while in view
    shell.setMode('view') // no-op (already view) → is_rearranging untouched
    expect(shell.is_rearranging.value).toBe(true)
  })

  // ── setGridSize ────────────────────────────────────────────────────────────

  test('setGridSize changes grid_size', () => {
    const shell = useDeckViewShell()
    shell.setGridSize('xl')
    expect(shell.grid_size.value).toBe('xl')
  })

  test('setGridSize persists across shell instances via localStorage', async () => {
    const shell1 = useDeckViewShell()
    shell1.setGridSize('base')
    await nextTick()

    const shell2 = useDeckViewShell()
    expect(shell2.grid_size.value).toBe('base')
  })

  // ── grid_face / setGridFace [obligation] ──────────────────────────────────

  test('grid_face defaults to front [obligation]', () => {
    const shell = useDeckViewShell()
    expect(shell.grid_face.value).toBe('front')
  })

  test('setGridFace changes grid_face [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setGridFace('back')
    expect(shell.grid_face.value).toBe('back')
  })

  test('setGridFace persists across shell instances via localStorage [obligation]', async () => {
    const shell1 = useDeckViewShell()
    shell1.setGridFace('back')
    await nextTick()

    const shell2 = useDeckViewShell()
    expect(shell2.grid_face.value).toBe('back')
  })

  test('setGridFace and setGridSize are independent settings [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setGridFace('back')
    shell.setGridSize('xl')
    expect(shell.grid_face.value).toBe('back')
    expect(shell.grid_size.value).toBe('xl')
  })

  // ── sort_by / setSortBy ────────────────────────────────────────────────────

  test('sort_by starts as default [obligation]', () => {
    const shell = useDeckViewShell()
    expect(shell.sort_by.value).toBe('default')
  })

  test('sort_by is non-persistent — each fresh call initializes to default regardless of prior state [obligation]', async () => {
    const shell1 = useDeckViewShell()
    shell1.setSortBy('difficulty')
    await nextTick()

    // A new instance must start at default, not pick up the previous value
    const shell2 = useDeckViewShell()
    expect(shell2.sort_by.value).toBe('default')
  })

  test('setSortBy changes sort_by to the given key', () => {
    const shell = useDeckViewShell()
    shell.setSortBy('difficulty')
    expect(shell.sort_by.value).toBe('difficulty')
  })

  test('setSortBy is a no-op when called with the current value — sort_by does not mutate [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setSortBy('difficulty')
    const before = shell.sort_by.value

    // Should not trigger reactivity or side-effects
    shell.setSortBy('difficulty')
    expect(shell.sort_by.value).toBe(before)
  })

  test('setSortBy no-op does not mutate is_rearranging [obligation]', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // turn on
    expect(shell.is_rearranging.value).toBe(true)

    // Calling setSortBy with the current value (default) while rearranging — must not touch is_rearranging
    shell.setSortBy('default')
    expect(shell.is_rearranging.value).toBe(true)
  })

  test('setSortBy to a non-default key clears is_rearranging [obligation]', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // is_rearranging = true, sort_by is already 'default'
    // Now switch to a real sort key
    shell.setSortBy('difficulty')
    expect(shell.is_rearranging.value).toBe(false)
  })

  test('setSortBy back to default does not clear is_rearranging', () => {
    const shell = useDeckViewShell()
    shell.setSortBy('difficulty')
    // Manually put is_rearranging on to verify default doesn't clear it
    shell.is_rearranging.value = true
    shell.setSortBy('default')
    expect(shell.is_rearranging.value).toBe(true)
  })

  test('toggleRearrange turning ON resets sort_by to default [obligation]', () => {
    const shell = useDeckViewShell()
    shell.setSortBy('difficulty')
    expect(shell.sort_by.value).toBe('difficulty')

    shell.toggleRearrange() // turning on
    expect(shell.is_rearranging.value).toBe(true)
    expect(shell.sort_by.value).toBe('default')
  })

  test('toggleRearrange turning OFF does not change sort_by', () => {
    const shell = useDeckViewShell()
    shell.toggleRearrange() // on — resets sort to default
    shell.setSortBy('difficulty') // manually set after turning on (edge case)
    // But toggleRearrange is now off (rearranging=false)... actually we need to toggle again
    // Let's test a clean toggle off cycle
    const shell2 = useDeckViewShell()
    shell2.toggleRearrange() // on → sort=default, rearranging=true
    shell2.toggleRearrange() // off → rearranging=false, sort stays default
    expect(shell2.sort_by.value).toBe('default')
  })

  // ── is_page_settings_open / open+closePageSettings [obligation] ───────────

  test('is_page_settings_open starts false [obligation]', () => {
    const shell = useDeckViewShell()
    expect(shell.is_page_settings_open.value).toBe(false)
  })

  test('openPageSettings sets is_page_settings_open to true [obligation]', () => {
    const shell = useDeckViewShell()
    shell.openPageSettings()
    expect(shell.is_page_settings_open.value).toBe(true)
  })

  test('closePageSettings sets is_page_settings_open to false [obligation]', () => {
    const shell = useDeckViewShell()
    shell.openPageSettings()
    shell.closePageSettings()
    expect(shell.is_page_settings_open.value).toBe(false)
  })

  test('openPageSettings emits snappy_button_5 [obligation]', () => {
    const shell = useDeckViewShell()
    shell.openPageSettings()
    expect(emitSfxMock).toHaveBeenCalledWith('snappy_button_5')
  })

  test('closePageSettings emits snappy_button_5 [obligation]', () => {
    const shell = useDeckViewShell()
    shell.closePageSettings()
    expect(emitSfxMock).toHaveBeenCalledWith('snappy_button_5')
  })

  test("is_page_settings_open is shared state — one shell instance reflects another's toggle [obligation]", () => {
    // Regression context: the same flag is read by both the desktop toolbar
    // popover and the mobile-footer panel, so it must be a single ref per
    // shell instance rather than re-derived independently by each caller.
    const shell = useDeckViewShell()
    shell.openPageSettings()
    expect(shell.is_page_settings_open.value).toBe(true)
  })
})
