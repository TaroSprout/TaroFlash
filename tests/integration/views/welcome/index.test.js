import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createTestingPinia } from '@pinia/testing'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  emitSfx: vi.fn(),
  modalOpen: vi.fn(),
  captureReturnDestination: vi.fn(),
  routeQuery: {}
}))

vi.mock('@/router', () => ({
  default: { push: mocks.push }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => ({ query: mocks.routeQuery }),
  RouterLink: { template: '<a><slot /></a>' },
  RouterView: { template: '<div />' }
}))

vi.mock('@/composables/auth/return-destination', () => ({
  captureReturnDestination: mocks.captureReturnDestination,
  consumeReturnDestination: vi.fn()
}))

vi.mock('@/sfx/bus', () => ({
  emitSfx: mocks.emitSfx,
  emitHoverSfx: vi.fn()
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: mocks.modalOpen }),
  useModalRequestClose: () => {},
  closeAll: () => {}
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
    mocks.captureReturnDestination.mockReset()
    mocks.routeQuery = {}
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

  // ── openSignup sfx ────────────────────────────────────────────

  test('clicking signup emits dialog.open sfx', async () => {
    const wrapper = mountWelcome()
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    expect(mocks.emitSfx).toHaveBeenCalledWith('dialog.open')
  })

  test('clicking signup opens the modal', async () => {
    const wrapper = mountWelcome()
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    expect(mocks.modalOpen).toHaveBeenCalled()
  })

  test('modal response resolution emits dialog.close sfx', async () => {
    let resolve_response
    const deferred = new Promise((resolve) => {
      resolve_response = resolve
    })
    const wrapper = mountWelcome({ modalResponse: deferred })
    await wrapper.find('[data-testid="splash__signup"]').trigger('click')
    mocks.emitSfx.mockReset()
    resolve_response(undefined)
    await flushPromises()
    expect(mocks.emitSfx).toHaveBeenCalledWith('dialog.close')
  })

  // ── scrollToContent / See More ────────────────────────────────

  test('clicking See More calls scrollIntoView on the features section', async () => {
    const wrapper = mountWelcome()

    // Mock scrollIntoView on the features component's $el
    const featuresEl = wrapper.find('[data-testid="section-features"]').element
    const scrollIntoViewSpy = vi.fn()
    featuresEl.scrollIntoView = scrollIntoViewSpy

    await wrapper.find('[data-testid="splash__see-more"]').trigger('click')
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  // ── scrollToRoadmap wiring ────────────────────────────────────

  test('passes scrollToRoadmap as seeRoadmap to SectionFeatures', async () => {
    const wrapper = mountWelcome()

    // The roadmap section's scrollIntoView should be called when the
    // seeRoadmap callback received by SectionFeatures is invoked.
    const roadmapEl = wrapper.find('[data-testid="section-roadmap"]').element
    const scrollIntoViewSpy = vi.fn()
    roadmapEl.scrollIntoView = scrollIntoViewSpy

    await wrapper.find('[data-testid="section-features__roadmap-trigger"]').trigger('click')
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  test('scrollToRoadmap does not call scrollIntoView on the features section', async () => {
    const wrapper = mountWelcome()

    const featuresEl = wrapper.find('[data-testid="section-features"]').element
    const featuresSpy = vi.fn()
    featuresEl.scrollIntoView = featuresSpy

    const roadmapEl = wrapper.find('[data-testid="section-roadmap"]').element
    roadmapEl.scrollIntoView = vi.fn()

    await wrapper.find('[data-testid="section-features__roadmap-trigger"]').trigger('click')
    expect(featuresSpy).not.toHaveBeenCalled()
  })

  // ── onMounted — checkPasswordRecovery ─────────────────────────
  //
  // The checkpoint already routes a signed-in visitor away before this view
  // ever mounts, so onMounted here no longer self-redirects — it only handles
  // the recovery-modal branch and stashing `?next=`.

  describe('checkPasswordRecovery', () => {
    test('opens the reset-password modal and does NOT capture a return destination when it resolves true', async () => {
      const { useSessionStore } = await import('@/stores/session')
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
      primeSessionStore(pinia, useSessionStore)
      mocks.modalOpen.mockReturnValue({ response: Promise.resolve(undefined) })
      mocks.routeQuery = { next: '/deck/123' }

      const session = useSessionStore(pinia)
      session.checkPasswordRecovery.mockResolvedValue(true)

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
      expect(mocks.captureReturnDestination).not.toHaveBeenCalled()
    })

    test('captures the ?next= route query as the return destination when recovery resolves false', async () => {
      const { useSessionStore } = await import('@/stores/session')
      const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
      primeSessionStore(pinia, useSessionStore)
      mocks.modalOpen.mockReturnValue({ response: Promise.resolve(undefined) })
      mocks.routeQuery = { next: '/deck/123' }

      const session = useSessionStore(pinia)
      session.checkPasswordRecovery.mockResolvedValue(false)

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

      expect(mocks.captureReturnDestination).toHaveBeenCalledWith('/deck/123')
    })
  })
})
