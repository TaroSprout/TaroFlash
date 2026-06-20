import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { emitSfxMock, emitHoverSfxMock } = vi.hoisted(() => ({
  emitSfxMock: vi.fn(),
  emitHoverSfxMock: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: emitSfxMock,
  emitHoverSfx: emitHoverSfxMock
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({ register: vi.fn() })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const ViewAppStub = defineComponent({
  name: 'ViewApp',
  props: ['app', 'id'],
  emits: ['press', 'tap-start', 'mouseenter'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': 'phone-app',
        'data-app-id': props.app?.id,
        'data-app-display': props.app?.display,
        onClick: () => emit('press'),
        onTapstart: () => emit('tap-start'),
        onMouseenter: () => emit('mouseenter')
      })
  }
})

import AppLauncher from '@/phone/components/app-launcher.vue'
import { usePhoneStore } from '@/phone/store'

// ── Factories ─────────────────────────────────────────────────────────────────

function makeViewApp(id, display = 'panel') {
  return { id, type: 'view', display, title: id, launcher: { icon_src: '', theme: 'green-500' } }
}

function makeWrapper(apps = []) {
  const wrapper = mount(AppLauncher, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: { ViewApp: ViewAppStub }
    }
  })
  // Populate the store's apps after mount
  const store = usePhoneStore()
  store.apps = apps
  return wrapper
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  emitSfxMock.mockReset()
  emitHoverSfxMock.mockReset()
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapperWithApps(...displays) {
  const apps = displays.map((d, i) => makeViewApp(`app-${i}`, d))
  return { wrapper: makeWrapper(apps), apps, store: usePhoneStore() }
}

// ── toggle_on gating ──────────────────────────────────────────────────────────

describe('app-launcher — toggle_on sfx gating', () => {
  test('does NOT emit toggle_on when app is view+full (e.g. settings) [obligation]', () => {
    const settingsApp = makeViewApp('settings', 'full')
    const { onTapApp } = (() => {
      // Access onTapApp directly via the component's internal function
      // by calling it via the component's exposed interface through mount
      const wrapper = makeWrapper([settingsApp])
      return wrapper.vm
    })()

    onTapApp(settingsApp)
    expect(emitSfxMock).not.toHaveBeenCalledWith('toggle_on')
  })

  test('emits toggle_on for a panel view app (display!==full, e.g. shortcuts) [obligation]', () => {
    const shortcutsApp = makeViewApp('shortcuts', 'panel')
    const wrapper = makeWrapper([shortcutsApp])
    wrapper.vm.onTapApp(shortcutsApp)
    expect(emitSfxMock).toHaveBeenCalledWith('toggle_on')
  })

  test('does not emit toggle_on when tapping a full-display view app', () => {
    const fullApp = makeViewApp('deck-settings', 'full')
    const wrapper = makeWrapper([fullApp])
    wrapper.vm.onTapApp(fullApp)

    const calls = emitSfxMock.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('toggle_on')
  })
})

// ── openApp ───────────────────────────────────────────────────────────────────

describe('app-launcher — openApp', () => {
  test('calls store.open with the app id when pressing a view-app', async () => {
    const { wrapper, apps, store } = makeWrapperWithApps('panel')
    store.open = vi.fn()
    await nextTick()
    await wrapper.findAll('[data-testid="phone-app"]')[0].trigger('click')
    expect(store.open).toHaveBeenCalledWith(apps[0].id)
  })

  test('does not call store.open when app list is empty', () => {
    const wrapper = makeWrapper([])
    const store = usePhoneStore()
    store.open = vi.fn()
    // Calling openApp with no apps should be a no-op
    wrapper.vm.openApp()
    expect(store.open).not.toHaveBeenCalled()
  })
})

// ── onHoverApp ────────────────────────────────────────────────────────────────

describe('app-launcher — onHoverApp', () => {
  test('plays a hover sfx when hovering a new app', async () => {
    const { wrapper } = makeWrapperWithApps('panel', 'panel')
    await nextTick()
    await wrapper.findAll('[data-testid="phone-app"]')[0].trigger('mouseenter')
    expect(emitHoverSfxMock).toHaveBeenCalledWith('pop_drip_mid')
  })
})
