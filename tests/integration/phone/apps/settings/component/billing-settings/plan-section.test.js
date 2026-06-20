import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

const { cancelMutateMock, resumeMutateMock, toastSuccessMock, toastErrorMock, mutationState } =
  vi.hoisted(() => ({
    cancelMutateMock: vi.fn(),
    resumeMutateMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    mutationState: { cancelLoading: false, resumeLoading: false }
  }))

vi.mock('@/api/billing', () => ({
  useCancelSubscriptionMutation: () => ({
    mutateAsync: cancelMutateMock,
    isLoading: {
      get value() {
        return mutationState.cancelLoading
      }
    }
  }),
  useResumeSubscriptionMutation: () => ({
    mutateAsync: resumeMutateMock,
    isLoading: {
      get value() {
        return mutationState.resumeLoading
      }
    }
  })
}))

vi.mock('@/composables/toast', () => ({
  useToast: () => ({ success: toastSuccessMock, error: toastErrorMock })
}))

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  inheritAttrs: false,
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs, 'data-testid': 'labeled-section-stub' }, slots.default?.())
  }
})

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

function makeSubscriptionQuery(subscription, upcoming = null) {
  return {
    data: { value: subscription ? { subscription, upcoming } : null },
    isLoading: { value: false },
    error: { value: null }
  }
}

const baseSubscription = {
  id: 'sub_1',
  status: 'active',
  current_period_end: 1800000000,
  cancel_at_period_end: false,
  canceled_at: null,
  items: {
    data: [
      {
        id: 'si_1',
        price: {
          id: 'price_1',
          unit_amount: 1000,
          currency: 'usd',
          recurring: { interval: 'month' },
          product: { id: 'prod_1', name: 'Pro Plan' }
        }
      }
    ]
  },
  default_payment_method: null
}

async function makePlanSection(subscription = baseSubscription, upcoming = null) {
  const PlanSection = (
    await import('@/phone/apps/settings/component/billing-settings/plan-section.vue')
  ).default

  return shallowMount(PlanSection, {
    props: { subscriptionQuery: makeSubscriptionQuery(subscription, upcoming) },
    global: {
      stubs: {
        LabeledSection: LabeledSectionStub,
        UiButton: UiButtonStub
      }
    }
  })
}

beforeEach(() => {
  cancelMutateMock.mockReset()
  resumeMutateMock.mockReset()
  toastSuccessMock.mockReset()
  toastErrorMock.mockReset()
  mutationState.cancelLoading = false
  mutationState.resumeLoading = false
})

// ── Plan details ──────────────────────────────────────────────────────────────

describe('plan-section — plan details', () => {
  test('renders the paid plan displayName (Builder)', async () => {
    const wrapper = await makePlanSection()
    expect(wrapper.find('[data-testid="billing-settings__plan-name"]').text()).toBe('Builder')
  })

  test('formats the price with currency and interval', async () => {
    const wrapper = await makePlanSection()
    const price = wrapper.find('[data-testid="billing-settings__plan-price"]')
    expect(price.text()).toContain('10.00')
    expect(price.text()).toContain('USD')
    expect(price.text()).toContain('month')
  })

  test('hides the price line when unit_amount is null', async () => {
    const wrapper = await makePlanSection({
      ...baseSubscription,
      items: {
        data: [
          { id: 'si_1', price: { ...baseSubscription.items.data[0].price, unit_amount: null } }
        ]
      }
    })
    expect(wrapper.find('[data-testid="billing-settings__plan-price"]').exists()).toBe(false)
  })
})

// ── status_label ──────────────────────────────────────────────────────────────

describe('plan-section — status_label [obligation]', () => {
  test('does NOT show a status badge for active status', async () => {
    const wrapper = await makePlanSection({ ...baseSubscription, status: 'active' })
    expect(wrapper.find('[data-testid="billing-settings__plan-status"]').exists()).toBe(false)
  })

  test('shows a status badge for non-active status (e.g. past_due)', async () => {
    const wrapper = await makePlanSection({ ...baseSubscription, status: 'past_due' })
    expect(wrapper.find('[data-testid="billing-settings__plan-status"]').exists()).toBe(true)
  })
})

// ── upcoming_charge_label ─────────────────────────────────────────────────────

describe('plan-section — upcoming_charge_label [obligation]', () => {
  test('returns null (hidden) when subscription is null', async () => {
    const PlanSection = (
      await import('@/phone/apps/settings/component/billing-settings/plan-section.vue')
    ).default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(null) },
      global: { stubs: { LabeledSection: LabeledSectionStub, UiButton: UiButtonStub } }
    })
    expect(wrapper.find('[data-testid="billing-settings__plan-upcoming"]').exists()).toBe(false)
  })

  test('returns null (hidden) when cancel_at_period_end is true', async () => {
    const wrapper = await makePlanSection({ ...baseSubscription, cancel_at_period_end: true })
    expect(wrapper.find('[data-testid="billing-settings__plan-upcoming"]').exists()).toBe(false)
  })

  test('falls back to renews-on i18n key when upcoming is absent/null', async () => {
    const wrapper = await makePlanSection(baseSubscription, null)
    const el = wrapper.find('[data-testid="billing-settings__plan-upcoming"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toMatch(/Renews/i)
  })

  test('uses upcoming-charge i18n key with formatted currency when upcoming exists', async () => {
    const upcoming = { currency: 'usd', amount_due: 999 }
    const wrapper = await makePlanSection(baseSubscription, upcoming)
    const el = wrapper.find('[data-testid="billing-settings__plan-upcoming"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toMatch(/Next charge/i)
    expect(el.text()).toContain('9.99')
  })
})

// ── cancel_label ──────────────────────────────────────────────────────────────

describe('plan-section — cancel_label [obligation]', () => {
  test('returns null (hidden) when cancel_at_period_end is false', async () => {
    const wrapper = await makePlanSection({ ...baseSubscription, cancel_at_period_end: false })
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel-date"]').exists()).toBe(false)
  })

  test('returns non-null string when cancel_at_period_end is true', async () => {
    const wrapper = await makePlanSection({ ...baseSubscription, cancel_at_period_end: true })
    const el = wrapper.find('[data-testid="billing-settings__plan-cancel-date"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toMatch(/Cancels/i)
  })
})

// ── Cancel flow (inline confirm) ──────────────────────────────────────────────

describe('plan-section — cancel flow (inline confirm)', () => {
  test('starts collapsed with only the cancel trigger visible', async () => {
    const wrapper = await makePlanSection()
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel-confirm"]').exists()).toBe(
      false
    )
  })

  test('clicking cancel reveals the confirm + abort buttons', async () => {
    const wrapper = await makePlanSection()
    await wrapper.find('[data-testid="billing-settings__plan-cancel"]').trigger('click')
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel-confirm"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel-abort"]').exists()).toBe(true)
  })

  test('abort returns to the collapsed state', async () => {
    const wrapper = await makePlanSection()
    await wrapper.find('[data-testid="billing-settings__plan-cancel"]').trigger('click')
    await wrapper.find('[data-testid="billing-settings__plan-cancel-abort"]').trigger('click')
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel-confirm"]').exists()).toBe(
      false
    )
  })

  test('confirm calls cancelSubscription with atPeriodEnd=true and toasts success', async () => {
    cancelMutateMock.mockResolvedValue({ subscription: baseSubscription })
    const wrapper = await makePlanSection()
    await wrapper.find('[data-testid="billing-settings__plan-cancel"]').trigger('click')
    await wrapper.find('[data-testid="billing-settings__plan-cancel-confirm"]').trigger('click')
    await flushPromises()
    expect(cancelMutateMock).toHaveBeenCalledWith(true)
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  test('toasts an error when the cancel mutation rejects', async () => {
    cancelMutateMock.mockRejectedValue(new Error('api down'))
    const wrapper = await makePlanSection()
    await wrapper.find('[data-testid="billing-settings__plan-cancel"]').trigger('click')
    await wrapper.find('[data-testid="billing-settings__plan-cancel-confirm"]').trigger('click')
    await flushPromises()
    expect(toastErrorMock).toHaveBeenCalled()
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })
})

// ── Resume flow ───────────────────────────────────────────────────────────────

describe('plan-section — resume flow', () => {
  test('shows the resume button when cancel_at_period_end is true', async () => {
    const wrapper = await makePlanSection({ ...baseSubscription, cancel_at_period_end: true })
    expect(wrapper.find('[data-testid="billing-settings__plan-resume"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel"]').exists()).toBe(false)
  })

  test('clicking resume calls resumeSubscription and toasts success', async () => {
    resumeMutateMock.mockResolvedValue({ subscription: baseSubscription })
    const wrapper = await makePlanSection({ ...baseSubscription, cancel_at_period_end: true })
    await wrapper.find('[data-testid="billing-settings__plan-resume"]').trigger('click')
    await flushPromises()
    expect(resumeMutateMock).toHaveBeenCalled()
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  test('toasts an error when the resume mutation rejects', async () => {
    resumeMutateMock.mockRejectedValue(new Error('api down'))
    const wrapper = await makePlanSection({ ...baseSubscription, cancel_at_period_end: true })
    await wrapper.find('[data-testid="billing-settings__plan-resume"]').trigger('click')
    await flushPromises()
    expect(toastErrorMock).toHaveBeenCalled()
  })
})
