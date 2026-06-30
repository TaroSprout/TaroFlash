import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AppLauncher from '@/components/taro-phone/app-launcher.vue'

const { mockEmitHoverSfx } = vi.hoisted(() => ({ mockEmitHoverSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitHoverSfx: mockEmitHoverSfx, emitSfx: vi.fn() }))

// Capture the handlers app-launcher registers so tests can fire them directly
// instead of routing through the global shortcut store / active-namespace gate.
const handlers = {}
vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({
    register: (regs) => {
      for (const r of [].concat(regs)) handlers[r.combo] = r.handler
    }
  })
}))

function makeAppStub(name) {
  return defineComponent({
    name,
    setup: () => () =>
      h('button', { 'data-testid': 'phone-app', 'data-app': name, onClick: vi.fn() })
  })
}

let active_wrapper

function makeWrapper() {
  active_wrapper = mount(AppLauncher, {
    attachTo: document.body,
    global: {
      stubs: {
        SettingsApp: makeAppStub('SettingsApp'),
        DarkmodeApp: makeAppStub('DarkmodeApp'),
        FeedbackApp: makeAppStub('FeedbackApp'),
        LogoutApp: makeAppStub('LogoutApp')
      }
    }
  })
  return active_wrapper
}

beforeEach(() => {
  for (const key of Object.keys(handlers)) delete handlers[key]
})

afterEach(() => {
  active_wrapper?.unmount()
  active_wrapper = undefined
})

describe('AppLauncher — arrow-key focus cycling [obligation]', () => {
  test('arrowright focuses the first app when nothing is focused yet', () => {
    makeWrapper()
    handlers['arrowright']()

    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    expect(document.activeElement).toBe(apps[0])
  })

  test('arrowright moves focus to the next app', () => {
    makeWrapper()
    handlers['arrowright']()
    handlers['arrowright']()

    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    expect(document.activeElement).toBe(apps[1])
  })

  test('arrowright wraps from the last app back to the first', () => {
    makeWrapper()
    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    // First press focuses index 0; one more press per remaining app lands on
    // the last app; the press after that wraps back to the first.
    for (let i = 0; i < apps.length + 1; i++) handlers['arrowright']()

    expect(document.activeElement).toBe(apps[0])
  })

  test('arrowleft wraps from the first app to the last', () => {
    makeWrapper()
    handlers['arrowright']()
    handlers['arrowleft']()

    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    expect(document.activeElement).toBe(apps[apps.length - 1])
  })

  test('arrowdown moves focus 3 tiles ahead (grid row jump)', () => {
    makeWrapper()
    handlers['arrowdown']()

    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    // index starts unfocused (-1) -> first press lands on index 0
    expect(document.activeElement).toBe(apps[0])
  })

  test('arrowup wraps to the last app from an unfocused state', () => {
    makeWrapper()
    handlers['arrowup']()

    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    expect(document.activeElement).toBe(apps[apps.length - 1])
  })
})

describe('AppLauncher — mouse hover tracking', () => {
  test('hovering a different app resets keyboard focus tracking and plays a hover sfx', () => {
    const wrapper = makeWrapper()
    handlers['arrowright']()

    mockEmitHoverSfx.mockClear()
    wrapper.find('[data-app="DarkmodeApp"]').trigger('mouseover')

    expect(mockEmitHoverSfx).toHaveBeenCalledWith('pop_drip_mid')
  })

  test('hovering the already-focused app is a no-op', () => {
    const wrapper = makeWrapper()
    handlers['arrowright']()

    mockEmitHoverSfx.mockClear()
    wrapper.find('[data-app="SettingsApp"]').trigger('mouseover')

    expect(mockEmitHoverSfx).not.toHaveBeenCalled()
  })

  test('hovering outside any app tile is a no-op', () => {
    const wrapper = makeWrapper()

    mockEmitHoverSfx.mockClear()
    wrapper.find('[data-testid="app-launcher"]').trigger('mouseover')

    expect(mockEmitHoverSfx).not.toHaveBeenCalled()
  })
})

describe('AppLauncher — enter activates the focused app [obligation]', () => {
  test('enter clicks the currently focused app tile', () => {
    makeWrapper()
    handlers['arrowright']()
    handlers['arrowright']()

    const apps = document.querySelectorAll('[data-testid="phone-app"]')
    const click_spy = vi.spyOn(apps[1], 'click')

    handlers['enter']()

    expect(click_spy).toHaveBeenCalledOnce()
  })
})
