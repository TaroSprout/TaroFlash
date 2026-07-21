import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { OpenModalResult } from '@/composables/modal'

export const useTaroPhoneStore = defineStore('taro-phone', () => {
  const is_open = ref(false)
  const notifications = ref<Record<string, number>>({})
  const was_hidden_for_app_modal = ref(false)

  const notification_count = computed(() =>
    Object.values(notifications.value).reduce((sum, n) => sum + n, 0)
  )

  function open() {
    is_open.value = true
  }

  function close() {
    is_open.value = false
  }

  /** Hide the phone while an app-launched modal is open, reopening once it closes. */
  function openApp(result: OpenModalResult<unknown>) {
    was_hidden_for_app_modal.value = true
    is_open.value = false

    result.response.finally(() => {
      if (!was_hidden_for_app_modal.value) return
      was_hidden_for_app_modal.value = false
      is_open.value = true
    })
  }

  /** Reset the phone to its logged-out baseline so no stale open state leaks
   * into the next session (e.g. firing a close sfx on the first click). */
  function reset() {
    is_open.value = false
    was_hidden_for_app_modal.value = false
    notifications.value = {}
  }

  function notify(app_id: string, count: number) {
    notifications.value = { ...notifications.value, [app_id]: count }
  }

  function clearNotification(app_id: string) {
    const { [app_id]: _, ...rest } = notifications.value
    notifications.value = rest
  }

  return {
    is_open,
    notifications,
    notification_count,
    open,
    close,
    openApp,
    reset,
    notify,
    clearNotification
  }
})
