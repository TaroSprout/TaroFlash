import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CardGridSkeleton from '@/views/deck/card-grid/skeleton.vue'

// Stub GSAP so card transition hooks don't error
vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Helpers ───────────────────────────────────────────────────────────────────

// DEFAULT_COVER is module-private; assert its observable values through the
// rendered Card stub props rather than importing the constant directly.
const DEFAULT_COVER_THEME = 'brown-300'
const DEFAULT_COVER_THEME_DARK = 'stone-900'
const DEFAULT_COVER_PATTERN = 'diagonal-stripes'

const CardStub = defineComponent({
  name: 'Card',
  // Declare shimmer as Boolean so Vue coerces the bare `shimmer` attr to true
  props: {
    size: String,
    side: String,
    shimmer: Boolean,
    cover_config: Object
  },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'card-stub',
        'data-size': props.size,
        'data-side': props.side,
        'data-shimmer': String(props.shimmer),
        'data-cover-theme': props.cover_config?.theme,
        'data-cover-theme-dark': props.cover_config?.theme_dark,
        'data-cover-pattern': props.cover_config?.pattern
      })
  }
})

// skeleton.vue accepts size/shimmer/count as props directly (no injection)
function mountSkeleton(props = {}) {
  return shallowMount(CardGridSkeleton, {
    props,
    global: {
      stubs: { Card: CardStub },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CardGridSkeleton (card-grid/skeleton.vue)', () => {
  // ── default props ──────────────────────────────────────────────────────────

  test('renders 40 skeleton items by default (count=40) [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="card-grid-skeleton__item"]')).toHaveLength(40)
  })

  test('renders count=40 Card stubs by default (one per item) [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(40)
  })

  // ── count prop ─────────────────────────────────────────────────────────────

  test('renders exactly count items when count prop is provided [obligation]', () => {
    const wrapper = mountSkeleton({ count: 24 })
    expect(wrapper.findAll('[data-testid="card-grid-skeleton__item"]')).toHaveLength(24)
  })

  test('renders 1 item when count=1', () => {
    const wrapper = mountSkeleton({ count: 1 })
    expect(wrapper.findAll('[data-testid="card-grid-skeleton__item"]')).toHaveLength(1)
  })

  // ── shimmer prop ───────────────────────────────────────────────────────────

  test('all cards have shimmer=true when shimmer prop is omitted (default true) [obligation]', () => {
    const wrapper = mountSkeleton()
    const cards = wrapper.findAllComponents(CardStub)
    for (const card of cards) {
      expect(card.props('shimmer')).toBe(true)
    }
  })

  test('all cards have shimmer=false when shimmer=false is passed [obligation]', () => {
    const wrapper = mountSkeleton({ shimmer: false })
    const cards = wrapper.findAllComponents(CardStub)
    for (const card of cards) {
      expect(card.props('shimmer')).toBe(false)
    }
  })

  // ── DEFAULT_COVER (brown-300 / stone-900 / diagonal-stripes) [obligation] ─

  test('each card uses DEFAULT_COVER theme=brown-300 [obligation]', () => {
    const wrapper = mountSkeleton()
    const cards = wrapper.findAll('[data-testid="card-stub"]')
    for (const card of cards) {
      expect(card.attributes('data-cover-theme')).toBe(DEFAULT_COVER_THEME)
    }
  })

  test('each card uses DEFAULT_COVER theme_dark=stone-900 [obligation]', () => {
    const wrapper = mountSkeleton()
    const cards = wrapper.findAll('[data-testid="card-stub"]')
    for (const card of cards) {
      expect(card.attributes('data-cover-theme-dark')).toBe(DEFAULT_COVER_THEME_DARK)
    }
  })

  test('each card uses DEFAULT_COVER pattern=diagonal-stripes [obligation]', () => {
    const wrapper = mountSkeleton()
    const cards = wrapper.findAll('[data-testid="card-stub"]')
    for (const card of cards) {
      expect(card.attributes('data-cover-pattern')).toBe(DEFAULT_COVER_PATTERN)
    }
  })

  // ── Card props ─────────────────────────────────────────────────────────────

  test('all cards are rendered at size="lg"', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAll('[data-testid="card-stub"]')) {
      expect(card.attributes('data-size')).toBe('lg')
    }
  })

  test('all cards are rendered at side="cover"', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAll('[data-testid="card-stub"]')) {
      expect(card.attributes('data-side')).toBe('cover')
    }
  })

  // ── root element ───────────────────────────────────────────────────────────

  test('renders root with data-testid="card-grid-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-grid-skeleton"]').exists()).toBe(true)
  })

  // ── size prop drives grid_style columns [obligation] ──────────────────────
  // XL_CARD_WIDTH=260, CARD_SCALE: base=0.65, md=0.85, xl=1

  test('grid style uses 169px columns for size="base" [obligation]', () => {
    const wrapper = mountSkeleton({ size: 'base' })
    expect(wrapper.find('.grid').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 169px)'
    )
  })

  test('grid style uses 221px columns for size="md" (default) [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('.grid').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 221px)'
    )
  })

  test('grid style uses 260px columns for size="xl" [obligation]', () => {
    const wrapper = mountSkeleton({ size: 'xl' })
    expect(wrapper.find('.grid').attributes('style')).toContain(
      'grid-template-columns: repeat(auto-fill, 260px)'
    )
  })

  // ── size prop drives gap scaling [obligation] ─────────────────────────────
  // gap = 8 * card_scale: base=5.2px, md=6.8px, xl=8px

  test('gap is 5.2px for size="base" (8 * 0.65) [obligation]', () => {
    const wrapper = mountSkeleton({ size: 'base' })
    expect(wrapper.find('.grid').attributes('style')).toContain('gap: 5.2px')
  })

  test('gap is 6.8px for size="md" (8 * 0.85) [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('.grid').attributes('style')).toContain('gap: 6.8px')
  })

  test('gap is 8px for size="xl" (8 * 1) [obligation]', () => {
    const wrapper = mountSkeleton({ size: 'xl' })
    expect(wrapper.find('.grid').attributes('style')).toContain('gap: 8px')
  })

  // ── no deckViewShellKey injection needed ──────────────────────────────────

  test('renders without any provider context (no inject dependency) [obligation]', () => {
    // skeleton.vue reads size from its own prop, not from deckViewShellKey inject
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-grid-skeleton"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="card-grid-skeleton__item"]')).toHaveLength(40)
  })
})
