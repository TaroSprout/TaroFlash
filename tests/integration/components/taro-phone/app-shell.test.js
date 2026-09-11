import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { createGsapTimelineMock, motionStoreStub } from '@tests/fixtures/motion'
import AppShell from '@/components/taro-phone/app-shell.vue'

const { coarseRef } = vi.hoisted(() => ({ coarseRef: { value: false } }))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => coarseRef
}))

// app-shell's staged tap uses animate: 'pop' + yoyo, which drives the motion
// driver's GSAP timeline. Resolve it synchronously so the staged peak/done
// promises settle without waiting on real animation frames.
vi.mock('gsap', () => {
  const m = createGsapTimelineMock()
  return { gsap: { timeline: m.timeline, isTweening: m.isTweening, set: m.set } }
})

vi.mock('@/stores/motion', () => ({ useMotionStore: () => motionStoreStub() }))

function makeWrapper(props = {}) {
  return mount(AppShell, { props: { title: 'Settings', ...props } })
}

describe('AppShell', () => {
  test('renders the title as the visible label', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="app-shell__title"]').text()).toBe('Settings')
  })

  test('renders the phone-app trigger', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="phone-app"]').exists()).toBe(true)
  })

  test('emits press when clicked (fine pointer fires the action immediately)', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone-app"]').trigger('click')
    expect(wrapper.emitted('press')).toHaveLength(1)
  })
})

describe('AppShell — coarse pointer burst', () => {
  afterEach(() => {
    coarseRef.value = false
  })

  test('spawns a burst on tap and clears it once the burst animation finishes', async () => {
    coarseRef.value = true
    const wrapper = makeWrapper()

    await wrapper.find('[data-testid="phone-app"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="ui-kit-burst"]').exists()).toBe(true)
    expect(wrapper.emitted('press')).toHaveLength(1)

    await wrapper.find('[data-testid="ui-kit-burst"]').trigger('animationend')
    expect(wrapper.find('[data-testid="ui-kit-burst"]').exists()).toBe(false)
  })
})
