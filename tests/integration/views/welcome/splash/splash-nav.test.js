import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, computed } from 'vue'
import { welcomeHeightKey } from '@/views/welcome/welcome-layout'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

const UiTooltipStub = defineComponent({
  name: 'UiTooltip',
  inheritAttrs: false,
  props: ['element', 'position', 'text'],
  setup(_props, { slots, attrs }) {
    return () => h('span', { ...attrs }, slots.default?.())
  }
})

const LoginDialogueStub = defineComponent({
  name: 'LoginDialogue',
  setup() {
    return () => h('div', { 'data-testid': 'login-dialogue' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SplashNav from '@/views/welcome/splash/splash-nav.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountSplashNav({ height = 'tall' } = {}) {
  return shallowMount(SplashNav, {
    global: {
      provide: {
        [welcomeHeightKey]: computed(() => height)
      },
      stubs: {
        UiIcon: UiIconStub,
        UiTooltip: UiTooltipStub,
        LoginDialogue: LoginDialogueStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SplashNav', () => {
  // ── Responsive visibility [obligation] ─────────────────────────────────────

  test('renders the nav when height is "tall" [obligation]', () => {
    const wrapper = mountSplashNav({ height: 'tall' })
    expect(wrapper.find('[data-testid="welcome-hero__nav"]').exists()).toBe(true)
  })

  test('does NOT render the nav when height is "short" [obligation]', () => {
    const wrapper = mountSplashNav({ height: 'short' })
    expect(wrapper.find('[data-testid="welcome-hero__nav"]').exists()).toBe(false)
  })

  // ── Structure (when visible) ────────────────────────────────────────────────

  test('renders the brand section', () => {
    const wrapper = mountSplashNav()
    expect(wrapper.find('[data-testid="welcome-hero__brand"]').exists()).toBe(true)
  })

  test('renders the beta pill', () => {
    const wrapper = mountSplashNav()
    expect(wrapper.find('[data-testid="welcome-hero__beta"]').exists()).toBe(true)
  })

  // ── Login component [obligation] ──────────────────────────────────────────

  test('renders the LoginDialogue component in the nav [obligation]', () => {
    const wrapper = mountSplashNav()
    // LoginDialogue is a stub — its data-testid from the stub confirms it renders
    expect(wrapper.findComponent(LoginDialogueStub).exists()).toBe(true)
  })
})
