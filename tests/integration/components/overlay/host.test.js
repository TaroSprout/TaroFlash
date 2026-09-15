import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, markRaw, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/utils/animations/overlay', () => ({
  playEnter: vi.fn(() => ({ done: Promise.resolve() })),
  playLeave: vi.fn(() => ({ done: Promise.resolve() }))
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
import { playEnter, playLeave } from '@/utils/animations/overlay'

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

const EnteredMarkerComponent = defineComponent({
  name: 'EnteredMarkerComponent',
  setup() {
    const { entered } = useOverlayContext()
    const is_entered = ref(false)
    entered.then(() => {
      is_entered.value = true
    })
    return () =>
      h('div', {
        'data-testid': 'entry-content',
        'data-entered': String(is_entered.value)
      })
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

  // ── done threads through the motion driver's handle ────────────

  test("the overlay content's entered promise resolves only once playEnter's motion handle resolves", async () => {
    const store = useOverlayStore()
    let resolveDone
    playEnter.mockReturnValueOnce({
      done: new Promise((resolve) => {
        resolveDone = resolve
      })
    })

    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      global: { stubs: { transition: false, 'transition-group': false } }
    })
    await flushPromises()
    pushEntry(store, { component: markRaw(EnteredMarkerComponent) })
    await flushPromises()

    expect(wrapper.find('[data-testid="entry-content"]').attributes('data-entered')).toBe('false')

    resolveDone()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-testid="entry-content"]').attributes('data-entered')).toBe('true')
    wrapper.unmount()
  })

  test("the leaving element stays in the DOM until playLeave's motion handle resolves", async () => {
    const store = useOverlayStore()
    let resolveDone
    playLeave.mockReturnValueOnce({
      done: new Promise((resolve) => {
        resolveDone = resolve
      })
    })
    pushEntry(store)

    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      global: { stubs: { transition: false, 'transition-group': false } }
    })
    await flushPromises()

    store.remove('e1')
    await flushPromises()

    expect(wrapper.find('[data-testid="entry-content"]').exists()).toBe(true)

    resolveDone()
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[data-testid="entry-content"]').exists()).toBe(false)
    wrapper.unmount()
  })

  // ── Receded wiring: inert and data-receded track the same signal ───────

  function surfaceFor(wrapper, id) {
    return wrapper
      .findAll('[data-testid="entry-content"]')
      .find((surface) => surface.attributes('data-overlay-id') === id)
  }

  test('two-deep stack: the top entry is neither inert nor receded, the one below is both', async () => {
    const store = useOverlayStore()
    pushEntry(store, { id: 'a' })

    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      global: { stubs: { transition: false, 'transition-group': false } }
    })
    await flushPromises()

    pushEntry(store, { id: 'b' })
    await flushPromises()

    const top = surfaceFor(wrapper, 'b')
    const below = surfaceFor(wrapper, 'a')

    expect(top.attributes('data-receded')).toBe('false')
    expect(top.attributes('inert')).toBeUndefined()
    expect(below.attributes('data-receded')).toBe('true')
    expect(below.attributes('inert')).toBeDefined()

    wrapper.unmount()
  })

  test('three-deep stack: every non-top entry is both inert and receded, only the top is neither', async () => {
    const store = useOverlayStore()
    pushEntry(store, { id: 'a' })

    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      global: { stubs: { transition: false, 'transition-group': false } }
    })
    await flushPromises()

    pushEntry(store, { id: 'b' })
    await flushPromises()
    pushEntry(store, { id: 'c' })
    await flushPromises()

    const top = surfaceFor(wrapper, 'c')
    const middle = surfaceFor(wrapper, 'b')
    const bottom = surfaceFor(wrapper, 'a')

    expect(top.attributes('data-receded')).toBe('false')
    expect(top.attributes('inert')).toBeUndefined()

    for (const entry of [middle, bottom]) {
      expect(entry.attributes('data-receded')).toBe('true')
      expect(entry.attributes('inert')).toBeDefined()
    }

    wrapper.unmount()
  })

  test('a receded entry clears data-receded and any inline filter once it returns to the top', async () => {
    const store = useOverlayStore()
    pushEntry(store, { id: 'a' })

    const wrapper = mount(OverlayHost, {
      attachTo: document.body,
      global: { stubs: { transition: false, 'transition-group': false } }
    })
    await flushPromises()

    pushEntry(store, { id: 'b' })
    await flushPromises()

    expect(surfaceFor(wrapper, 'a').attributes('data-receded')).toBe('true')

    store.remove('b')
    await flushPromises()

    const restored = surfaceFor(wrapper, 'a')
    expect(restored.attributes('data-receded')).toBe('false')
    expect(restored.element.style.filter).toBe('')

    wrapper.unmount()
  })
})
