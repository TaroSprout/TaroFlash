import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { usePhoneStore } from '@/phone/store'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePanelApp(overrides = {}) {
  return {
    id: 'panel-app',
    title: 'Panel App',
    type: 'view',
    display: 'panel',
    component: {},
    launcher: { icon_src: 'panel', theme: 'blue-500' },
    ...overrides
  }
}

function makeFullApp(overrides = {}) {
  return {
    id: 'settings',
    title: 'Settings',
    type: 'view',
    display: 'full',
    component: {},
    launcher: { icon_src: 'settings', theme: 'pink-400' },
    ...overrides
  }
}

function makeTriggerApp(overrides = {}) {
  return {
    id: 'trigger-app',
    title: 'Trigger App',
    type: 'trigger',
    onTrigger: vi.fn(),
    launcher: { icon_src: 'trigger', theme: 'red-500' },
    ...overrides
  }
}

function makeWidgetApp(overrides = {}) {
  return {
    id: 'widget-app',
    title: 'Widget App',
    type: 'widget',
    component: {},
    launcher: { icon_src: 'widget', theme: 'teal-500' },
    ...overrides
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePhoneStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── registerApp ────────────────────────────────────────────────────────────

  describe('registerApp', () => {
    test('adds app to the apps list', () => {
      const store = usePhoneStore()
      const app = makePanelApp()
      store.registerApp(app)
      expect(store.apps).toHaveLength(1)
      expect(store.apps[0]).toBe(app)
    })

    test('is idempotent — registering the same id twice does not duplicate', () => {
      const store = usePhoneStore()
      const app = makePanelApp()
      store.registerApp(app)
      store.registerApp(app)
      expect(store.apps).toHaveLength(1)
    })

    test('registers multiple distinct apps', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp({ id: 'a' }))
      store.registerApp(makePanelApp({ id: 'b' }))
      expect(store.apps).toHaveLength(2)
    })
  })

  // ── open — display: 'full' (pending_modal) ─────────────────────────────────

  describe('open — full-display view app', () => {
    test('finds app by stable string id and sets pending_modal [obligation]', () => {
      const store = usePhoneStore()
      const app = makeFullApp()
      store.registerApp(app)

      store.open('settings')

      expect(store.pending_modal).toBe(app)
      expect(store.active_app).toBeNull()
    })

    test('does not set active_app for full display', () => {
      const store = usePhoneStore()
      store.registerApp(makeFullApp())

      store.open('settings')

      expect(store.active_app).toBeNull()
    })

    test('does not mutate transition when routing to pending_modal', () => {
      const store = usePhoneStore()
      store.registerApp(makeFullApp())
      const before = store.transition

      store.open('settings')

      expect(store.transition).toBe(before)
    })
  })

  // ── open — display: 'panel' (active_app) ──────────────────────────────────

  describe('open — panel-display view app', () => {
    test('sets active_app for panel display [obligation]', () => {
      const store = usePhoneStore()
      const app = makePanelApp()
      store.registerApp(app)

      store.open('panel-app')

      expect(store.active_app).toBe(app)
      expect(store.pending_modal).toBeNull()
    })

    test('uses supplied transition preset', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())

      store.open('panel-app', 'slide-right')

      expect(store.transition).toBe('slide-right')
    })

    test('defaults transition to slide-left', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())

      store.open('panel-app')

      expect(store.transition).toBe('slide-left')
    })
  })

  // ── open — trigger type ────────────────────────────────────────────────────

  describe('open — trigger app', () => {
    test('calls onTrigger and leaves active_app null [obligation]', () => {
      const store = usePhoneStore()
      const onTrigger = vi.fn()
      store.registerApp(makeTriggerApp({ onTrigger }))

      store.open('trigger-app')

      expect(onTrigger).toHaveBeenCalledOnce()
      expect(store.active_app).toBeNull()
    })

    test('does not set pending_modal for trigger apps', () => {
      const store = usePhoneStore()
      store.registerApp(makeTriggerApp())

      store.open('trigger-app')

      expect(store.pending_modal).toBeNull()
    })

    test('is a no-op when trigger app has no onTrigger handler', () => {
      const store = usePhoneStore()
      store.registerApp(makeTriggerApp({ onTrigger: undefined }))

      expect(() => store.open('trigger-app')).not.toThrow()
      expect(store.active_app).toBeNull()
    })
  })

  // ── open — widget type ─────────────────────────────────────────────────────

  describe('open — widget app', () => {
    test('is a no-op — neither active_app nor pending_modal set [obligation]', () => {
      const store = usePhoneStore()
      store.registerApp(makeWidgetApp())

      store.open('widget-app')

      expect(store.active_app).toBeNull()
      expect(store.pending_modal).toBeNull()
    })
  })

  // ── open — unknown id ──────────────────────────────────────────────────────

  describe('open — unknown id', () => {
    test('is a silent no-op for an unregistered id', () => {
      const store = usePhoneStore()

      expect(() => store.open('unknown')).not.toThrow()
      expect(store.active_app).toBeNull()
    })
  })

  // ── open — clear_notifications_on_open ────────────────────────────────────

  describe('open — clear_notifications_on_open', () => {
    test('clears the notification when the flag is set', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp({ clear_notifications_on_open: true }))
      store.notify('panel-app', 3)

      store.open('panel-app')

      expect(store.notifications['panel-app']).toBeUndefined()
    })

    test('leaves notifications intact when flag is absent', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.notify('panel-app', 2)

      store.open('panel-app')

      expect(store.notifications['panel-app']).toBe(2)
    })
  })

  // ── consumePendingModal ────────────────────────────────────────────────────

  describe('consumePendingModal', () => {
    test('returns the pending app and clears pending_modal to null [obligation]', () => {
      const store = usePhoneStore()
      const app = makeFullApp()
      store.registerApp(app)
      store.open('settings')

      const consumed = store.consumePendingModal()

      expect(consumed).toBe(app)
      expect(store.pending_modal).toBeNull()
    })

    test('returns null when no modal is pending', () => {
      const store = usePhoneStore()

      expect(store.consumePendingModal()).toBeNull()
    })
  })

  // ── close ──────────────────────────────────────────────────────────────────

  describe('close', () => {
    test('clears active_app', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.open('panel-app')

      store.close()

      expect(store.active_app).toBeNull()
    })

    test('reverses slide-left to slide-right [obligation]', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.open('panel-app', 'slide-left')

      store.close()

      expect(store.transition).toBe('slide-right')
    })

    test('reverses pop-up to pop-down', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.open('panel-app', 'pop-up')

      store.close()

      expect(store.transition).toBe('pop-down')
    })

    test('reverses slide-right to slide-left', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.open('panel-app', 'slide-right')

      store.close()

      expect(store.transition).toBe('slide-left')
    })
  })

  // ── clear ──────────────────────────────────────────────────────────────────

  describe('clear', () => {
    test('clears active_app', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.open('panel-app')

      store.clear()

      expect(store.active_app).toBeNull()
    })

    test('reverses the transition direction [obligation]', () => {
      const store = usePhoneStore()
      store.registerApp(makePanelApp())
      store.open('panel-app', 'pop-up')

      store.clear()

      expect(store.transition).toBe('pop-down')
    })
  })

  // ── notify / notification_count ────────────────────────────────────────────

  describe('notify / notification_count', () => {
    test('notify sets a notification count for an app', () => {
      const store = usePhoneStore()

      store.notify('some-app', 5)

      expect(store.notifications['some-app']).toBe(5)
    })

    test('notify overwrites an existing notification', () => {
      const store = usePhoneStore()
      store.notify('some-app', 1)
      store.notify('some-app', 10)

      expect(store.notifications['some-app']).toBe(10)
    })

    test('notification_count is the sum of all notification values', () => {
      const store = usePhoneStore()
      store.notify('app-a', 3)
      store.notify('app-b', 7)

      expect(store.notification_count).toBe(10)
    })

    test('notification_count is 0 when no notifications', () => {
      const store = usePhoneStore()
      expect(store.notification_count).toBe(0)
    })
  })
})
