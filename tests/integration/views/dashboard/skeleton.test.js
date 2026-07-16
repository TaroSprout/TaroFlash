import { describe, test, expect, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DashboardSkeleton from '@/views/dashboard/skeleton.vue'

const DashboardActionsPanelSkeletonStub = defineComponent({
  name: 'DashboardActionsPanelSkeleton',
  setup: () => () => h('div', { 'data-testid': 'actions-panel-skeleton-stub' })
})

const ReviewInboxSkeletonStub = defineComponent({
  name: 'ReviewInboxSkeleton',
  setup: () => () => h('div', { 'data-testid': 'review-inbox-skeleton-stub' })
})

const DeckGridSkeletonStub = defineComponent({
  name: 'DeckGridSkeleton',
  setup: () => () => h('div', { 'data-testid': 'deck-grid-skeleton-stub' })
})

function mountSkeleton() {
  return mount(DashboardSkeleton, {
    global: {
      stubs: {
        DashboardActionsPanelSkeleton: DashboardActionsPanelSkeletonStub,
        ReviewInboxSkeleton: ReviewInboxSkeletonStub,
        DeckGridSkeleton: DeckGridSkeletonStub
      }
    }
  })
}

describe('DashboardSkeleton (views/dashboard/skeleton.vue)', () => {
  afterEach(() => {
    document.documentElement.style.overflow = ''
  })

  test('sets document.documentElement.style.overflow to "hidden" on mount [obligation]', () => {
    mountSkeleton()
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  test('clears document.documentElement.style.overflow to "" on unmount [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(document.documentElement.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })

  test('renders the root with data-testid="dashboard-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="dashboard-skeleton"]').exists()).toBe(true)
  })

  test('includes DashboardActionsPanelSkeleton and DashboardTipCardSkeleton in the left column', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="actions-panel-skeleton-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="dashboard-tip-card-skeleton"]').exists()).toBe(true)
  })

  test('includes ReviewInboxSkeleton and DeckGridSkeleton in the right column', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="review-inbox-skeleton-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deck-grid-skeleton-stub"]').exists()).toBe(true)
  })

  test('renders both dashboard-section headers in loading state', () => {
    const wrapper = mountSkeleton()
    const labels = wrapper.findAll('[data-testid="dashboard-section__label"]')
    for (const label of labels) {
      expect(label.classes()).toEqual(
        expect.arrayContaining(['text-brown-300', 'dark:text-stone-700'])
      )
    }
  })

  test('restores overflow after each mount/unmount cycle', () => {
    const a = mountSkeleton()
    expect(document.documentElement.style.overflow).toBe('hidden')
    a.unmount()
    expect(document.documentElement.style.overflow).toBe('')

    const b = mountSkeleton()
    expect(document.documentElement.style.overflow).toBe('hidden')
    b.unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
