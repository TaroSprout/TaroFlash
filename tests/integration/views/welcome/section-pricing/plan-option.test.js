import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

// ── Stubs ──────────────────────────────────────────────────────────────────────

const UiIconStub = defineComponent({
  name: 'UiIcon',
  props: ['src'],
  setup(props) {
    return () => h('span', { 'data-testid': 'ui-icon', 'data-src': props.src })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import PlanOption from '@/views/welcome/section-pricing/plan-option.vue'

// ── Mount helper ───────────────────────────────────────────────────────────────

function mountOption(props = {}) {
  return shallowMount(PlanOption, {
    props: {
      planId: 'free',
      name: 'Pocket Player',
      price: 'Free',
      features: [],
      ...props
    },
    global: {
      stubs: { UiIcon: UiIconStub }
    }
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PlanOption — structure', () => {
  test('renders the plan-option root element', () => {
    const wrapper = mountOption()
    expect(wrapper.find('[data-testid="plan-option"]').exists()).toBe(true)
  })

  test('renders the plan name', () => {
    const wrapper = mountOption({ name: 'Deck Builder' })
    expect(wrapper.find('[data-testid="plan-option__name"]').text()).toBe('Deck Builder')
  })

  test('renders the price as raw html (v-html)', () => {
    const wrapper = mountOption({ price: '$8<span>/month</span>' })
    const price = wrapper.find('[data-testid="plan-option__price"]')
    expect(price.html()).toContain('$8')
    expect(price.find('span').exists()).toBe(true)
  })

  test('renders the divider', () => {
    const wrapper = mountOption()
    expect(wrapper.find('[data-testid="plan-option__divider"]').exists()).toBe(true)
  })
})

// ── Feature list ───────────────────────────────────────────────────────────────

describe('PlanOption — feature list', () => {
  test('renders one list item per feature', () => {
    const wrapper = mountOption({
      features: [{ key: 'decks', count: 10 }, { key: 'deck-images' }]
    })
    expect(wrapper.findAll('[data-testid="plan-option__list"] li')).toHaveLength(2)
  })

  test('interpolates count into the feature label when count is set', () => {
    const wrapper = mountOption({
      planId: 'free',
      features: [{ key: 'decks', count: 10 }]
    })
    expect(wrapper.text()).toContain('Up to 10 decks')
  })

  test('omits the count arg when feature.count is null', () => {
    const wrapper = mountOption({
      planId: 'free',
      features: [{ key: 'deck-images' }]
    })
    expect(wrapper.text()).toContain('Upload your own deck covers')
  })

  test('renders a checkmark icon for a feature with ok !== false', () => {
    const wrapper = mountOption({ features: [{ key: 'deck-images' }] })
    const item = wrapper.find('li')
    expect(item.attributes('data-ok')).toBeUndefined()
    expect(item.findComponent({ name: 'UiIcon' }).exists()).toBe(true)
  })

  test('marks a feature with ok === false via data-ok and renders no checkmark', () => {
    const wrapper = mountOption({
      planId: 'free',
      features: [{ key: 'no-card-images', ok: false }]
    })
    const item = wrapper.find('li')
    expect(item.attributes('data-ok')).toBe('false')
    expect(item.findComponent({ name: 'UiIcon' }).exists()).toBe(false)
  })
})
