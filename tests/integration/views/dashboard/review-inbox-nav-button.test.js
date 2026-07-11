import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

vi.mock('@/sfx/bus', () => ({
  emitSfx: vi.fn(),
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiTappableStub = defineComponent({
  name: 'UiTappable',
  inheritAttrs: false,
  props: ['sfx', 'bgxColor'],
  emits: ['tap'],
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          onClick: (e) => emit('tap', e)
        },
        slots.default?.()
      )
  }
})

// ── Imports ───────────────────────────────────────────────────────────────────

import ReviewInboxNavButton from '@/views/dashboard/review-inbox-nav-button.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mount(props) {
  return shallowMount(ReviewInboxNavButton, {
    props,
    global: { stubs: { UiTappable: UiTappableStub } }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReviewInboxNavButton — direction', () => {
  test('renders review-inbox__prev-btn testid for direction=prev', () => {
    const wrapper = mount({ direction: 'prev' })
    expect(wrapper.find('[data-testid="review-inbox__prev-btn"]').exists()).toBe(true)
  })

  test('renders review-inbox__next-btn testid for direction=next', () => {
    const wrapper = mount({ direction: 'next' })
    expect(wrapper.find('[data-testid="review-inbox__next-btn"]').exists()).toBe(true)
  })

  test('shows the chevron-left icon for direction=prev', () => {
    const wrapper = mount({ direction: 'prev' })
    expect(wrapper.findComponent({ name: 'UiIcon' }).props('src')).toBe('chevron-left')
  })

  test('shows the chevron-right icon for direction=next', () => {
    const wrapper = mount({ direction: 'next' })
    expect(wrapper.findComponent({ name: 'UiIcon' }).props('src')).toBe('chevron-right')
  })
})

describe('ReviewInboxNavButton — disabled state', () => {
  test('is not visually disabled by default', () => {
    const wrapper = mount({ direction: 'next' })
    const root = wrapper.find('[data-testid="review-inbox__next-btn"]')
    expect(root.classes()).not.toContain('opacity-40')
    expect(root.classes()).not.toContain('pointer-events-none')
  })

  test('applies opacity and pointer-events-none classes when disabled', () => {
    const wrapper = mount({ direction: 'next', disabled: true })
    const root = wrapper.find('[data-testid="review-inbox__next-btn"]')
    expect(root.classes()).toContain('opacity-40')
    expect(root.classes()).toContain('pointer-events-none')
  })
})

describe('ReviewInboxNavButton — press event', () => {
  test('emits press when tapped', async () => {
    const wrapper = mount({ direction: 'next' })
    await wrapper.find('[data-testid="review-inbox__next-btn"]').trigger('click')
    expect(wrapper.emitted('press')).toBeTruthy()
    expect(wrapper.emitted('press')).toHaveLength(1)
  })
})
