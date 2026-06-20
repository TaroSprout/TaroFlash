import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createTestingPinia } from '@pinia/testing'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  emitSfx: vi.fn(),
  modalOpen: vi.fn()
}))

vi.mock('@/router', () => ({
  default: { push: mocks.push }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' }
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mocks.emitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: mocks.modalOpen })
}))

// ── Stubs ──────────────────────────────────────────────────────────────────────

const SplashStub = defineComponent({
  name: 'Splash',
  props: ['signup', 'seeMore'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'splash' }, [
        h(
          'button',
          {
            'data-testid': 'splash__signup',
            onClick: () => props.signup()
          },
          'Sign Up'
        ),
        h(
          'button',
          {
            'data-testid': 'splash__see-more',
            onClick: () => props.seeMore()
          },
          'See More'
        )
      ])
  }
})

const SectionFeaturesStub = defineComponent({
  name: 'SectionFeatures',
  setup() {
    return () => h('div', { 'data-testid': 'section-features' })
  }
})

const SectionConfigStub = defineComponent({
  name: 'SectionConfig',
  setup() {
    return () => h('div', { 'data-testid': 'section-config' })
  }
})

const SectionPricingStub = defineComponent({
  name: 'SectionPricing',
  props: ['signup'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'section-pricing' }, [
        h(
          'button',
          {
            'data-testid': 'section-pricing__signup',
            onClick: () => props.signup(true)
          },
          'Buy'
        )
      ])
  }
})

const SectionRoadmapStub = defineComponent({
  name: 'SectionRoadmap',
  setup() {
    return () => h('div', { 'data-testid': 'section-roadmap' })
  }
})

const WelcomeFooterStub = defineComponent({
  name: 'WelcomeFooter',
  setup() {
    return () => h('div', { 'data-testid': 'welcome-footer' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import WelcomeIndex from '@/views/welcome/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountWelcome({ modalResponse = Promise.resolve(undefined) } = {}) {
  mocks.modalOpen.mockReturnValue({ response: modalResponse })

  return shallowMount(WelcomeIndex, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
          initialState: {}
        })
      ],
      stubs: {
        Splash: SplashStub,
        SectionFeatures: SectionFeaturesStub,
        SectionConfig: SectionConfigStub,
        SectionPricing: SectionPricingStub,
        SectionRoadmap: SectionRoadmapStub,
        WelcomeFooter: WelcomeFooterStub,
        // Sign-up dialog — referenced but never rendered directly in this view
        SignupDialog: true
      }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WelcomeIndex', () => {
  beforeEach(() => {
    mocks.push.mockReset()
    mocks.emitSfx.mockReset()
    mocks.modalOpen.mockReset()
  })

  // ── Structure ──────────────────────────────────────────────────────────────

  test('renders the Splash component', () => {
    const wrapper = mountWelcome()
    expect(wrapper.find('[data-testid="splash"]').exists()).toBe(true)
  })

  test('renders the SectionFeatures component', () => {
    const wrapper = mountWelcome()
    expect(wrapper.find('[data-testid="section-features"]').exists()).toBe(true)
  })

  test('renders the SectionPricing component', () => {
    const wrapper = mountWelcome()
    expect(wrapper.find('[data-testid="section-pricing"]').exists()).toBe(true)
  })

  test('renders the WelcomeFooter component', () => {
    const wrapper = mountWelcome()
    expect(wrapper.find('[data-testid="welcome-footer"]').exists()).toBe(true)
  })

  // ── openSignup sfx [obligation] ────────────────────────────────────────────

  test('clicking signup emits snappy_button_3 sfx [obligation]', async () => {
    const wrapper = mountWelcome()
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    expect(mocks.emitSfx).toHaveBeenCalledWith('snappy_button_3')
  })

  test('clicking signup opens the modal [obligation]', async () => {
    const wrapper = mountWelcome()
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    expect(mocks.modalOpen).toHaveBeenCalled()
  })

  test('modal response resolution emits snappy_button_5 sfx [obligation]', async () => {
    let resolve_response
    const deferred = new Promise((resolve) => {
      resolve_response = resolve
    })
    const wrapper = mountWelcome({ modalResponse: deferred })
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    mocks.emitSfx.mockReset()
    resolve_response(undefined)
    await flushPromises()
    expect(mocks.emitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  // ── scrollToContent / See More [obligation] ────────────────────────────────

  test('clicking See More calls scrollIntoView on the features section [obligation]', async () => {
    const wrapper = mountWelcome()

    // Mock scrollIntoView on the features component's $el
    const featuresEl = wrapper.find('[data-testid="section-features"]').element
    const scrollIntoViewSpy = vi.fn()
    featuresEl.scrollIntoView = scrollIntoViewSpy

    await wrapper.find('[data-testid="splash__see-more"]').trigger('click')
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  // ── onMounted redirect when already authenticated ──────────────────────────

  test('redirects to authenticated route when session restore returns true', async () => {
    const { useSessionStore } = await import('@/stores/session')
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    mocks.modalOpen.mockReturnValue({ response: Promise.resolve(undefined) })

    // Must get the store and configure the mock BEFORE mounting so the
    // onMounted call picks up the return value.
    const session = useSessionStore(pinia)
    session.restoreSession.mockResolvedValue(true)

    shallowMount(WelcomeIndex, {
      global: {
        plugins: [pinia],
        stubs: {
          Splash: SplashStub,
          SectionFeatures: SectionFeaturesStub,
          SectionConfig: SectionConfigStub,
          SectionPricing: SectionPricingStub,
          SectionRoadmap: SectionRoadmapStub,
          WelcomeFooter: WelcomeFooterStub,
          SignupDialog: true
        }
      }
    })

    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'authenticated' })
  })
})
