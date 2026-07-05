import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const SectionHeaderStub = defineComponent({
  name: 'SectionHeader',
  props: ['heading', 'subtitle'],
  setup(props) {
    return () => h('div', { 'data-testid': 'section-header' }, props.heading)
  }
})

const PlanGridStub = defineComponent({
  name: 'PlanGrid',
  setup() {
    return () => h('div', { 'data-testid': 'plan-grid' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import SectionPricing from '@/views/welcome/section-pricing/index.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountPricing() {
  return shallowMount(SectionPricing, {
    global: { stubs: { SectionHeader: SectionHeaderStub, PlanGrid: PlanGridStub } }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SectionPricing', () => {
  test('renders the pricing section container', () => {
    const wrapper = mountPricing()
    expect(wrapper.find('[data-testid="welcome-pricing"]').exists()).toBe(true)
  })

  test('renders the section header with the pricing heading/subtitle', () => {
    const wrapper = mountPricing()
    expect(wrapper.findComponent({ name: 'SectionHeader' }).props()).toMatchObject({
      heading: "Pay if you can. Play for free if you can't.",
      subtitle: 'The free plan is genuinely usable. Paid plans help keep the project going.'
    })
  })

  test('renders the plan grid', () => {
    const wrapper = mountPricing()
    expect(wrapper.find('[data-testid="plan-grid"]').exists()).toBe(true)
  })

  test('renders the footnote', () => {
    const wrapper = mountPricing()
    const footnote = wrapper.find('[data-testid="welcome-pricing__footnote"]')
    expect(footnote.exists()).toBe(true)
    expect(footnote.text()).toContain('one person!')
  })
})
