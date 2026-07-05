import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import { PLANS } from '@/config/plans'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const PlanOptionStub = defineComponent({
  name: 'PlanOption',
  inheritAttrs: false,
  props: {
    planId: String,
    name: String,
    price: String,
    features: { type: Array, default: () => [] }
  },
  setup(props) {
    const attrs = useAttrs()
    return () =>
      h('div', {
        ...attrs,
        'data-testid': `plan-option-${props.planId}`,
        'data-name': props.name,
        'data-price': props.price,
        'data-feature-count': props.features.length
      })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import PlanGrid from '@/views/welcome/section-pricing/plan-grid.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountGrid() {
  return shallowMount(PlanGrid, {
    global: { stubs: { PlanOption: PlanOptionStub } }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PlanGrid', () => {
  test('renders the plan-grid root element', () => {
    const wrapper = mountGrid()
    expect(wrapper.find('[data-testid="plan-grid"]').exists()).toBe(true)
  })

  test('renders exactly two plan options', () => {
    const wrapper = mountGrid()
    expect(wrapper.findAllComponents({ name: 'PlanOption' })).toHaveLength(2)
  })

  test('free plan option uses PLANS.free.displayName and features', () => {
    const wrapper = mountGrid()
    const free = wrapper.find('[data-testid="plan-option-free"]')
    expect(free.attributes('data-name')).toBe(PLANS.free.displayName)
    expect(Number(free.attributes('data-feature-count'))).toBe(PLANS.free.features.length)
  })

  test('paid plan option uses PLANS.paid.displayName and features', () => {
    const wrapper = mountGrid()
    const paid = wrapper.find('[data-testid="plan-option-paid"]')
    expect(paid.attributes('data-name')).toBe(PLANS.paid.displayName)
    expect(Number(paid.attributes('data-feature-count'))).toBe(PLANS.paid.features.length)
  })

  test('paid plan price includes PLANS.paid.monthlyPriceUsd', () => {
    const wrapper = mountGrid()
    const paid = wrapper.find('[data-testid="plan-option-paid"]')
    expect(paid.attributes('data-price')).toContain(String(PLANS.paid.monthlyPriceUsd))
  })
})
