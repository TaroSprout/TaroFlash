import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import storage from '@/utils/storage'

export type ThemeMode = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'app-theme'

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')
  const is_system_dark = useMatchMedia('dark')

  const is_dark = computed(() => {
    if (mode.value === 'system') return is_system_dark.value
    return mode.value === 'dark'
  })

  // The only place light-or-dark reaches the page. A second writer drifts from `is_dark`.
  watchEffect(() => {
    const resolved = is_dark.value ? 'dark' : 'light'
    document.documentElement.setAttribute('data-mode', resolved)
  })

  function load() {
    mode.value = storage.get<ThemeMode>(STORAGE_KEY) ?? 'system'
  }

  function setMode(next: ThemeMode) {
    mode.value = next
    storage.set(STORAGE_KEY, next)
  }

  function cycle() {
    let order: ThemeMode[] = ['light', 'system', 'dark']
    if (is_system_dark.value) order = ['light', 'dark', 'system']
    setMode(order[(order.indexOf(mode.value) + 1) % order.length])
  }

  return { mode, is_dark, setMode, cycle, load }
})
