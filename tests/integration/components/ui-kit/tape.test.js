import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

import UiTape from '@/components/ui-kit/tape.vue'

describe('ui-kit/tape', () => {
  test('renders the label when passed', () => {
    const wrapper = mount(UiTape, { props: { label: 'Tip' } })
    expect(wrapper.find('[data-testid="ui-kit-tape__label"]').text()).toBe('Tip')
  })

  test('renders nothing in the label slot when label is omitted', () => {
    const wrapper = mount(UiTape)
    expect(wrapper.find('[data-testid="ui-kit-tape__label"]').exists()).toBe(false)
  })
})
