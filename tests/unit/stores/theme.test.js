import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/composables/ui/media-query')

import { useThemeStore } from '@/stores/theme'
import { useMatchMedia } from '@/composables/ui/media-query'

describe('theme store', () => {
  let system_dark

  beforeEach(() => {
    setActivePinia(createPinia())

    // Shared ref instance so tests can flip the OS-preference signal after
    // the store has already captured it (is_dark is reactive to this ref via
    // the store's `is_system_dark` computed).
    system_dark = ref(false)
    vi.mocked(useMatchMedia).mockReturnValue(system_dark)

    // Reset store mode to 'system' (also writes to localStorage). This also
    // creates the store, which syncs `data-mode` on the DOM synchronously via
    // its `watchEffect` — don't clear the attribute afterwards, the store
    // only reapplies it when `is_dark` actually changes value.
    useThemeStore().setMode('system')
    // Clear localStorage so load() tests start clean.
    localStorage.clear()
  })

  test('mode defaults to system', () => {
    setActivePinia(createPinia())
    const { mode } = useThemeStore()
    expect(mode).toBe('system')
  })

  test('setMode updates mode', () => {
    const store = useThemeStore()
    store.setMode('dark')
    expect(store.mode).toBe('dark')
  })

  test('setMode light sets data-mode to light', async () => {
    useThemeStore().setMode('light')
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('light')
  })

  test('setMode dark sets data-mode to dark', async () => {
    useThemeStore().setMode('dark')
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
  })

  test('setMode system sets data-mode to light when system is not dark', async () => {
    system_dark.value = false
    useThemeStore().setMode('system')
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('light')
  })

  test('setMode system sets data-mode to dark when system is dark', async () => {
    system_dark.value = true
    useThemeStore().setMode('system')
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
  })

  test('setMode persists the selected theme to localStorage', () => {
    useThemeStore().setMode('light')
    expect(localStorage.getItem('app-theme')).toBe('light')
  })

  test('load reads saved theme from localStorage', () => {
    localStorage.setItem('app-theme', 'dark')
    const store = useThemeStore()
    store.load()
    expect(store.mode).toBe('dark')
  })

  test('load defaults to system when localStorage has no saved theme', () => {
    const store = useThemeStore()
    store.load()
    expect(store.mode).toBe('system')
  })

  test('load applies an explicit theme to the DOM', async () => {
    localStorage.setItem('app-theme', 'light')
    useThemeStore().load()
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('light')
  })

  test('load with system mode resolves to light when system is not dark', async () => {
    system_dark.value = false
    localStorage.setItem('app-theme', 'system')
    useThemeStore().load()
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('light')
  })

  test('load with system mode resolves to dark when system is dark', async () => {
    system_dark.value = true
    localStorage.setItem('app-theme', 'system')
    useThemeStore().load()
    await nextTick()
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
  })

  // ── OS preference change ────────────────────────────────────────────────────

  test('OS preference change updates data-mode while in system mode', async () => {
    useThemeStore().setMode('system')

    system_dark.value = true
    await nextTick()

    expect(document.documentElement.getAttribute('data-mode')).toBe('dark')
  })

  test('OS preference change has no effect when not in system mode', async () => {
    useThemeStore().setMode('light')

    system_dark.value = true
    await nextTick()

    expect(document.documentElement.getAttribute('data-mode')).toBe('light')
  })

  // ── is_dark ────────────────────────────────────────────────────────────────

  test('is_dark is true when mode is dark', () => {
    const store = useThemeStore()
    store.setMode('dark')
    expect(store.is_dark).toBe(true)
  })

  test('is_dark is false when mode is light', () => {
    const store = useThemeStore()
    store.setMode('light')
    expect(store.is_dark).toBe(false)
  })

  test('is_dark reflects system preference when mode is system and system is dark', () => {
    system_dark.value = true
    expect(useThemeStore().is_dark).toBe(true)
  })

  test('is_dark is false in system mode when system preference is not dark', () => {
    expect(useThemeStore().is_dark).toBe(false)
  })

  // ── cycle ──────────────────────────────────────────────────────────────────

  test('cycle advances from system to dark (light system preference)', () => {
    const store = useThemeStore()
    store.cycle()
    expect(store.mode).toBe('dark')
  })

  test('cycle completes a full rotation for light system preference', () => {
    const store = useThemeStore()
    store.cycle()
    store.cycle()
    store.cycle()
    expect(store.mode).toBe('system')
  })

  test('cycle advances from system to light when system preference is dark', () => {
    system_dark.value = true
    const store = useThemeStore()
    store.cycle()
    expect(store.mode).toBe('light')
  })
})
