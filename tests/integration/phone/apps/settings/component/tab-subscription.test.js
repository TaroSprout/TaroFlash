import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { memberPlan, subscriptionState, modalOpenMock } = vi.hoisted(() => ({
  memberPlan: { value: 'free' },
  subscriptionState: { isLoading: false, error: null },
  modalOpenMock: vi.fn()
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get plan() {
      return memberPlan.value
    }
  })
}))

vi.mock('@/api/billing', () => ({
  useSubscriptionQuery: () => ({
    isLoading: {
      get value() {
        return subscriptionState.isLoading
      }
    },
    error: {
      get value() {
        return subscriptionState.error
      }
    },
    data: { value: null }
  }),
  useCancelSubscriptionMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useResumeSubscriptionMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  usePaymentMethodsQuery: () => ({
    isLoading: { value: false },
    data: { value: { paymentMethods: [], defaultPaymentMethodId: null } }
  }),
  useSetDefaultPaymentMethodMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useDetachPaymentMethodMutation: () => ({ mutateAsync: vi.fn(), isLoading: { value: false } }),
  useInvoicesQuery: () => ({ isLoading: { value: false }, data: { value: { invoices: [] } } })
}))

vi.mock('@/composables/modal', () => ({
  useModal: () => ({ open: modalOpenMock })
}))

vi.mock('@/phone/apps/settings/component/tab-subscription/plan-section.vue', () => ({
  default: { name: 'PlanSection', render: () => null }
}))
vi.mock('@/phone/apps/settings/component/tab-subscription/payment-methods-section.vue', () => ({
  default: { name: 'PaymentMethodsSection', render: () => null }
}))
vi.mock('@/phone/apps/settings/component/tab-subscription/invoices-section.vue', () => ({
  default: { name: 'InvoicesSection', render: () => null }
}))
vi.mock('@/components/modals/checkout.vue', () => ({
  default: { name: 'Checkout', render: () => null }
}))

import TabSubscription from '@/phone/apps/settings/component/tab-subscription/index.vue'

const ButtonStub = defineComponent({
  name: 'UiButton',
  emits: ['press'],
  inheritAttrs: false,
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

const SectionStub = defineComponent({
  name: 'PlanSection',
  setup() {
    return () => h('div', { 'data-testid': 'plan-section-stub' })
  }
})
const PMStub = defineComponent({
  name: 'PaymentMethodsSection',
  setup() {
    return () => h('div', { 'data-testid': 'payment-methods-section-stub' })
  }
})
const InvStub = defineComponent({
  name: 'InvoicesSection',
  setup() {
    return () => h('div', { 'data-testid': 'invoices-section-stub' })
  }
})

function makeTab() {
  return mount(TabSubscription, {
    global: {
      stubs: {
        UiButton: ButtonStub,
        PlanSection: SectionStub,
        PaymentMethodsSection: PMStub,
        InvoicesSection: InvStub
      },
      mocks: { $t: (k) => k }
    }
  })
}

beforeEach(() => {
  memberPlan.value = 'free'
  subscriptionState.isLoading = false
  subscriptionState.error = null
  modalOpenMock.mockClear()
})

describe('TabSubscription', () => {
  test('renders the upgrade CTA when plan is free', () => {
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="tab-subscription__free"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-subscription__upgrade"]').exists()).toBe(true)
  })

  test('opens the checkout modal when upgrade is clicked', async () => {
    const wrapper = makeTab()
    await wrapper.find('[data-testid="tab-subscription__upgrade"]').trigger('click')
    expect(modalOpenMock).toHaveBeenCalledTimes(1)
  })

  test('renders loading state on paid plan when query is loading', () => {
    memberPlan.value = 'paid'
    subscriptionState.isLoading = true
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="tab-subscription__loading"]').exists()).toBe(true)
  })

  test('renders error state on paid plan when query errors', () => {
    memberPlan.value = 'paid'
    subscriptionState.error = new Error('nope')
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="tab-subscription__error"]').exists()).toBe(true)
  })

  test('renders billing sections on paid plan when query resolves', () => {
    memberPlan.value = 'paid'
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="plan-section-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="payment-methods-section-stub"]').exists()).toBe(true)
  })
})
