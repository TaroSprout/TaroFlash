import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { PLANS } from '@/config/plans'

// ── Hoisted state ─────────────────────────────────────────────────────────────

const { memberState } = vi.hoisted(() => ({
  memberState: { plan: 'paid' }
}))

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Display name now comes from PLANS[member.plan].displayName, not a
// member-store field — the store only needs to expose `plan`.
vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({
    get plan() {
      return memberState.plan
    }
  })
}))

vi.mock('@/composables/billing/subscription-labels', async () => {
  const { computed } = await import('vue')
  return {
    useSubscriptionLabels: (query) => ({
      subscription: computed(() => query.data.value ?? null),
      cost: computed(() => {
        const sub = query.data.value
        if (!sub?.priceCents) return null
        return `$${(sub.priceCents / 100).toFixed(2)} / ${sub.interval}`
      }),
      status: computed(() => {
        const sub = query.data.value
        if (!sub) return null
        if (sub.cancelAtPeriodEnd) return 'Canceled'
        if (sub.status === 'active') return 'Active'
        return sub.status
      }),
      description: computed(() => {
        const sub = query.data.value
        if (!sub) return null
        if (sub.cancelAtPeriodEnd) return `Ends ${sub.currentPeriodEnd}`
        return `Renews ${sub.currentPeriodEnd}`
      })
    })
  }
})

// ── Stubs ─────────────────────────────────────────────────────────────────────

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  inheritAttrs: false,
  setup(_props, { slots }) {
    const attrs = useAttrs()
    return () => h('div', { ...attrs, 'data-testid': 'labeled-section-stub' }, slots.default?.())
  }
})

const PlanPillStub = defineComponent({
  name: 'PlanPill',
  inheritAttrs: false,
  props: {
    name: String,
    cost: { default: null },
    status: { default: null },
    description: { default: null },
    loading: { type: Boolean, default: false }
  },
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-testid': 'plan-pill', 'data-loading': props.loading }, [
        h('p', { 'data-testid': 'plan-pill__name' }, props.name),
        props.cost ? h('p', { 'data-testid': 'plan-pill__cost-value' }, props.cost) : null,
        props.status ? h('span', { 'data-testid': 'plan-pill__status' }, props.status) : null,
        props.loading ? null : slots.actions?.()
      ])
  }
})

const PlanActionsStub = defineComponent({
  name: 'PlanActions',
  inheritAttrs: false,
  props: ['subscription'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'plan-actions-stub', 'data-has-sub': String(!!props.subscription) })
  }
})

const PaidFeaturesStub = defineComponent({
  name: 'PaidFeatures',
  setup() {
    return () => h('div', { 'data-testid': 'paid-features-stub' })
  }
})

// ── Factory ───────────────────────────────────────────────────────────────────

const baseSubscription = {
  priceCents: 1000,
  currency: 'usd',
  interval: 'month',
  status: 'active',
  currentPeriodEnd: 1800000000,
  cancelAtPeriodEnd: false,
  upcoming: null
}

function makeSubscriptionQuery(data = null, { isLoading = false, error = null } = {}) {
  return {
    data: { value: data },
    isLoading: { value: isLoading },
    error: { value: error }
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  memberState.plan = 'paid'
})

// ── Free vs paid via member_store.plan ────────────────────────────────────────

describe('plan-section — free vs paid identity', () => {
  test('free member sees the free pill (not skeleton) even when query has no data [obligation]', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery(null, { isLoading: false })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    const pill = wrapper.find('[data-testid="plan-pill"]')
    expect(pill.exists()).toBe(true)
    // Free member never shows the skeleton
    expect(pill.attributes('data-loading')).toBe('false')
  })

  test('paid member with loading query renders skeleton pill (not free pill) [obligation]', async () => {
    memberState.plan = 'paid'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery(null, { isLoading: true })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    // loading=true suppresses the free pill flash
    const pill = wrapper.find('[data-testid="plan-pill"]')
    expect(pill.exists()).toBe(true)
    expect(pill.attributes('data-loading')).toBe('true')
  })

  test('free member never shows a skeleton regardless of query loading state', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery(null, { isLoading: true })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill"]').attributes('data-loading')).toBe('false')
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('plan-section — error state', () => {
  test('renders the plan-error element when paid+errored [obligation]', async () => {
    memberState.plan = 'paid'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery(null, { error: new Error('boom') })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="billing-settings__plan-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-pill"]').exists()).toBe(false)
  })

  test('free member with error does NOT show the error — free member never loads billing [obligation]', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery(null, { error: new Error('boom') })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="billing-settings__plan-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="plan-pill"]').exists()).toBe(true)
  })
})

// ── Plan name via PLANS[member.plan].displayName ───────────────────────────────

describe('plan-section — plan name', () => {
  test('pill name comes from PLANS.paid.displayName for a paid member [obligation]', async () => {
    memberState.plan = 'paid'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(baseSubscription) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__name"]').text()).toBe(PLANS.paid.displayName)
  })

  test('pill name comes from PLANS.free.displayName for a free member [obligation]', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(null) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__name"]').text()).toBe(PLANS.free.displayName)
  })
})

// ── Cost display ──────────────────────────────────────────────────────────────

describe('plan-section — cost display', () => {
  test('shows cost when priceCents is set on the DTO [obligation]', async () => {
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(baseSubscription) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__cost-value"]').exists()).toBe(true)
  })

  test('hides cost when priceCents is null on the DTO [obligation]', async () => {
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery({ ...baseSubscription, priceCents: null })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__cost-value"]').exists()).toBe(false)
  })
})

// ── Status badge ──────────────────────────────────────────────────────────────

describe('plan-section — status badge', () => {
  test('active paid sub shows a status badge (Active) [obligation]', async () => {
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(baseSubscription) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__status"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-pill__status"]').text()).toBe('Active')
  })

  test('canceling sub (cancelAtPeriodEnd=true) shows Canceled status badge [obligation]', async () => {
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery({ ...baseSubscription, cancelAtPeriodEnd: true })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__status"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-pill__status"]').text()).toBe('Canceled')
  })

  test('free member has no status badge (null status)', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(null) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-pill__status"]').exists()).toBe(false)
  })
})

// ── PlanActions receives the subscription DTO ─────────────────────────────────

describe('plan-section — plan-actions slot', () => {
  test('passes subscription DTO to plan-actions slot [obligation]', async () => {
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(baseSubscription) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="plan-actions-stub"]').attributes('data-has-sub')).toBe(
      'true'
    )
  })

  test('free-plan pill receives no #actions slot (plan-actions not rendered) [obligation]', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(null) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    // For free members, v-if="is_paid" on the #actions template means
    // PlanActions is never mounted
    expect(wrapper.find('[data-testid="plan-actions-stub"]').exists()).toBe(false)
  })
})

// ── PaidFeatures visibility [obligation] ──────────────────────────────────────

describe('plan-section — paid-features visibility [obligation]', () => {
  test('paid-features renders for free member with no error [obligation]', async () => {
    memberState.plan = 'free'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(null) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="paid-features-stub"]').exists()).toBe(true)
  })

  test('paid-features is suppressed for paid member [obligation]', async () => {
    memberState.plan = 'paid'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: { subscriptionQuery: makeSubscriptionQuery(baseSubscription) },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="paid-features-stub"]').exists()).toBe(false)
  })

  test('paid-features is suppressed when errored (paid+error shows error view) [obligation]', async () => {
    memberState.plan = 'paid'
    const PlanSection = (await import('@/components/settings/tab-subscription/plan-section.vue'))
      .default
    const wrapper = shallowMount(PlanSection, {
      props: {
        subscriptionQuery: makeSubscriptionQuery(null, { error: new Error('boom') })
      },
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          LabeledSection: LabeledSectionStub,
          PlanPill: PlanPillStub,
          PlanActions: PlanActionsStub,
          PaidFeatures: PaidFeaturesStub
        }
      }
    })
    expect(wrapper.find('[data-testid="paid-features-stub"]').exists()).toBe(false)
  })
})
