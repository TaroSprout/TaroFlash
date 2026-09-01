import '@/styles/main.css'
import { describe, test, expect, afterEach, beforeEach } from 'vite-plus/test'
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

function mountSkeleton(overrides = {}) {
  return mount(DashboardSkeleton, {
    ...overrides,
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
  beforeEach(() => {
    // nav-bar sets this at runtime (src/views/app-shell/nav-bar/index.vue); a
    // known value here lets the viewport-fill assertion resolve a real px
    // number instead of an invalid calc() with an unset custom property.
    document.documentElement.style.setProperty('--nav-height', '64px')
  })

  afterEach(() => {
    document.documentElement.style.overflow = ''
    document.documentElement.style.removeProperty('--nav-height')
  })

  test('sets document.documentElement.style.overflow to "hidden" on mount', () => {
    mountSkeleton()
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  test('clears document.documentElement.style.overflow to "" on unmount', () => {
    const wrapper = mountSkeleton()
    expect(document.documentElement.style.overflow).toBe('hidden')

    wrapper.unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })

  test('renders the root with data-testid="dashboard-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="dashboard-skeleton"]').exists()).toBe(true)
  })

  test('the root fills the viewport below the nav', () => {
    const wrapper = mountSkeleton({ attachTo: document.body })
    const root = wrapper.find('[data-testid="dashboard-skeleton"]').element
    const min_height = Number.parseFloat(getComputedStyle(root).minHeight)

    expect(min_height).toBeCloseTo(window.innerHeight - 64, 0)
    wrapper.unmount()
  })

  test('renders no audio-reader-section element', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="audio-reader-section"]').exists()).toBe(false)
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
      expect(label.classes()).toEqual(expect.arrayContaining(['text-skeleton']))
    }
  })

  // Not a computed-style check: `@theme { --*: initial }` in src/styles/main.css
  // wipes Tailwind's default theme vars, so `animate-pulse` generates no
  // animation at all and `animationName` reads "none" whether the class is
  // present or not. The class itself is the only signal that bites here.
  test('the three sort-options placeholders no longer carry animate-pulse', () => {
    const wrapper = mountSkeleton()
    const items = wrapper.findAll('[data-testid="deck-grid-sort-options-skeleton__item"]')
    expect(items).toHaveLength(3)
    for (const item of items) {
      expect(item.classes()).not.toContain('animate-pulse')
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
