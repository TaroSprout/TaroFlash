import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

import DashboardTipCardSkeleton from '@/views/dashboard/tip-card/skeleton.vue'

describe('DashboardTipCardSkeleton', () => {
  test('renders the root with data-testid="dashboard-tip-card-skeleton"', () => {
    const wrapper = mount(DashboardTipCardSkeleton)
    expect(wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').exists()).toBe(true)
  })

  test('the root carries the shimmer class [obligation]', () => {
    const wrapper = mount(DashboardTipCardSkeleton)
    expect(wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').classes()).toContain(
      'shimmer'
    )
  })

  test('the tape strip carries the diagonal-stripe texture but no animate-pulse and no shimmer [obligation]', () => {
    const wrapper = mount(DashboardTipCardSkeleton)
    const tape = wrapper.find('[data-testid="dashboard-tip-card-skeleton__tape"]')
    expect(tape.classes()).toContain('bgx-diagonal-stripes')
    expect(tape.classes()).not.toContain('animate-pulse')
    expect(tape.classes()).not.toContain('shimmer')
  })

  test('both text bars carry the diagonal-stripe texture but no animate-pulse and no shimmer [obligation]', () => {
    const wrapper = mount(DashboardTipCardSkeleton)
    const bars = wrapper.findAll('[data-testid="dashboard-tip-card-skeleton__text-bar"]')
    expect(bars).toHaveLength(2)
    for (const bar of bars) {
      expect(bar.classes()).toContain('bgx-diagonal-stripes')
      expect(bar.classes()).not.toContain('animate-pulse')
      expect(bar.classes()).not.toContain('shimmer')
    }
  })
})
