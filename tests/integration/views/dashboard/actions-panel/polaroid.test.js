import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

import DashboardActionsPanelPolaroid from '@/views/dashboard/actions-panel/polaroid.vue'

describe('DashboardActionsPanelPolaroid', () => {
  test('renders the polaroid frame and photo placeholder', () => {
    const wrapper = shallowMount(DashboardActionsPanelPolaroid)
    expect(wrapper.find('[data-testid="dashboard-actions-panel__polaroid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-actions-panel__polaroid-photo"]').exists()).toBe(
      true
    )
  })
})
