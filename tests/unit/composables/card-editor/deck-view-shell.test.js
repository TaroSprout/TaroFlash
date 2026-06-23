import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
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
})
