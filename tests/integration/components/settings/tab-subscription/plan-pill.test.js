import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { h } from 'vue'
import PlanPill from '@/components/settings/tab-subscription/plan-pill.vue'

function makePlanPill(props = {}, slots = {}) {
  return shallowMount(PlanPill, {
    props,
    slots
  })
}

// ── Default / loaded state ────────────────────────────────────────────────────

describe('plan-pill — loaded state', () => {
  test('renders the plan name', () => {
    const wrapper = makePlanPill({ name: 'Builder' })
    expect(wrapper.find('[data-testid="plan-pill__name"]').text()).toBe('Builder')
  })

  test('renders the cost when cost prop is set', () => {
    const wrapper = makePlanPill({ name: 'Builder', cost: '$10.00 / month' })
    expect(wrapper.find('[data-testid="plan-pill__cost-value"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-pill__cost-value"]').text()).toBe('$10.00 / month')
  })

  test('omits cost section when cost is null', () => {
    const wrapper = makePlanPill({ name: 'Builder', cost: null })
    expect(wrapper.find('[data-testid="plan-pill__cost"]').exists()).toBe(false)
  })

  test('renders status badge as a separate element when status prop is set [obligation]', () => {
    const wrapper = makePlanPill({ name: 'Builder', status: 'Active' })
    expect(wrapper.find('[data-testid="plan-pill__status"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="plan-pill__status"]').text()).toBe('Active')
  })

  test('omits status badge when status is null', () => {
    const wrapper = makePlanPill({ name: 'Builder', status: null })
    expect(wrapper.find('[data-testid="plan-pill__status"]').exists()).toBe(false)
  })

  test('renders description when description prop is set', () => {
    const wrapper = makePlanPill({ name: 'Builder', description: 'Renews Jan 1' })
    expect(wrapper.find('[data-testid="plan-pill__description"]').text()).toBe('Renews Jan 1')
  })

  test('omits description when description is null', () => {
    const wrapper = makePlanPill({ name: 'Builder', description: null })
    expect(wrapper.find('[data-testid="plan-pill__description"]').exists()).toBe(false)
  })

  test('renders the actions slot when not loading [obligation]', () => {
    const wrapper = makePlanPill(
      { name: 'Builder', loading: false },
      { actions: () => h('button', { 'data-testid': 'actions-slot-content' }, 'Cancel') }
    )
    expect(wrapper.find('[data-testid="plan-pill__actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="actions-slot-content"]').exists()).toBe(true)
  })
})

// ── Loading state ─────────────────────────────────────────────────────────────

describe('plan-pill — loading state', () => {
  test('body has data-loading=true when loading=true [obligation]', () => {
    const wrapper = makePlanPill({ loading: true })
    expect(wrapper.find('[data-testid="plan-pill__body"]').attributes('data-loading')).toBe('true')
  })

  test('body has data-loading=false when loading=false [obligation]', () => {
    const wrapper = makePlanPill({ loading: false })
    expect(wrapper.find('[data-testid="plan-pill__body"]').attributes('data-loading')).toBe('false')
  })

  test('suppresses the actions slot when loading=true [obligation]', () => {
    const wrapper = makePlanPill(
      { name: 'Builder', loading: true },
      { actions: () => h('button', { 'data-testid': 'actions-slot-content' }, 'Cancel') }
    )
    expect(wrapper.find('[data-testid="plan-pill__actions"]').exists()).toBe(false)
  })

  test('shows plan-pill__skeleton (no primary content) when loading=true [obligation]', () => {
    const wrapper = makePlanPill({ loading: true })
    expect(wrapper.find('[data-testid="plan-pill__primary"]').exists()).toBe(false)
  })
})
