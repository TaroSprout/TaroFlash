import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import ResetPasswordSuccess from '@/views/welcome/reset-password/success.vue'

describe('ResetPasswordSuccess (reset-password/success.vue)', () => {
  test('renders the success container', () => {
    const wrapper = mount(ResetPasswordSuccess)
    expect(wrapper.find('[data-testid="reset-password-modal__success"]').exists()).toBe(true)
  })

  test('renders the party-popper icon', () => {
    const wrapper = mount(ResetPasswordSuccess)
    const icon = wrapper.find('[data-testid="ui-kit-icon"]')
    expect(icon.attributes('alt')).toBe('party-popper')
  })

  test('renders the success heading', () => {
    const wrapper = mount(ResetPasswordSuccess)
    expect(wrapper.find('[data-testid="reset-password-modal__success-heading"]').exists()).toBe(
      true
    )
  })

  test('renders the success message', () => {
    const wrapper = mount(ResetPasswordSuccess)
    expect(wrapper.find('[data-testid="reset-password-modal__success-message"]').exists()).toBe(
      true
    )
  })
})
