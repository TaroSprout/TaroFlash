import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Hoisted state ─────────────────────────────────────────────────────────────

const { memberState, subscriptionQueryState } = vi.hoisted(() => ({
  memberState: { plan: 'free', plan_display_name: 'Free' },
  subscriptionQueryState: { isLoading: false, error: null, data: null }
}))

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get plan() {
      return memberState.plan
    },
    get plan_display_name() {
      return memberState.plan_display_name
    }
  })
}))

vi.mock('@/api/billing', () => ({
  useSubscriptionQuery: () => ({
    isLoading: {
      get value() {
        return subscriptionQueryState.isLoading
      }
    },
    error: {
      get value() {
        return subscriptionQueryState.error
      }
    },
    data: {
      get value() {
        return subscriptionQueryState.data
      }
    }
  }),
  useCancelSubscriptionMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useResumeSubscriptionMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useCreateSubscriptionMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useCreateSetupIntentMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useChangePlanMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  usePaymentMethodsQuery: () => ({
    isLoading: { value: false },
    data: { value: { paymentMethods: [], defaultPaymentMethodId: null } }
  }),
  useSetDefaultPaymentMethodMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useDetachPaymentMethodMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useInvoicesQuery: () => ({ isLoading: { value: false }, data: { value: { invoices: [] } } })
}))

vi.mock('@/composables/billing/subscription-labels', async () => {
  const { computed } = await import('vue')
  return {
    useSubscriptionLabels: () => ({
      subscription: computed(() => null),
      cost: computed(() => null),
      status: computed(() => null),
      description: computed(() => null)
    })
  }
})

// ── Stubs ─────────────────────────────────────────────────────────────────────

const PlanSectionStub = defineComponent({
  name: 'PlanSection',
  props: ['subscriptionQuery'],
  setup() {
    return () => h('div', { 'data-testid': 'plan-section-stub' })
  }
})

const PaymentMethodsSectionStub = defineComponent({
  name: 'PaymentMethodsSection',
  setup() {
    return () => h('div', { 'data-testid': 'payment-methods-section-stub' })
  }
})

const SettingsBackButtonStub = defineComponent({
  name: 'SettingsBackButton',
  emits: ['back'],
  setup(_p, { emit }) {
    return () => h('button', { 'data-testid': 'back-button-stub', onClick: () => emit('back') })
  }
})

const SectionListStub = defineComponent({
  name: 'SectionList',
  inheritAttrs: false,
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'section-list-stub' }, slots.default?.())
  }
})

import TabSubscription from '@/components/settings/tab-subscription/index.vue'

// ── Factory ───────────────────────────────────────────────────────────────────

function makeTab() {
  return mount(TabSubscription, {
    global: {
      stubs: {
        PlanSection: PlanSectionStub,
        PaymentMethodsSection: PaymentMethodsSectionStub,
        SettingsBackButton: SettingsBackButtonStub,
        SectionList: SectionListStub
      }
    }
  })
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  memberState.plan = 'free'
  memberState.plan_display_name = 'Free'
  subscriptionQueryState.isLoading = false
  subscriptionQueryState.error = null
  subscriptionQueryState.data = null
})

// ── Flat structure ────────────────────────────────────────────────────────────

describe('TabSubscription — layout', () => {
  test('always renders plan-section regardless of plan [obligation]', () => {
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="plan-section-stub"]').exists()).toBe(true)
  })

  test('hides payment-methods-section for a free member [obligation]', () => {
    memberState.plan = 'free'
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="payment-methods-section-stub"]').exists()).toBe(false)
  })

  test('renders payment-methods-section for a paid member [obligation]', () => {
    memberState.plan = 'paid'
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="payment-methods-section-stub"]').exists()).toBe(true)
  })

  test('emits back when the back button is pressed', async () => {
    const wrapper = makeTab()
    await wrapper.find('[data-testid="back-button-stub"]').trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })
})
