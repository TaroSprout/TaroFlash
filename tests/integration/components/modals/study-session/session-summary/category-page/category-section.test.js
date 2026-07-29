import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import CategorySection from '@/views/study-session/session-summary/category-page/category-section.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return { id: 1, deck_id: 1, front_text: 'Q', back_text: 'A', state: 'passed', ...overrides }
}

function mountSection(props = {}) {
  return shallowMount(CategorySection, { props: { name: 'correct', cards: [], ...props } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CategorySection', () => {
  test('renders the section keyed by name', () => {
    const wrapper = mountSection({ name: 'stuck' })
    expect(wrapper.find('[data-testid="session-summary__section-stuck"]').exists()).toBe(true)
  })

  describe('heading', () => {
    test('renders a divider with the heading when provided', () => {
      const wrapper = mountSection({ name: 'correct', heading: 'Correct' })
      expect(
        wrapper.find('[data-testid="session-summary__section-heading-correct"]').exists()
      ).toBe(true)
    })

    test('omits the divider when no heading is provided', () => {
      const wrapper = mountSection({ name: 'new' })
      expect(wrapper.find('[data-testid="session-summary__section-heading-new"]').exists()).toBe(
        false
      )
    })
  })

  test('renders one summary-card per card', () => {
    const cards = [makeCard({ id: 1 }), makeCard({ id: 2 }), makeCard({ id: 3 })]
    const wrapper = mountSection({ name: 'new', cards })

    expect(wrapper.findAllComponents({ name: 'SummaryCard' })).toHaveLength(3)
  })

  test('renders no summary-cards when cards is empty', () => {
    const wrapper = mountSection({ name: 'new', cards: [] })
    expect(wrapper.findAllComponents({ name: 'SummaryCard' })).toHaveLength(0)
  })
})
