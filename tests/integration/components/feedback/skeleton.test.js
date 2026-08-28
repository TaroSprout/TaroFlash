import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import FeedbackSkeleton from '@/components/feedback/skeleton.vue'

function mountSkeleton(props = {}) {
  return shallowMount(FeedbackSkeleton, { props })
}

describe('FeedbackSkeleton (components/feedback/skeleton.vue)', () => {
  test('renders 4 placeholder cards by default [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="feedback-skeleton__item"]')).toHaveLength(4)
  })

  test('renders exactly count placeholder cards when count prop is provided [obligation]', () => {
    const wrapper = mountSkeleton({ count: 2 })
    expect(wrapper.findAll('[data-testid="feedback-skeleton__item"]')).toHaveLength(2)
  })

  test('each placeholder card renders a polaroid frame, content bars, and a vote-column', () => {
    const wrapper = mountSkeleton({ count: 1 })
    const item = wrapper.find('[data-testid="feedback-skeleton__item"]')
    expect(item.find('[data-testid="feedback-skeleton__polaroid"]').exists()).toBe(true)
    expect(item.find('[data-testid="feedback-skeleton__content"]').exists()).toBe(true)
    expect(item.find('[data-testid="feedback-skeleton__vote-wrap"]').exists()).toBe(true)
  })
})
