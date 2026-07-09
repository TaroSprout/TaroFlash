import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { onChangeCardClickMock, queryState } = vi.hoisted(() => ({
  onChangeCardClickMock: vi.fn(),
  queryState: { isLoading: false }
}))

const default_card_ref = ref(null)

vi.mock('@/views/settings/tab-subscription/use-change-cc-click', () => ({
  useChangeCcClick: () => ({
    methods_query: {
      isLoading: {
        get value() {
          return queryState.isLoading
        }
      }
    },
    default_card: default_card_ref,
    onChangeCardClick: onChangeCardClickMock
  })
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

async function makePaymentMethodsSection() {
  const PaymentMethodsSection = (
    await import('@/views/settings/tab-subscription/payment-methods-section.vue')
  ).default

  return shallowMount(PaymentMethodsSection, {
    global: {
      stubs: {
        LabeledSection: LabeledSectionStub,
        UiButton: UiButtonStub
      }
    }
  })
}

function card(id, brand, last4, month = 12, year = 2030) {
  return { id, card: { brand, last4, exp_month: month, exp_year: year } }
}

beforeEach(() => {
  onChangeCardClickMock.mockReset()
  queryState.isLoading = false
  default_card_ref.value = null
})

// ── Loading state ────────────────────────────────────────────────────────────

describe('payment-methods-section — loading state', () => {
  test('shows the loading state while the query is pending', async () => {
    queryState.isLoading = true
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-loading"]').exists()).toBe(
      true
    )
  })
})

// ── Empty state ──────────────────────────────────────────────────────────────

describe('payment-methods-section — empty state', () => {
  test('shows the empty state and add button when there is no default card', async () => {
    default_card_ref.value = null
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-empty"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-change"]').text()).toBe(
      'Add card'
    )
  })
})

// ── Card state ───────────────────────────────────────────────────────────────

describe('payment-methods-section — card state', () => {
  test('shows the default card details when one is returned', async () => {
    default_card_ref.value = card('pm_1', 'visa', '4242')
    const wrapper = await makePaymentMethodsSection()
    const cardEl = wrapper.find('[data-testid="billing-settings__payment-method-card"]')
    expect(cardEl.exists()).toBe(true)
    expect(cardEl.text()).toContain('visa')
    expect(cardEl.text()).toContain('4242')
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-empty"]').exists()).toBe(
      false
    )
  })

  test('shows the change label on the button when a default card exists', async () => {
    default_card_ref.value = card('pm_1', 'visa', '4242')
    const wrapper = await makePaymentMethodsSection()
    expect(wrapper.find('[data-testid="billing-settings__payment-methods-change"]').text()).toBe(
      'Change card'
    )
  })
})

// ── Click forwarding ─────────────────────────────────────────────────────────

describe('payment-methods-section — click forwarding [obligation]', () => {
  test('forwards the button press to onChangeCardClick from useChangeCcClick', async () => {
    const wrapper = await makePaymentMethodsSection()
    await wrapper.find('[data-testid="billing-settings__payment-methods-change"]').trigger('click')
    expect(onChangeCardClickMock).toHaveBeenCalledOnce()
  })
})
