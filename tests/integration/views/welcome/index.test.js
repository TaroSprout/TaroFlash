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

// `useSessionStore()` calls `useI18n()` internally, which requires an active
// component instance the first time the store's setup() runs. `primeSessionStore`
// forces that first run — by actually calling `useSessionStore` — inside a real
// (throwaway) mount, so a later direct `useSessionStore(pinia)` call — needed to
// configure action mocks before the real mount below — just returns the
// already-instantiated, cached store instead of re-running setup() cold.
function primeSessionStore(pinia, useSessionStore) {
  shallowMount(
    defineComponent({
      setup: () => {
        useSessionStore()
        return () => null
      }
    }),
    { global: { plugins: [pinia] } }
  )
}

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
  props: ['seeRoadmap'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'section-features' }, [
        h(
          'button',
          {
            'data-testid': 'section-features__roadmap-trigger',
            onClick: () => props.seeRoadmap?.()
          },
          'See Roadmap'
        )
      ])
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

  test('modal response resolution emits pop_up_close sfx [obligation]', async () => {
    let resolve_response
    const deferred = new Promise((resolve) => {
      resolve_response = resolve
    })
    const wrapper = mountWelcome({ modalResponse: deferred })
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    mocks.emitSfx.mockReset()
    resolve_response(undefined)
    await flushPromises()
    expect(mocks.emitSfx).toHaveBeenCalledWith('pop_up_close')
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

  // ── scrollToRoadmap wiring [obligation] ────────────────────────────────────

  test('passes scrollToRoadmap as seeRoadmap to SectionFeatures [obligation]', async () => {
    const wrapper = mountWelcome()

    // The roadmap section's scrollIntoView should be called when the
    // seeRoadmap callback received by SectionFeatures is invoked.
    const roadmapEl = wrapper.find('[data-testid="section-roadmap"]').element
    const scrollIntoViewSpy = vi.fn()
    roadmapEl.scrollIntoView = scrollIntoViewSpy

    await wrapper.find('[data-testid="section-features__roadmap-trigger"]').trigger('click')
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  test('scrollToRoadmap does not call scrollIntoView on the features section [obligation]', async () => {
    const wrapper = mountWelcome()

    const featuresEl = wrapper.find('[data-testid="section-features"]').element
    const featuresSpy = vi.fn()
    featuresEl.scrollIntoView = featuresSpy

    const roadmapEl = wrapper.find('[data-testid="section-roadmap"]').element
    roadmapEl.scrollIntoView = vi.fn()

    await wrapper.find('[data-testid="section-features__roadmap-trigger"]').trigger('click')
    expect(featuresSpy).not.toHaveBeenCalled()
  })

  // ── onMounted redirect when already authenticated ──────────────────────────

  test('redirects to authenticated route when session restore returns true', async () => {
    const { useSessionStore } = await import('@/stores/session')
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    primeSessionStore(pinia, useSessionStore)
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

  // ── onMounted — checkPasswordRecovery [obligation] ─────────────────────────

  describe('checkPasswordRecovery [obligation]', () => {
    test('opens the reset-password modal and skips restoreSession/redirect when it resolves true [obligation]', async () => {
      const { useSessionStore } = await import('@/stores/session')
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
      primeSessionStore(pinia, useSessionStore)
      mocks.modalOpen.mockReturnValue({ response: Promise.resolve(undefined) })

      const session = useSessionStore(pinia)
      session.checkPasswordRecovery.mockResolvedValue(true)
      session.restoreSession.mockResolvedValue(true)

      shallowMount(WelcomeIndex, {
        global: {
          plugins: [pinia],
          stubs: {
            Splash: SplashStub,
            SectionFeatures: SectionFeaturesStub,
            SectionPricing: SectionPricingStub,
            SectionRoadmap: SectionRoadmapStub,
            WelcomeFooter: WelcomeFooterStub,
            SignupDialog: true
          }
        }
      })

      await flushPromises()

      expect(mocks.modalOpen).toHaveBeenCalled()
      expect(session.restoreSession).not.toHaveBeenCalled()
      expect(mocks.push).not.toHaveBeenCalledWith({ name: 'authenticated' })
    })

    test('runs the normal restoreSession/redirect flow when it resolves false [obligation]', async () => {
      const { useSessionStore } = await import('@/stores/session')
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
      primeSessionStore(pinia, useSessionStore)
      mocks.modalOpen.mockReturnValue({ response: Promise.resolve(undefined) })

      const session = useSessionStore(pinia)
      session.checkPasswordRecovery.mockResolvedValue(false)
      session.restoreSession.mockResolvedValue(true)

      shallowMount(WelcomeIndex, {
        global: {
          plugins: [pinia],
          stubs: {
            Splash: SplashStub,
            SectionFeatures: SectionFeaturesStub,
            SectionPricing: SectionPricingStub,
            SectionRoadmap: SectionRoadmapStub,
            WelcomeFooter: WelcomeFooterStub,
            SignupDialog: true
          }
        }
      })

      await flushPromises()

      expect(session.restoreSession).toHaveBeenCalledOnce()
      expect(mocks.push).toHaveBeenCalledWith({ name: 'authenticated' })
    })
  })
})
