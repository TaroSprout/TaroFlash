import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/sfx/bus', () => ({ emitSfx: vi.fn(), emitHoverSfx: vi.fn() }))
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup: (props) => () => h('i', { 'data-src': props.src })
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['click'],
  setup(_props, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: (e) => emit('click', e) }, slots.default?.())
  }
})

import FaceOverlay from '@/components/card/face-overlay.vue'

function mountOverlay(props = {}) {
  return shallowMount(FaceOverlay, {
    props: { variant: 'full', ...props },
    global: { stubs: { UiIcon: UiIconStub, UiButton: UiButtonStub } }
  })
}

describe('FaceOverlay — browse state (no error)', () => {
  test('renders the browse button with data-variant', () => {
    const wrapper = mountOverlay({ variant: 'inset' })
    const browse = wrapper.find('[data-testid="face-overlay__browse"]')
    expect(browse.exists()).toBe(true)
    expect(browse.attributes('data-variant')).toBe('inset')
  })

  test('does not render the error element', () => {
    const wrapper = mountOverlay()
    expect(wrapper.find('[data-testid="face-overlay__error"]').exists()).toBe(false)
  })

  test('data-active reflects the active prop', () => {
    const wrapper = mountOverlay({ active: true })
    expect(wrapper.find('[data-testid="face-overlay__browse"]').attributes('data-active')).toBe(
      'true'
    )
  })

  test('data-active is absent when active is false (default)', () => {
    const wrapper = mountOverlay()
    expect(
      wrapper.find('[data-testid="face-overlay__browse"]').attributes('data-active')
    ).toBeUndefined()
  })

  test('renders the heading when provided', () => {
    const wrapper = mountOverlay({ heading: 'Replace image' })
    expect(wrapper.text()).toContain('Replace image')
  })

  test('clicking the browse button emits browse', async () => {
    const wrapper = mountOverlay()
    await wrapper.find('[data-testid="face-overlay__browse"]').trigger('click')
    expect(wrapper.emitted('browse')).toBeTruthy()
  })
})

describe('FaceOverlay — error state', () => {
  test('renders the error element instead of the browse button', () => {
    const wrapper = mountOverlay({ error: 'Too large' })
    expect(wrapper.find('[data-testid="face-overlay__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="face-overlay__browse"]').exists()).toBe(false)
  })

  test('shows the error message text', () => {
    const wrapper = mountOverlay({ error: 'File too large' })
    expect(wrapper.text()).toContain('File too large')
  })

  test('carries data-error and the variant on the error element', () => {
    const wrapper = mountOverlay({ error: 'oops', variant: 'inset' })
    const error_el = wrapper.find('[data-testid="face-overlay__error"]')
    expect(error_el.attributes('data-error')).toBe('')
    expect(error_el.attributes('data-variant')).toBe('inset')
  })

  test('clicking the error element re-emits browse (re-pick after error) [obligation]', async () => {
    const wrapper = mountOverlay({ error: 'oops' })
    await wrapper.find('[data-testid="face-overlay__error"]').trigger('click')
    expect(wrapper.emitted('browse')).toBeTruthy()
  })

  test('clicking dismiss-error emits dismiss-error without also emitting browse', async () => {
    const wrapper = mountOverlay({ error: 'oops' })
    await wrapper.find('[data-testid="face-overlay__dismiss-error"]').trigger('click')
    expect(wrapper.emitted('dismiss-error')).toBeTruthy()
  })
})
