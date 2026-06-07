import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/composables/use-media-query')

import { useThemeStore } from '@/stores/theme'
import { useMatchMedia } from '@/composables/use-media-query'

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    // Reset the OS-preference mock (system_mql) to non-dark before each test.
    // Do NOT clear listeners — the module-level addEventListener call runs once
    // at import time, so the handler would be lost if we reset the array here.
    global.__matchMedia.matches = false

    // Set up useMatchMedia mock before any store call captures the ref.
    vi.mocked(useMatchMedia).mockReturnValue(ref(false))
    // Reset store mode to 'system' (also writes to localStorage).
    useThemeStore().setMode('system')
    // Clear localStorage so load() tests start clean.
    localStorage.clear()
    // Reset DOM attribute.
    document.documentElement.removeAttribute('data-theme')
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

  test('setMode light sets data-theme to light', () => {
    useThemeStore().setMode('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('setMode dark sets data-theme to dark', () => {
    useThemeStore().setMode('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('setMode system sets data-theme to light when system is not dark', () => {
    global.__matchMedia.matches = false
    useThemeStore().setMode('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('setMode system sets data-theme to dark when system is dark', () => {
    global.__matchMedia.matches = true
    useThemeStore().setMode('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
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

  test('load applies an explicit theme to the DOM', () => {
    localStorage.setItem('app-theme', 'light')
    useThemeStore().load()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('load with system mode resolves to light when system is not dark', () => {
    global.__matchMedia.matches = false
    localStorage.setItem('app-theme', 'system')
    useThemeStore().load()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('load with system mode resolves to dark when system is dark', () => {
    global.__matchMedia.matches = true
    localStorage.setItem('app-theme', 'system')
    useThemeStore().load()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  // ── MQL change event ───────────────────────────────────────────────────────

  test('OS preference change updates data-theme while in system mode', () => {
    useThemeStore().setMode('system')

    global.__matchMedia.matches = true
    global.__matchMedia.listeners.forEach((l) => l())

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('OS preference change has no effect when not in system mode', () => {
    useThemeStore().setMode('light')

    global.__matchMedia.matches = true
    global.__matchMedia.listeners.forEach((l) => l())

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
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
    vi.mocked(useMatchMedia).mockReturnValue(ref(true))
    setActivePinia(createPinia())
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
    vi.mocked(useMatchMedia).mockReturnValue(ref(true))
    setActivePinia(createPinia())
    const store = useThemeStore()
    store.cycle()
    expect(store.mode).toBe('light')
  })
})
