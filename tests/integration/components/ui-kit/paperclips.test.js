import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

import UiPaperclips from '@/components/ui-kit/paperclips.vue'

describe('ui-kit/paperclips', () => {
  test('renders the bare amount when unsigned (default)', () => {
    const wrapper = shallowMount(UiPaperclips, { props: { amount: 12 } })
    expect(wrapper.find('[data-testid="ui-kit-paperclips__amount"]').text()).toBe('12')
  })

  test('renders the bare amount when signed is explicitly false', () => {
    const wrapper = shallowMount(UiPaperclips, { props: { amount: 12, signed: false } })
    expect(wrapper.find('[data-testid="ui-kit-paperclips__amount"]').text()).toBe('12')
  })

  test('renders a leading + when signed is true', () => {
    const wrapper = shallowMount(UiPaperclips, { props: { amount: 12, signed: true } })
    expect(wrapper.find('[data-testid="ui-kit-paperclips__amount"]').text()).toBe('+12')
  })

  test('renders the icon', () => {
    const wrapper = shallowMount(UiPaperclips, { props: { amount: 12 } })
    expect(wrapper.find('[data-testid="ui-kit-paperclips__icon"]').exists()).toBe(true)
  })

  test('the root carries data-palette="brand"', () => {
    const wrapper = shallowMount(UiPaperclips, { props: { amount: 12 } })
    expect(wrapper.find('[data-testid="ui-kit-paperclips"]').attributes('data-palette')).toBe(
      'brand'
    )
  })
})
