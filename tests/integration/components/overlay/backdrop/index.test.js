import '@/styles/main.css' // required so the tier-full blur-gate assertion below reads a real computed value instead of passing vacuously

import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { markRaw } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import OverlayBackdrop from '@/components/overlay/backdrop.vue'
import { useOverlayStore } from '@/stores/overlay-stack'

function pushEntry(store, overrides = {}) {
  store.push({
    id: overrides.id ?? 'e1',
    component: markRaw({ render: () => null }),
    props: {},
    presentation: 'dialog',
    settle: () => {},
    markEntered: () => {},
    ...overrides
  })
}

function mountBackdrop(request_close = vi.fn()) {
  return mount(OverlayBackdrop, {
    props: { requestClose: request_close },
    attachTo: document.body
  })
}

describe('OverlayBackdrop', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-motion')
  })

  test('does not render when the overlay stack is empty', () => {
    const wrapper = mountBackdrop()
    expect(wrapper.find('[data-testid="overlay-backdrop"]').exists()).toBe(false)
  })

  test('renders once an entry is on the stack', () => {
    const store = useOverlayStore()
    pushEntry(store)

    const wrapper = mountBackdrop()
    expect(wrapper.find('[data-testid="overlay-backdrop"]').exists()).toBe(true)
  })

  // Dims unconditionally but blurs only at tier-full — the blur gate must
  // never fold into a bare, ungated class regardless of reduced motion.

  test.each(['lean', 'minimal'])('data-motion="%s": dims without blurring', (tier) => {
    document.documentElement.setAttribute('data-motion', tier)
    const store = useOverlayStore()
    pushEntry(store)

    const style = getComputedStyle(mountBackdrop().find('[data-testid="overlay-backdrop"]').element)
    expect(style.backgroundColor).toBe('oklab(0 0 0 / 0.1)')
    expect(style.backdropFilter).toBe('none')
  })

  test('data-motion="full": dims and blurs', () => {
    document.documentElement.setAttribute('data-motion', 'full')
    const store = useOverlayStore()
    pushEntry(store)

    const style = getComputedStyle(mountBackdrop().find('[data-testid="overlay-backdrop"]').element)
    expect(style.backgroundColor).toBe('oklab(0 0 0 / 0.1)')
    expect(style.backdropFilter).toBe('blur(4px)')
  })

  test('a click requests close on the topmost entry', async () => {
    const store = useOverlayStore()
    pushEntry(store, { id: 'e1' })
    pushEntry(store, { id: 'e2' })

    const request_close = vi.fn()
    const wrapper = mountBackdrop(request_close)
    await wrapper.find('[data-testid="overlay-backdrop"]').trigger('click')

    expect(request_close).toHaveBeenCalledTimes(1)
    expect(request_close.mock.calls[0][0].id).toBe('e2')
  })
})
