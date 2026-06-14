import { ref, watch, type Ref } from 'vue'

export function useSessionRef<T>(key: string, defaultValue: T): Ref<T> {
  const stored = sessionStorage.getItem(key)

  let initial: T = defaultValue
  if (stored !== null) {
    try {
      initial = JSON.parse(stored) as T
    } catch {
      initial = defaultValue
    }
  }

  const state = ref(initial) as Ref<T>

  watch(
    state,
    (value) => {
      sessionStorage.setItem(key, JSON.stringify(value))
    },
    { deep: true }
  )

  return state
}
