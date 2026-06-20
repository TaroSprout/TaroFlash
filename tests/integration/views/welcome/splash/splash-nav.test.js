import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

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

// Capture what slots were provided to UiDropdownButton so we can assert on
// the #panel slot having LoginDialogue content.
let capturedPanel = null

const LoginDialogueStub = defineComponent({
  name: 'LoginDialogue',
  setup() {
    return () => h('div', { 'data-testid': 'login-dialogue' })
  }
})

const UiDropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: ['size', 'position', 'openOnTrigger', 'hideTrigger', 'iconLeft'],
  setup(_props, { slots, attrs }) {
    capturedPanel = slots.panel
    return () => h('div', { ...attrs }, [slots.default?.(), slots.panel?.()])
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SplashNav from '@/views/welcome/splash/splash-nav.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountSplashNav() {
  capturedPanel = null
  return shallowMount(SplashNav, {
    global: {
      stubs: {
        UiIcon: UiIconStub,
        UiTooltip: UiTooltipStub,
        UiDropdownButton: UiDropdownButtonStub,
        LoginDialogue: LoginDialogueStub
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SplashNav', () => {
  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the nav container', () => {
    const wrapper = mountSplashNav()
    expect(wrapper.find('[data-testid="welcome-hero__nav"]').exists()).toBe(true)
  })

  test('renders the brand section', () => {
    const wrapper = mountSplashNav()
    expect(wrapper.find('[data-testid="welcome-hero__brand"]').exists()).toBe(true)
  })

  test('renders the beta pill', () => {
    const wrapper = mountSplashNav()
    expect(wrapper.find('[data-testid="welcome-hero__beta"]').exists()).toBe(true)
  })

  // ── Login trigger [obligation] ─────────────────────────────────────────────

  test('login trigger has data-testid="welcome-hero__login-trigger" [obligation]', () => {
    const wrapper = mountSplashNav()
    expect(wrapper.find('[data-testid="welcome-hero__login-trigger"]').exists()).toBe(true)
  })

  test('login trigger is a ui-dropdown-button [obligation]', () => {
    const wrapper = mountSplashNav()
    // The element with welcome-hero__login-trigger testid should be the dropdown button
    const trigger = wrapper.find('[data-testid="welcome-hero__login-trigger"]')
    expect(trigger.attributes('data-testid')).toBe('welcome-hero__login-trigger')
    // Confirm UiDropdownButton stub rendered it
    expect(wrapper.findComponent(UiDropdownButtonStub).exists()).toBe(true)
  })

  test('login trigger dropdown hosts LoginDialogue in its #panel slot [obligation]', () => {
    const wrapper = mountSplashNav()
    // The panel slot content (LoginDialogue) should be rendered inside the dropdown
    expect(wrapper.find('[data-testid="login-dialogue"]').exists()).toBe(true)
  })

  test('#panel slot is provided to UiDropdownButton (not just default slot) [obligation]', () => {
    mountSplashNav()
    // capturedPanel is set by the stub to the panel slot function
    expect(capturedPanel).not.toBeNull()
    expect(typeof capturedPanel).toBe('function')
  })
})
