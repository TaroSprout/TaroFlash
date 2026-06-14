import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CardGridSkeleton from '@/views/deck/card-grid/skeleton.vue'
import { deckViewShellKey } from '@/composables/deck/view-shell'

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

function makeShell(grid_size_val = 'md') {
  return { grid_size: ref(grid_size_val) }
}

function mountSkeleton(grid_size_val = 'md') {
  return shallowMount(CardGridSkeleton, {
    global: {
      provide: { [deckViewShellKey]: makeShell(grid_size_val) },
      stubs: { Card: CardStub },
      directives: { sfx: {} }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CardGridSkeleton (card-grid/skeleton.vue)', () => {
  // ── item count ─────────────────────────────────────────────────────────────

  test('renders exactly 20 skeleton items [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="card-grid-skeleton__item"]')).toHaveLength(20)
  })

  test('renders exactly 20 Card stubs (one per item) [obligation]', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(20)
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

  test('all cards are rendered at size="xl"', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAll('[data-testid="card-stub"]')) {
      expect(card.attributes('data-size')).toBe('xl')
    }
  })

  test('all cards are rendered at side="cover"', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAll('[data-testid="card-stub"]')) {
      expect(card.attributes('data-side')).toBe('cover')
    }
  })

  test('all cards have shimmer=true', () => {
    const wrapper = mountSkeleton()
    // Assert via component props (reliable regardless of attribute coercion)
    const cards = wrapper.findAllComponents(CardStub)
    for (const card of cards) {
      expect(card.props('shimmer')).toBe(true)
    }
  })

  // ── root element ───────────────────────────────────────────────────────────

  test('renders root with data-testid="card-grid-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-grid-skeleton"]').exists()).toBe(true)
  })

  // ── no cover_config prop accepted ─────────────────────────────────────────
  // The skeleton accepts no cover_config prop — it always uses DEFAULT_COVER.

  test('component accepts no cover_config prop (DEFAULT_COVER is always used) [obligation]', () => {
    // Verify by mounting without the prop and asserting DEFAULT_COVER is applied
    const wrapper = mountSkeleton()
    const first = wrapper.find('[data-testid="card-stub"]')
    expect(first.attributes('data-cover-theme')).toBe(DEFAULT_COVER_THEME)
    expect(first.attributes('data-cover-theme-dark')).toBe(DEFAULT_COVER_THEME_DARK)
    expect(first.attributes('data-cover-pattern')).toBe(DEFAULT_COVER_PATTERN)
  })
})
