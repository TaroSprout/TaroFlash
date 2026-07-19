import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import DeckHeroSkeleton from '@/views/deck/deck-hero/skeleton.vue'

vi.mock('gsap', () => ({ gsap: { fromTo: vi.fn(), to: vi.fn() } }))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const CardStub = defineComponent({
  name: 'Card',
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

function mountSkeleton() {
  return shallowMount(DeckHeroSkeleton, {
    global: {
      stubs: { Card: CardStub }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeckHeroSkeleton (deck-hero/skeleton.vue)', () => {
  // ── Root element ──────────────────────────────────────────────────────────

  test('renders root with data-testid="deck-hero-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="deck-hero-skeleton"]').exists()).toBe(true)
  })

  test('renders the details section', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="deck-hero-skeleton__details"]').exists()).toBe(true)
  })

  // ── Card stub ─────────────────────────────────────────────────────────────

  test('renders exactly one Card', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(1)
  })

  test('card is rendered at side="cover"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-side')).toBe('cover')
  })

  test('card has shimmer enabled', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findComponent(CardStub).props('shimmer')).toBe(true)
  })

  // ── DEFAULT_COVER (brown-300 / stone-900 / diagonal-stripes) ─────────────

  test('card uses DEFAULT_COVER theme=brown-300', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-cover-theme')).toBe(
      'brown-300'
    )
  })

  test('card uses DEFAULT_COVER theme_dark=stone-900', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-cover-theme-dark')).toBe(
      'stone-900'
    )
  })

  test('card uses DEFAULT_COVER pattern=diagonal-stripes', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="card-stub"]').attributes('data-cover-pattern')).toBe(
      'diagonal-stripes'
    )
  })

  // ── Detail bars ───────────────────────────────────────────────────────────

  test('renders three placeholder detail bars', () => {
    const wrapper = mountSkeleton()
    const bars = wrapper.find('[data-testid="deck-hero-skeleton__details"]').findAll('div')
    expect(bars).toHaveLength(3)
  })
})
