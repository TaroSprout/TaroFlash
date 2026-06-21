import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, computed } from 'vue'
import { welcomeWidthKey, welcomeHeightKey } from '@/views/welcome/welcome-layout'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockOpenLogin, mockEmitSfx } = vi.hoisted(() => ({
  mockOpenLogin: vi.fn(),
  mockEmitSfx: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mockEmitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/views/welcome/login/login-modal', () => ({
  useLoginModal: () => ({ open: mockOpenLogin })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// UiButton stub — exposes iconLeft as a data-icon attribute so tests can
// query by which icon the button uses, without relying on prop() which is
// unreliable across browser-mode and jsdom with shallow stubs.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  props: ['size', 'iconLeft', 'sfx'],
  emits: ['press'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h(
        'button',
        { ...attrs, 'data-icon': props.iconLeft ?? '', onClick: () => emit('press') },
        slots.default?.()
      )
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SplashActions from '@/views/welcome/splash/splash-actions.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountActions({
  width = 'desktop',
  height = 'tall',
  signup = vi.fn(),
  seeMore = vi.fn()
} = {}) {
  return shallowMount(SplashActions, {
    props: { signup, seeMore },
    global: {
      provide: {
        [welcomeWidthKey]: computed(() => width),
        [welcomeHeightKey]: computed(() => height)
      },
      stubs: { UiButton: UiButtonStub }
    }
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function findByIcon(wrapper, icon) {
  return wrapper.find(`button[data-icon="${icon}"]`)
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockOpenLogin.mockReset()
  mockEmitSfx.mockReset()
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SplashActions', () => {
  // ── container ────────────────────────────────────────────────────────────────

  test('renders the actions container', () => {
    const wrapper = mountActions()
    expect(wrapper.find('[data-testid="welcome-hero__actions"]').exists()).toBe(true)
  })

  // ── see-more button visibility [obligation] ─────────────────────────────────

  describe('see-more button', () => {
    test('renders when width="desktop" regardless of height [obligation]', () => {
      const wrapper = mountActions({ width: 'desktop', height: 'short' })
      expect(findByIcon(wrapper, 'arrow-down').exists()).toBe(true)
    })

    test('renders when height="tall" regardless of width [obligation]', () => {
      const wrapper = mountActions({ width: 'tablet', height: 'tall' })
      expect(findByIcon(wrapper, 'arrow-down').exists()).toBe(true)
    })

    test('does NOT render when width="tablet" AND height="short" [obligation]', () => {
      const wrapper = mountActions({ width: 'tablet', height: 'short' })
      expect(findByIcon(wrapper, 'arrow-down').exists()).toBe(false)
    })

    test('calls seeMore() when pressed', async () => {
      const seeMore = vi.fn()
      const wrapper = mountActions({ seeMore, width: 'desktop' })
      await findByIcon(wrapper, 'arrow-down').trigger('click')
      expect(seeMore).toHaveBeenCalled()
    })
  })

  // ── login button visibility [obligation] ───────────────────────────────────

  describe('login button (welcome-hero__login)', () => {
    test('renders when height="short" and width="tablet" [obligation]', () => {
      const wrapper = mountActions({ height: 'short', width: 'tablet' })
      expect(wrapper.find('[data-testid="welcome-hero__login"]').exists()).toBe(true)
    })

    test('does NOT render when height="tall" [obligation]', () => {
      const wrapper = mountActions({ height: 'tall', width: 'tablet' })
      expect(wrapper.find('[data-testid="welcome-hero__login"]').exists()).toBe(false)
    })

    test('calls openLogin() when pressed [obligation]', async () => {
      const wrapper = mountActions({ height: 'short', width: 'tablet' })
      await wrapper.find('[data-testid="welcome-hero__login"]').trigger('click')
      expect(mockOpenLogin).toHaveBeenCalled()
    })
  })

  // ── signup button label [obligation] ──────────────────────────────────────

  describe('signup button label', () => {
    test('uses long copy when width="desktop" [obligation]', () => {
      const wrapper = mountActions({ width: 'desktop' })
      // Real locale: 'welcome-view.signup-button' → "Make An Account"
      // Short: 'welcome-view.signup-button-short' → "Sign Up"
      const text = findByIcon(wrapper, 'account-circle-add').text()
      expect(text).toBe('Make An Account')
    })

    test('uses short copy when width="tablet" [obligation]', () => {
      const wrapper = mountActions({ width: 'tablet' })
      // Real locale: 'welcome-view.signup-button-short' → "Sign Up"
      const text = findByIcon(wrapper, 'account-circle-add').text()
      expect(text).toBe('Sign Up')
    })

    test('calls signup() when pressed', async () => {
      const signup = vi.fn()
      const wrapper = mountActions({ signup })
      await findByIcon(wrapper, 'account-circle-add').trigger('click')
      expect(signup).toHaveBeenCalled()
    })
  })
})
