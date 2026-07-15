import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import DashboardActionsPanelSkeleton from '@/views/dashboard/actions-panel/skeleton.vue'

describe('DashboardActionsPanelSkeleton (views/dashboard/actions-panel/skeleton.vue)', () => {
  test('renders the root skeleton with data-testid="dashboard-actions-panel-skeleton"', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    expect(wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]').exists()).toBe(true)
  })

  test('renders the polaroid placeholder', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    expect(
      wrapper.find('[data-testid="dashboard-actions-panel-skeleton__polaroid"]').exists()
    ).toBe(true)
  })

  test('renders inside the shared shell header and body wrappers', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    expect(wrapper.find('[data-testid="dashboard-actions-panel-shell__header"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]').exists()).toBe(true)
  })
})
