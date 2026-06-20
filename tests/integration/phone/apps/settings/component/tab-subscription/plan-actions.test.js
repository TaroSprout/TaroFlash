import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { onUpgradeMock, onCancelMock, onResumeMock, cancelingState, resumingState } = vi.hoisted(
  () => ({
    onUpgradeMock: vi.fn(),
    onCancelMock: vi.fn(),
    onResumeMock: vi.fn(),
    cancelingState: { value: false },
    resumingState: { value: false }
  })
)

vi.mock('@/composables/member/subscription-actions', () => ({
  useSubscriptionActions: () => ({
    onUpgrade: onUpgradeMock,
    onCancel: onCancelMock,
    onResume: onResumeMock,
    canceling: cancelingState,
    resuming: resumingState
  })
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { slots, emit }) {
    const attrs = useAttrs()
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
  }
})

import PlanActions from '@/phone/apps/settings/component/tab-subscription/plan-actions.vue'

// ── Factory ───────────────────────────────────────────────────────────────────

function makePlanActions(subscription = null) {
  return shallowMount(PlanActions, {
    props: { subscription },
    global: { stubs: { UiButton: UiButtonStub } }
  })
}

const activeSub = {
  priceCents: 1000,
  currency: 'usd',
  interval: 'month',
  status: 'active',
  currentPeriodEnd: 1800000000,
  cancelAtPeriodEnd: false,
  upcoming: null
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  onUpgradeMock.mockReset()
  onCancelMock.mockReset()
  onResumeMock.mockReset()
  cancelingState.value = false
  resumingState.value = false
})

// ── Routing based on subscription DTO ─────────────────────────────────────────

describe('plan-actions — subscription routing', () => {
  test('shows upgrade button when subscription is null (free member) [obligation]', () => {
    const wrapper = makePlanActions(null)
    expect(wrapper.find('[data-testid="tab-subscription__upgrade"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-settings__plan-resume"]').exists()).toBe(false)
  })

  test('shows cancel button when sub present and !cancelAtPeriodEnd [obligation]', () => {
    const wrapper = makePlanActions(activeSub)
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-subscription__upgrade"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-settings__plan-resume"]').exists()).toBe(false)
  })

  test('shows resume button when sub present and cancelAtPeriodEnd=true [obligation]', () => {
    const wrapper = makePlanActions({ ...activeSub, cancelAtPeriodEnd: true })
    expect(wrapper.find('[data-testid="billing-settings__plan-resume"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-subscription__upgrade"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-settings__plan-cancel"]').exists()).toBe(false)
  })
})

// ── Action handlers ───────────────────────────────────────────────────────────

describe('plan-actions — handlers', () => {
  test('pressing upgrade calls onUpgrade', async () => {
    const wrapper = makePlanActions(null)
    await wrapper.find('[data-testid="tab-subscription__upgrade"]').trigger('click')
    expect(onUpgradeMock).toHaveBeenCalledOnce()
  })

  test('pressing cancel calls onCancel', async () => {
    const wrapper = makePlanActions(activeSub)
    await wrapper.find('[data-testid="billing-settings__plan-cancel"]').trigger('click')
    expect(onCancelMock).toHaveBeenCalledOnce()
  })

  test('pressing resume calls onResume', async () => {
    const wrapper = makePlanActions({ ...activeSub, cancelAtPeriodEnd: true })
    await wrapper.find('[data-testid="billing-settings__plan-resume"]').trigger('click')
    expect(onResumeMock).toHaveBeenCalledOnce()
  })
})
