import { ref, shallowRef } from 'vue'
import type {
  AppContext,
  AppController,
  PhoneApp,
  PhoneContext,
  PhoneNotification,
  TransitionPreset,
  ViewApp
} from './types'

export type AppSession = {
  app: PhoneApp
  controller: AppController | undefined
}

const reverse_transition: Record<TransitionPreset, TransitionPreset> = {
  'slide-left': 'slide-right',
  'slide-right': 'slide-left',
  'pop-up': 'pop-down',
  'pop-down': 'pop-up',
  none: 'none'
}

export function createPhoneRuntime({
  openFullApp
}: {
  openFullApp: (app: ViewApp, controller: AppController | undefined) => void
}) {
  const active_session = shallowRef<AppSession | null>(null)
  const transition = ref<TransitionPreset>('slide-left')
  const notifications = ref<PhoneNotification[]>([])

  const _registry: Record<string, AppSession> = {}
  let _ctx: PhoneContext | null = null

  function notify(n: PhoneNotification) {
    const idx = notifications.value.findIndex((x) => x.app_id === n.app_id)
    if (idx >= 0) notifications.value[idx] = n
    else notifications.value.push(n)
  }

  function clearNotification(app_id: string) {
    notifications.value = notifications.value.filter((x) => x.app_id !== app_id)
  }

  function _buildAppCtx(app: PhoneApp, ctx: PhoneContext): AppContext {
    return {
      ...ctx,
      notify: (payload) => notify({ ...payload, app_id: app.id }),
      clearNotification: () => clearNotification(app.id)
    }
  }

  function init(apps: PhoneApp[], ctx: PhoneContext) {
    _ctx = ctx

    for (const app of apps) {
      // mount_policy controls when the factory is instantiated:
      // 'immediate' → factory runs now (at phone startup, for background work)
      // 'lazy' (default) → factory runs on first open
      const controller =
        app.mount_policy === 'immediate' ? app.controller?.(_buildAppCtx(app, ctx)) : undefined

      _registry[app.id] = { app, controller }
    }
  }

  async function open(id: string, t: TransitionPreset = 'slide-left') {
    const session = _registry[id]
    const { app } = session

    // Lazily instantiate the controller on first open for non-immediate apps
    if (!session.controller && app.controller && _ctx) {
      session.controller = app.controller(_buildAppCtx(app, _ctx))
    }

    const { controller } = session

    if (app.clear_notifications_on_open) {
      clearNotification(id)
    }

    if (app.type === 'trigger') {
      await controller?.onTrigger?.()
      return
    }

    if (app.type === 'view' && app.display === 'full') {
      await controller?.onOpen?.()
      openFullApp(app, controller)
      return
    }

    transition.value = t
    active_session.value = session
    await controller?.onOpen?.()
  }

  function close() {
    transition.value = reverse_transition[transition.value]
    active_session.value = null
  }

  function clear() {
    transition.value = reverse_transition[transition.value]
    active_session.value = null
  }

  function openByTitle(title: string, t: TransitionPreset = 'slide-left') {
    const session = Object.values(_registry).find((s) => s.app.title === title)
    if (!session) return
    return open(session.app.id, t)
  }

  return {
    init,
    active_session,
    transition,
    notifications,
    phoneOS: {
      open,
      openByTitle,
      close,
      clear
    }
  }
}
