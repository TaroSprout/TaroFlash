import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import TaroPhoneIndex from '@/components/taro-phone/index.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))

// Captures the esc handler so tests can fire it directly instead of routing
// through the global shortcut store / active-namespace gate.
const { escHandlerRef } = vi.hoisted(() => ({ escHandlerRef: { current: null } }))
vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({
    register: (reg) => {
      if (reg.combo === 'esc') escHandlerRef.current = reg.handler
    }
  })
}))

// All four hooks call `done()` synchronously so the v-if transitions resolve
// without waiting on real GSAP timing.
vi.mock('@/utils/animations/phone', () => ({
  slideDownBlurIn: vi.fn((_el, done) => done?.()),
  slideUpBlurOut: vi.fn((_el, done) => done?.()),
  slideUpBlurIn: vi.fn((_el, done) => done?.()),
  slideDownBlurOut: vi.fn((_el, done) => done?.())
}))

const AppLauncherStub = defineComponent({
  name: 'AppLauncher',
  setup: () => () => h('div', { 'data-testid': 'app-launcher-stub' })
})

/** Mimics OpenModalResult — a promise the caller controls from outside. */
function makeDeferredResult() {
  let resolve
  const response = new Promise((res) => {
    resolve = res
  })
  return { response, resolve }
}

function makeWrapper() {
  return mount(TaroPhoneIndex, {
    attachTo: document.body,
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: { AppLauncher: AppLauncherStub, transition: false }
    }
  })
}

function findBaseCloseButton(wrapper) {
  return wrapper.find('[data-testid="phone"] button')
}

let wrapper

beforeEach(async () => {
  wrapper = makeWrapper()
  await wrapper.find('[data-testid="phone"]').trigger('click')
  await flushPromises()
  expect(findBaseCloseButton(wrapper).exists()).toBe(true)
})

afterEach(() => {
  wrapper?.unmount()
})

describe('TaroPhoneIndex — openApp hide/reopen integration', () => {
  test('store.openApp hides the phone-base and reopens it once the app modal resolves', async () => {
    const store = useTaroPhoneStore()
    const deferred = makeDeferredResult()

    store.openApp(deferred)
    await flushPromises()
    expect(findBaseCloseButton(wrapper).exists()).toBe(false)

    deferred.resolve(undefined)
    await flushPromises()
    expect(findBaseCloseButton(wrapper).exists()).toBe(true)
  })
})

describe('TaroPhoneIndex — outside click regression [obligation]', () => {
  test('a synthetic click on document does NOT close the phone after openApp reopens it', async () => {
    const store = useTaroPhoneStore()
    const deferred = makeDeferredResult()

    store.openApp(deferred)
    deferred.resolve(undefined)
    await flushPromises()
    expect(findBaseCloseButton(wrapper).exists()).toBe(true)

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(findBaseCloseButton(wrapper).exists()).toBe(true)
  })

  test('a pointerdown on document outside the phone still closes it (contrast case)', async () => {
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flushPromises()

    expect(findBaseCloseButton(wrapper).exists()).toBe(false)
  })
})

describe('TaroPhoneIndex — togglePhone via esc shortcut', () => {
  test('toggles closed when open, then back open when closed', async () => {
    expect(findBaseCloseButton(wrapper).exists()).toBe(true)

    escHandlerRef.current()
    await flushPromises()
    expect(findBaseCloseButton(wrapper).exists()).toBe(false)
    expect(wrapper.find('[data-testid="phone"]').exists()).toBe(true)

    escHandlerRef.current()
    await flushPromises()
    expect(findBaseCloseButton(wrapper).exists()).toBe(true)
  })
})
