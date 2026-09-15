import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
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
  return mount(OverlayBackdrop, { props: { requestClose: request_close } })
}

describe('OverlayBackdrop', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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

  test('dims unconditionally and gates blur behind tier-full, never bare', () => {
    const store = useOverlayStore()
    pushEntry(store)

    const classes = mountBackdrop().find('[data-testid="overlay-backdrop"]').classes()
    expect(classes).toContain('bg-black/10')
    expect(classes).toContain('tier-full:backdrop-blur-4')
    expect(classes).not.toContain('backdrop-blur-4')
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
