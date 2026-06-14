import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMatchMedia } from '@/composables/ui/media-query'
import storage from '@/utils/storage'

export type ThemeMode = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'app-theme'

const system_mql = window.matchMedia('(prefers-color-scheme: dark)')

function applyToDOM(next: ThemeMode) {
  const resolved = next === 'system' ? (system_mql.matches ? 'dark' : 'light') : next
  document.documentElement.setAttribute('data-theme', resolved)
}

system_mql.addEventListener('change', () => {
  const store = useThemeStore()
  if (store.mode === 'system') applyToDOM('system')
})

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')
  const is_system_dark = useMatchMedia('dark')

  const is_dark = computed(() => {
    if (mode.value === 'system') return is_system_dark.value
    return mode.value === 'dark'
  })

  function load() {
    const saved = storage.get<ThemeMode>(STORAGE_KEY)
    mode.value = saved ?? 'system'
    applyToDOM(mode.value)
  }

  function setMode(next: ThemeMode) {
    mode.value = next
    applyToDOM(next)
    storage.set(STORAGE_KEY, next)
  }

  function cycle() {
    let order: ThemeMode[] = ['light', 'system', 'dark']
    if (is_system_dark.value) order = ['light', 'dark', 'system']
    setMode(order[(order.indexOf(mode.value) + 1) % order.length])
  }

  return { mode, is_dark, setMode, cycle, load }
})
