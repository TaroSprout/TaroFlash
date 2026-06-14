import { describe, test, expect, vi, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DeckSkeleton from '@/views/deck/skeleton.vue'

vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const DeckHeroSkeletonStub = defineComponent({
  name: 'DeckHeroSkeleton',
  setup: () => () => h('div', { 'data-testid': 'deck-hero-skeleton-stub' })
})

const ModeToolbarSkeletonStub = defineComponent({
  name: 'ModeToolbarSkeleton',
  setup: () => () => h('div', { 'data-testid': 'mode-toolbar-skeleton-stub' })
})

const CardGridSkeletonStub = defineComponent({
  name: 'CardGridSkeleton',
  setup: () => () => h('div', { 'data-testid': 'card-grid-skeleton-stub' })
})

function mountSkeleton() {
  return mount(DeckSkeleton, {
    global: {
      stubs: {
        DeckHeroSkeleton: DeckHeroSkeletonStub,
        ModeToolbarSkeleton: ModeToolbarSkeletonStub,
        CardGridSkeleton: CardGridSkeletonStub
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeckSkeleton (views/deck/skeleton.vue)', () => {
  afterEach(() => {
    // Ensure overflow is cleaned up between tests regardless of unmount order
    document.documentElement.style.overflow = ''
  })

  // ── Scroll-lock side effects ───────────────────────────────────────────────

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

  // ── Composition ───────────────────────────────────────────────────────────

  test('renders the root section with data-testid="deck-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="deck-skeleton"]').exists()).toBe(true)
  })

  test('includes DeckHeroSkeleton sub-skeleton', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="deck-hero-skeleton-stub"]').exists()).toBe(true)
  })

  test('includes ModeToolbarSkeleton sub-skeleton', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="mode-toolbar-skeleton-stub"]').exists()).toBe(true)
  })

  test('includes CardGridSkeleton sub-skeleton', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-grid-skeleton-stub"]').exists()).toBe(true)
  })

  // ── Multiple mount/unmount cycles ─────────────────────────────────────────

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
