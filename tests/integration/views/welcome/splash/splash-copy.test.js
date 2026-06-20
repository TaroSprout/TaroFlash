import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// UiButton stub that forwards @press on click so tests can trigger it.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'iconLeft', 'sfx'],
  emits: ['press'],
  setup(_props, { slots, attrs, emit }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SplashCopy from '@/views/welcome/splash/splash-copy.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountSplashCopy({ signup = vi.fn(), seeMore = vi.fn() } = {}) {
  return shallowMount(SplashCopy, {
    props: { signup, seeMore },
    global: {
      stubs: {
        UiButton: UiButtonStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SplashCopy', () => {
  beforeEach(() => {
    mockEmitSfx.mockReset()
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the copy container', () => {
    const wrapper = mountSplashCopy()
    expect(wrapper.find('[data-testid="welcome-hero__copy"]').exists()).toBe(true)
  })

  test('renders the text block', () => {
    const wrapper = mountSplashCopy()
    expect(wrapper.find('[data-testid="welcome-hero__copy-text"]').exists()).toBe(true)
  })

  test('renders the actions container', () => {
    const wrapper = mountSplashCopy()
    expect(wrapper.find('[data-testid="welcome-hero__actions"]').exists()).toBe(true)
  })

  test('renders two action buttons', () => {
    const wrapper = mountSplashCopy()
    const buttons = wrapper.find('[data-testid="welcome-hero__actions"]').findAll('button')
    expect(buttons).toHaveLength(2)
  })

  // ── See More callback ──────────────────────────────────────────────────────

  test('clicking See More button invokes the seeMore callback', async () => {
    const seeMore = vi.fn()
    const wrapper = mountSplashCopy({ seeMore })
    const buttons = wrapper.find('[data-testid="welcome-hero__actions"]').findAll('button')
    // First button is "See More"
    await buttons[0].trigger('click')
    expect(seeMore).toHaveBeenCalledOnce()
  })

  test('See More button renders its label', () => {
    const wrapper = mountSplashCopy()
    const buttons = wrapper.find('[data-testid="welcome-hero__actions"]').findAll('button')
    expect(buttons[0].text()).toContain('See More')
  })

  // ── Signup callback ────────────────────────────────────────────────────────

  test('clicking signup button invokes the signup callback', async () => {
    const signup = vi.fn()
    const wrapper = mountSplashCopy({ signup })
    const buttons = wrapper.find('[data-testid="welcome-hero__actions"]').findAll('button')
    // Second button is signup
    await buttons[1].trigger('click')
    expect(signup).toHaveBeenCalledOnce()
  })

  test('signup button renders its label', () => {
    const wrapper = mountSplashCopy()
    const buttons = wrapper.find('[data-testid="welcome-hero__actions"]').findAll('button')
    expect(buttons[1].text()).toContain('Make An Account')
  })

  // ── Heading & subheading ───────────────────────────────────────────────────

  test('renders the hero heading', () => {
    const wrapper = mountSplashCopy()
    expect(wrapper.find('[data-testid="welcome-hero__copy-text"]').text()).toContain('TaroFlash')
  })
})
