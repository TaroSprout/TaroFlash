import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import MasterySection from '@/components/study-session/session-summary/mastery-section.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSummary(overrides = {}) {
  return {
    score: 3,
    total: 4,
    new_count: 0,
    reinforced_count: 4,
    mastery_before: { forming: 2, familiar: 1, strong: 1, mastered: 0 },
    mastery_after: { forming: 0, familiar: 2, strong: 1, mastered: 1 },
    timeline: [{ key: '1w', count: 4 }],
    leeches: [],
    ...overrides
  }
}

function mountMastery(summary = makeSummary()) {
  return mount(MasterySection, { props: { summary } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MasterySection', () => {
  // ── Root element ────────────────────────────────────────────────────────────

  test('renders the mastery root element', () => {
    const wrapper = mountMastery()
    expect(wrapper.find('[data-testid="session-summary__mastery"]').exists()).toBe(true)
  })

  // ── Rows ────────────────────────────────────────────────────────────────────

  test('renders exactly two mastery rows (Before and After)', () => {
    const wrapper = mountMastery()
    const rows = wrapper.findAll('[data-testid="session-summary__mastery-row"]')
    expect(rows).toHaveLength(2)
  })

  test('first row label contains "Before"', () => {
    const wrapper = mountMastery()
    const rows = wrapper.findAll('[data-testid="session-summary__mastery-row"]')
    expect(rows[0].text()).toContain('Before')
  })

  test('second row label contains "After"', () => {
    const wrapper = mountMastery()
    const rows = wrapper.findAll('[data-testid="session-summary__mastery-row"]')
    expect(rows[1].text()).toContain('After')
  })

  // ── Stacked bars ────────────────────────────────────────────────────────────

  test('renders two stacked bar charts (one per row)', () => {
    const wrapper = mountMastery()
    expect(wrapper.findAll('[data-testid="ui-stacked-bar"]')).toHaveLength(2)
  })

  test('before bar shows segments only for non-zero bands', () => {
    const summary = makeSummary({
      mastery_before: { forming: 2, familiar: 1, strong: 1, mastered: 0 }
    })
    const wrapper = mountMastery(summary)
    // Three non-zero bands in before row — segments with value > 0 are rendered
    const bars = wrapper.findAll('[data-testid="ui-stacked-bar"]')
    const before_segments = bars[0].findAll('[data-testid="ui-stacked-bar__segment"]')
    expect(before_segments).toHaveLength(3)
  })

  test('after bar shows segments for all four bands when all are non-zero', () => {
    const summary = makeSummary({
      mastery_after: { forming: 1, familiar: 1, strong: 1, mastered: 1 }
    })
    const wrapper = mountMastery(summary)
    const bars = wrapper.findAll('[data-testid="ui-stacked-bar"]')
    const after_segments = bars[1].findAll('[data-testid="ui-stacked-bar__segment"]')
    expect(after_segments).toHaveLength(4)
  })

  test('shows zero segments in a bar when all band counts are zero', () => {
    const summary = makeSummary({
      mastery_before: { forming: 0, familiar: 0, strong: 0, mastered: 0 }
    })
    const wrapper = mountMastery(summary)
    const bars = wrapper.findAll('[data-testid="ui-stacked-bar"]')
    const before_segments = bars[0].findAll('[data-testid="ui-stacked-bar__segment"]')
    expect(before_segments).toHaveLength(0)
  })

  // ── Legend ──────────────────────────────────────────────────────────────────

  test('renders the legend', () => {
    const wrapper = mountMastery()
    expect(wrapper.find('[data-testid="session-summary__mastery-legend"]').exists()).toBe(true)
  })

  test('legend contains all four band labels', () => {
    const wrapper = mountMastery()
    const legend = wrapper.find('[data-testid="session-summary__mastery-legend"]').text()
    expect(legend).toContain('Learning')
    expect(legend).toContain('Familiar')
    expect(legend).toContain('Strong')
    expect(legend).toContain('Mastered')
  })

  // ── Reinforced count ────────────────────────────────────────────────────────

  test('shows the reinforced count from summary', () => {
    const summary = makeSummary({ reinforced_count: 7 })
    const wrapper = mountMastery(summary)
    expect(wrapper.text()).toContain('7')
  })
})
