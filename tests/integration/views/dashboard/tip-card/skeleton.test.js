import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

import DashboardTipCardSkeleton from '@/views/dashboard/tip-card/skeleton.vue'

describe('DashboardTipCardSkeleton', () => {
  test('renders the root with data-testid="dashboard-tip-card-skeleton"', () => {
    const wrapper = mount(DashboardTipCardSkeleton)
    expect(wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').exists()).toBe(true)
  })
})
