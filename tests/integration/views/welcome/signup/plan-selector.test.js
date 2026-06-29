import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import { PLANS } from '@/config/plans'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const PlanOptionStub = defineComponent({
  name: 'PlanOption',
  inheritAttrs: false,
  props: {
    selected: { type: Boolean, default: false },
    name: { type: String, default: '' },
    theme: { type: String, default: '' }
  },
  emits: ['select'],
  setup(props, { slots, attrs, emit }) {
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': `plan-option-${props.theme || 'default'}`,
          'data-name': props.name,
          'data-selected': String(props.selected),
          onClick: () => emit('select')
        },
        [slots.header?.(), slots.default?.()]
      )
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import PlanSelector from '@/views/welcome/signup/plan-selector.vue'

// ── Factory ────────────────────────────────────────────────────────────────────

function mountPlanSelector(props = { selected_plan: 'free' }) {
  return shallowMount(PlanSelector, {
    props,
    global: {
      stubs: { PlanOption: PlanOptionStub }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PlanSelector — structure', () => {
  test('renders the plan-selector root element', () => {
    const wrapper = mountPlanSelector()
    expect(wrapper.find('[data-testid="plan-selector"]').exists()).toBe(true)
  })

  test('renders two plan options', () => {
    const wrapper = mountPlanSelector()
    const options = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(options).toHaveLength(2)
  })
})

// ── Plan display names from PLANS config ───────────────────────────────────────

describe('PlanSelector — display names from PLANS config', () => {
  test('free plan option uses PLANS.free.displayName', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const [freePlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(freePlan.attributes('data-name')).toBe(PLANS.free.displayName)
  })

  test('paid plan option uses PLANS.paid.displayName', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const options = wrapper.findAllComponents({ name: 'PlanOption' })
    const paidPlan = options[1]
    expect(paidPlan.attributes('data-name')).toBe(PLANS.paid.displayName)
  })
})

// ── Selection state ───────────────────────────────────────────────────────────

describe('PlanSelector — selection state', () => {
  test('free plan option is selected when selected_plan is "free"', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const [freePlan, paidPlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(freePlan.attributes('data-selected')).toBe('true')
    expect(paidPlan.attributes('data-selected')).toBe('false')
  })

  test('paid plan option is selected when selected_plan is "paid"', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'paid' })
    const [freePlan, paidPlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(freePlan.attributes('data-selected')).toBe('false')
    expect(paidPlan.attributes('data-selected')).toBe('true')
  })
})

// ── select emit ───────────────────────────────────────────────────────────────

describe('PlanSelector — select emit', () => {
  test('emits select("free") when free plan option is clicked', async () => {
    const wrapper = mountPlanSelector({ selected_plan: 'paid' })
    const [freePlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    await freePlan.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['free'])
  })

  test('emits select("paid") when paid plan option is clicked', async () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const options = wrapper.findAllComponents({ name: 'PlanOption' })
    await options[1].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['paid'])
  })
})

// ── Feature labels from PLANS config ─────────────────────────────────────────

describe('PlanSelector — feature labels from PLANS config', () => {
  test('free plan renders deck count feature with interpolated count', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const [freePlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    // PLANS.free.features includes decks with count: 5 → "Up to 5 decks"
    expect(freePlan.text()).toContain(`Up to ${PLANS.free.deckLimit} decks`)
  })

  test('free plan renders card count feature with interpolated count', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const [freePlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(freePlan.text()).toContain(`Up to ${PLANS.free.cardsPerDeckLimit} cards per deck`)
  })

  test('free plan renders deck-images feature (no count)', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const [freePlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(freePlan.text()).toContain('Upload images to decks')
  })

  test('free plan renders all PLANS.free.features', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'free' })
    const [freePlan] = wrapper.findAllComponents({ name: 'PlanOption' })
    expect(freePlan.findAll('p')).toHaveLength(PLANS.free.features.length)
  })

  test('paid plan renders no-deck-limit feature', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'paid' })
    const options = wrapper.findAllComponents({ name: 'PlanOption' })
    const paidPlan = options[1]
    expect(paidPlan.text()).toContain('No deck limit')
  })

  test('paid plan renders all PLANS.paid.features', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'paid' })
    const options = wrapper.findAllComponents({ name: 'PlanOption' })
    const paidPlan = options[1]
    expect(paidPlan.findAll('p')).toHaveLength(PLANS.paid.features.length)
  })

  test('paid plan price is rendered using PLANS.paid.monthlyPriceUsd', () => {
    const wrapper = mountPlanSelector({ selected_plan: 'paid' })
    const options = wrapper.findAllComponents({ name: 'PlanOption' })
    const paidPlan = options[1]
    // The v-html uses t('signup-dialog.plan-paid.price', { price: PLANS.paid.monthlyPriceUsd })
    expect(paidPlan.html()).toContain(String(PLANS.paid.monthlyPriceUsd))
  })
})
