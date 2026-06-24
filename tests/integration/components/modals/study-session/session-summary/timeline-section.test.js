import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import TimelineSection from '@/components/study-session/session-summary/timeline-section.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSummary(overrides = {}) {
  return {
    score: 2,
    total: 3,
    new_count: 0,
    reinforced_count: 3,
    mastery_before: { forming: 3, familiar: 0, strong: 0, mastered: 0 },
    mastery_after: { forming: 1, familiar: 2, strong: 0, mastered: 0 },
    timeline: [
      { key: '1w', count: 2 },
      { key: '1mo', count: 1 }
    ],
    leeches: [],
    ...overrides
  }
}

function mountTimeline(summary = makeSummary()) {
  return mount(TimelineSection, { props: { summary } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TimelineSection', () => {
  // ── Root element ────────────────────────────────────────────────────────────

  test('renders the timeline root element', () => {
    const wrapper = mountTimeline()
    expect(wrapper.find('[data-testid="session-summary__timeline"]').exists()).toBe(true)
  })

  // ── Bar chart ───────────────────────────────────────────────────────────────

  test('renders a bar chart', () => {
    const wrapper = mountTimeline()
    expect(wrapper.find('[data-testid="ui-bar-chart"]').exists()).toBe(true)
  })

  test('renders one bar per timeline entry', () => {
    const wrapper = mountTimeline()
    const bars = wrapper.findAll('[data-testid="ui-bar-chart__bar"]')
    expect(bars).toHaveLength(2)
  })

  test('renders correct number of bars for a single-entry timeline', () => {
    const summary = makeSummary({ timeline: [{ key: '3d', count: 5 }] })
    const wrapper = mountTimeline(summary)
    expect(wrapper.findAll('[data-testid="ui-bar-chart__bar"]')).toHaveLength(1)
  })

  test('renders correct number of bars for a multi-entry timeline', () => {
    const summary = makeSummary({
      timeline: [
        { key: '1d', count: 1 },
        { key: '1w', count: 3 },
        { key: '3mo', count: 2 }
      ]
    })
    const wrapper = mountTimeline(summary)
    expect(wrapper.findAll('[data-testid="ui-bar-chart__bar"]')).toHaveLength(3)
  })

  // ── Bucket labels ───────────────────────────────────────────────────────────

  test('shows translated bucket label for 1w', () => {
    const summary = makeSummary({ timeline: [{ key: '1w', count: 2 }] })
    const wrapper = mountTimeline(summary)
    // i18n key: session-summary.timeline.bucket.1w → "1wk"
    expect(wrapper.find('[data-testid="ui-bar-chart"]').text()).toContain('1wk')
  })

  test('shows translated bucket label for 1mo', () => {
    const summary = makeSummary({ timeline: [{ key: '1mo', count: 1 }] })
    const wrapper = mountTimeline(summary)
    expect(wrapper.find('[data-testid="ui-bar-chart"]').text()).toContain('1mo')
  })

  test('shows translated bucket label for max', () => {
    const summary = makeSummary({ timeline: [{ key: 'max', count: 4 }] })
    const wrapper = mountTimeline(summary)
    // i18n key: session-summary.timeline.bucket.max → "6mo+"
    expect(wrapper.find('[data-testid="ui-bar-chart"]').text()).toContain('6mo+')
  })

  // ── Bar values ──────────────────────────────────────────────────────────────

  test('bar chart shows the card count for each bucket', () => {
    const summary = makeSummary({ timeline: [{ key: '1d', count: 7 }] })
    const wrapper = mountTimeline(summary)
    expect(wrapper.find('[data-testid="ui-bar-chart"]').text()).toContain('7')
  })

  // ── Empty timeline ──────────────────────────────────────────────────────────

  test('renders zero bars when timeline is empty', () => {
    const summary = makeSummary({ timeline: [] })
    const wrapper = mountTimeline(summary)
    expect(wrapper.findAll('[data-testid="ui-bar-chart__bar"]')).toHaveLength(0)
  })

  // ── Heading ─────────────────────────────────────────────────────────────────

  test('renders the section heading', () => {
    const wrapper = mountTimeline()
    expect(wrapper.text()).toContain('When these come back')
  })
})
