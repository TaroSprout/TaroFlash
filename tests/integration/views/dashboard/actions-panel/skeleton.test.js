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

  test('the polaroid placeholder stamps the constant data-station="float" [obligation]', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    expect(
      wrapper
        .find('[data-testid="dashboard-actions-panel-skeleton__polaroid"]')
        .attributes('data-station')
    ).toBe('float')
  })

  test('renders inside the shared shell header and body wrappers', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    expect(wrapper.find('[data-testid="dashboard-actions-panel-shell__header"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="dashboard-actions-panel-shell__body"]').exists()).toBe(true)
  })

  test('the root carries the shimmer class and not animate-pulse [obligation]', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    const root = wrapper.find('[data-testid="dashboard-actions-panel-skeleton"]')
    expect(root.classes()).toContain('shimmer')
    expect(root.classes()).not.toContain('animate-pulse')
  })

  test('the photo square carries the shimmer class and not animate-pulse [obligation]', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    const photo = wrapper.find('[data-testid="dashboard-actions-panel-skeleton__photo"]')
    expect(photo.classes()).toContain('shimmer')
    expect(photo.classes()).not.toContain('animate-pulse')
  })

  test('both body blocks carry the shimmer class and not animate-pulse [obligation]', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    const blocks = wrapper.findAll('[data-testid="dashboard-actions-panel-skeleton__body-block"]')
    expect(blocks).toHaveLength(2)
    for (const block of blocks) {
      expect(block.classes()).toContain('shimmer')
      expect(block.classes()).not.toContain('animate-pulse')
    }
  })

  test('the header block carries the diagonal-stripe texture but no shimmer and no animate-pulse [obligation]', () => {
    const wrapper = mount(DashboardActionsPanelSkeleton)
    const header = wrapper.find('[data-testid="dashboard-actions-panel-skeleton__header-block"]')
    expect(header.classes()).toContain('bgx-diagonal-stripes')
    expect(header.classes()).not.toContain('shimmer')
    expect(header.classes()).not.toContain('animate-pulse')
  })
})
