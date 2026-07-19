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

  /* `is_dark` is the single source of truth for the resolved mode. It used to
   * share the job with a module-scope matchMedia listener that wrote the DOM
   * directly; the two could disagree, and consumers reading `is_dark`
   * (getStripeAppearance) then rendered against the wrong mode. */
  watchEffect(() => {
    const resolved = is_dark.value ? 'dark' : 'light'
    document.documentElement.setAttribute('data-mode', resolved)

    /* `data-theme` is written alongside `data-mode` on purpose. The
     * `@custom-variant dark` in main.css and every `[data-theme='dark']
     * [data-theme-dark='X']` selector in palettes.css still key off it, so
     * dropping it here would break 130+ files at once. Both attributes ride
     * along until Phase E retires the old theme layer. */
    document.documentElement.setAttribute('data-theme', resolved)
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
