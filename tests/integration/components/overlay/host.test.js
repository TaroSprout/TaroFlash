import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, markRaw } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/utils/animations/overlay', () => ({
  playEnter: vi.fn((_el, done) => done()),
  playLeave: vi.fn((_el, done) => done())
}))

vi.mock('@/composables/ui/scroll-lock', () => ({
  useScrollLock: () => ({ lock: vi.fn(), unlock: vi.fn() })
}))

vi.mock('@/composables/shortcuts', () => ({
  useShortcuts: () => ({ register: vi.fn(), clearScope: vi.fn(), dispose: vi.fn() })
}))

import OverlayHost from '@/components/overlay/host.vue'
import { useOverlayStore } from '@/stores/overlay-stack'
import { useOverlayContext } from '@/composables/overlay/overlay-context'

const EntryComponent = defineComponent({
  name: 'EntryComponent',
  setup() {
    const { dismiss, close } = useOverlayContext()
    return () =>
      h('div', { 'data-testid': 'entry-content' }, [
        h('button', { 'data-testid': 'entry-dismiss', onClick: dismiss }, 'dismiss'),
        h('button', { 'data-testid': 'entry-close', onClick: () => close('done') }, 'close')
      ])
  }
})

function pushEntry(store, overrides = {}) {
  let settled
  const settle_promise = new Promise((resolve) => {
    settled = resolve
  })
  const entry = {
    id: overrides.id ?? 'e1',
    component: markRaw(EntryComponent),
    props: {},
    presentation: 'dialog',
    settle: (outcome) => {
      settled(outcome)
    },
    markEntered: () => {},
    ...overrides
  }
  store.push(entry)
  return { entry, settled: settle_promise }
}

describe('OverlayHost', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('renders each stack entry as overlay content', async () => {
    const store = useOverlayStore()
    pushEntry(store)

    const wrapper = mount(OverlayHost, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.find('[data-testid="entry-content"]').exists()).toBe(true)
    wrapper.unmount()
  })

  // ── The veto pipeline ────────────────────────────────────────

  test('dismiss with no interceptor removes the entry from the stack', async () => {
    const store = useOverlayStore()
    pushEntry(store)

    const wrapper = mount(OverlayHost, { attachTo: document.body })
    await flushPromises()

    await wrapper.find('[data-testid="entry-dismiss"]').trigger('click')
    await flushPromises()

    expect(store.entries).toHaveLength(0)
    wrapper.unmount()
  })

  test('a veto interceptor returning false blocks the close — the entry stays on the stack', async () => {
    const store = useOverlayStore()
    const { entry } = pushEntry(store)
    entry.interceptor = vi.fn().mockResolvedValue(false)

    const wrapper = mount(OverlayHost, { attachTo: document.body })
    await flushPromises()

    await wrapper.find('[data-testid="entry-dismiss"]').trigger('click')
    await flushPromises()

    expect(entry.interceptor).toHaveBeenCalledTimes(1)
    expect(store.entries).toHaveLength(1)
    wrapper.unmount()
  })

  test('a veto interceptor returning true allows the close — the entry is removed', async () => {
    const store = useOverlayStore()
    const { entry } = pushEntry(store)
    entry.interceptor = vi.fn().mockResolvedValue(true)

    const wrapper = mount(OverlayHost, { attachTo: document.body })
    await flushPromises()

    await wrapper.find('[data-testid="entry-dismiss"]').trigger('click')
    await flushPromises()

    expect(store.entries).toHaveLength(0)
    wrapper.unmount()
  })

  // ── close() bypasses the veto pipeline entirely ────────────────

  test('close(outcome) removes the entry directly, without consulting the interceptor', async () => {
    const store = useOverlayStore()
    const { entry } = pushEntry(store)
    entry.interceptor = vi.fn().mockResolvedValue(false)

    const wrapper = mount(OverlayHost, { attachTo: document.body })
    await flushPromises()

    await wrapper.find('[data-testid="entry-close"]').trigger('click')
    await flushPromises()

    expect(entry.interceptor).not.toHaveBeenCalled()
    expect(store.entries).toHaveLength(0)
    wrapper.unmount()
  })
})
