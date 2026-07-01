import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import PaymentStatus from '@/components/modals/checkout/payment-status.vue'

function mountStatus(status) {
  return shallowMount(PaymentStatus, { props: { status } })
}

describe('PaymentStatus', () => {
  test('shows the loading message while loading', () => {
    const wrapper = mountStatus('loading')
    expect(wrapper.find('[data-testid="checkout__loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout__error"]').exists()).toBe(false)
  })

  test('shows the error message while errored', () => {
    const wrapper = mountStatus('error')
    expect(wrapper.find('[data-testid="checkout__error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="checkout__loading"]').exists()).toBe(false)
  })

  test('renders nothing for form/confirming/success statuses', () => {
    for (const status of ['form', 'confirming', 'success']) {
      const wrapper = mountStatus(status)
      expect(wrapper.find('[data-testid="checkout__loading"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="checkout__error"]').exists()).toBe(false)
    }
  })
})
