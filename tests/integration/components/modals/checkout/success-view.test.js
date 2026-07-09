import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import SuccessView from '@/components/billing/checkout-modal/success-view.vue'

describe('SuccessView', () => {
  test('renders the success heading and message', () => {
    const wrapper = shallowMount(SuccessView)
    expect(wrapper.find('[data-testid="checkout__success"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout__success-heading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout__success-message"]').exists()).toBe(true)
  })
})
