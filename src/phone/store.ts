import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { PhoneApp, TransitionPreset, ViewApp } from './system/types'

const REVERSE_TRANSITION: Record<TransitionPreset, TransitionPreset> = {
  'slide-left': 'slide-right',
  'slide-right': 'slide-left',
  'pop-up': 'pop-down',
  'pop-down': 'pop-up',
  none: 'none'
}

export const usePhoneStore = defineStore('phone', () => {
  const apps = shallowRef<PhoneApp[]>([])
  const active_app = shallowRef<ViewApp | null>(null)
  const pending_modal = shallowRef<ViewApp | null>(null)
  const transition = ref<TransitionPreset>('slide-left')
  const notifications = ref<Record<string, number>>({})

  const notification_count = computed(() =>
    Object.values(notifications.value).reduce((sum, n) => sum + n, 0)
  )

  function registerApp(app: PhoneApp) {
    if (!apps.value.some((a) => a.id === app.id)) {
      apps.value = [...apps.value, app]
    }
  }

  function open(id: string, t: TransitionPreset = 'slide-left') {
    const app = apps.value.find((a) => a.id === id)
    if (!app) return

    if (app.clear_notifications_on_open) _clearNotification(app.id)

    if (app.type === 'trigger') {
      app.onTrigger?.()
      return
    }

    if (app.type === 'widget') return

    if (app.display === 'full') {
      pending_modal.value = app
    } else {
      transition.value = t
      active_app.value = app
    }
  }

  function close() {
    transition.value = REVERSE_TRANSITION[transition.value]
    active_app.value = null
  }

  function clear() {
    transition.value = REVERSE_TRANSITION[transition.value]
    active_app.value = null
  }

  function consumePendingModal(): ViewApp | null {
    const app = pending_modal.value
    pending_modal.value = null
    return app
  }

  function notify(app_id: string, count: number) {
    notifications.value = { ...notifications.value, [app_id]: count }
  }

  function _clearNotification(app_id: string) {
    const { [app_id]: _, ...rest } = notifications.value
    notifications.value = rest
  }

  return {
    apps,
    active_app,
    pending_modal,
    transition,
    notifications,
    notification_count,
    registerApp,
    open,
    close,
    clear,
    consumePendingModal,
    notify
  }
})
