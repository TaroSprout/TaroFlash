import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import TabReviewHistory from '@/views/deck/deck-settings/tab-review-history/index.vue'

function makeTab() {
  return mount(TabReviewHistory, {
    global: {
      mocks: { $t: (k) => k }
    }
  })
}

describe('TabReviewHistory', () => {
  test('renders the tab-review-history container', () => {
    const wrapper = makeTab()
    expect(wrapper.find('[data-testid="tab-review-history"]').exists()).toBe(true)
  })

  // [obligation] placeholder tab renders the coming-soon copy
  test('renders the coming-soon placeholder copy [obligation]', () => {
    const wrapper = makeTab()
    const placeholder = wrapper.find('[data-testid="tab-review-history__placeholder"]')
    expect(placeholder.exists()).toBe(true)
    expect(placeholder.text()).toBe('Coming very soon')
  })
})
