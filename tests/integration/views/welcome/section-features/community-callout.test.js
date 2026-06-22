import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

// Stub UiButton to expose the @press handler via a data-testid button element.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  props: ['inverted', 'size', 'iconLeft', 'sfx'],
  emits: ['press'],
  setup(_props, { slots, emit }) {
    return () =>
      h(
        'button',
        {
          'data-testid': 'ui-button',
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// Stub UiImage so it doesn't try to load real assets.
const UiImageStub = defineComponent({
  name: 'UiImage',
  props: ['src', 'size'],
  setup() {
    return () => h('img', { 'data-testid': 'community-callout__image' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import CommunityCallout from '@/views/welcome/section-features/community-callout.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountCallout({ seeRoadmap = vi.fn() } = {}) {
  return shallowMount(CommunityCallout, {
    props: { seeRoadmap },
    global: {
      stubs: { UiButton: UiButtonStub, UiImage: UiImageStub }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CommunityCallout', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the root container', () => {
    const wrapper = mountCallout()
    expect(wrapper.find('[data-testid="community-callout"]').exists()).toBe(true)
  })

  test('renders the copy section', () => {
    const wrapper = mountCallout()
    expect(wrapper.find('[data-testid="community-callout__copy"]').exists()).toBe(true)
  })

  test('renders the text block', () => {
    const wrapper = mountCallout()
    expect(wrapper.find('[data-testid="community-callout__text"]').exists()).toBe(true)
  })

  // ── seeRoadmap prop forwarding [obligation] ────────────────────────────────

  // [obligation] roadmap link exists
  test('renders the roadmap link button [obligation]', () => {
    const wrapper = mountCallout()
    expect(wrapper.find('[data-testid="community-callout__roadmap-link"]').exists()).toBe(true)
  })

  // [obligation] pressing the roadmap link calls seeRoadmap
  test('pressing the roadmap link calls the seeRoadmap prop [obligation]', async () => {
    const seeRoadmap = vi.fn()
    const wrapper = mountCallout({ seeRoadmap })

    await wrapper.find('[data-testid="community-callout__roadmap-link"]').trigger('click')

    expect(seeRoadmap).toHaveBeenCalledTimes(1)
  })

  test('seeRoadmap is not called until the link is pressed [obligation]', () => {
    const seeRoadmap = vi.fn()
    mountCallout({ seeRoadmap })
    expect(seeRoadmap).not.toHaveBeenCalled()
  })

  test('different seeRoadmap callbacks are each invoked independently [obligation]', async () => {
    const first = vi.fn()
    const second = vi.fn()

    const w1 = mountCallout({ seeRoadmap: first })
    const w2 = mountCallout({ seeRoadmap: second })

    await w1.find('[data-testid="community-callout__roadmap-link"]').trigger('click')

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })
})
