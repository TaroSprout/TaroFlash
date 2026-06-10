import { describe, test, expect, beforeEach } from 'vite-plus/test'
import { nextTick } from 'vue'
import { useDeckViewShell } from '@/composables/card-editor/deck-view-shell'

// useLocalRef reads/writes localStorage — reset between tests so state
// from one test doesn't bleed into the next.
beforeEach(() => {
  localStorage.clear()
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
