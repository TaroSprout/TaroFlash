import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import StatTile from '@/components/study-session/session-summary/stat-tile.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSummary(overrides = {}) {
  return {
    score: 0,
    total: 0,
    new_count: 0,
    leveled_up_count: 0,
    leveled_down_count: 0,
    stuck_count: 0,
    ...overrides
  }
}

function mountTile(summary) {
  return mount(StatTile, { props: { summary } })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StatTile', () => {
  // ── Hidden when all counts are zero [obligation] ──────────────────────────

  test('tile is not rendered when all counts are 0 [obligation]', () => {
    const wrapper = mountTile(makeSummary())
    expect(wrapper.find('[data-testid="session-summary__tile"]').exists()).toBe(false)
  })

  // ── Only non-zero stats render [obligation] ───────────────────────────────

  test('only rows with non-zero counts are rendered [obligation]', () => {
    const wrapper = mountTile(makeSummary({ new_count: 3, leveled_up_count: 0 }))
    expect(wrapper.find('[data-testid="session-summary__tile-stat-new"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__tile-stat-strengthened"]').exists()).toBe(
      false
    )
  })

  // ── Stat label text embeds count [obligation] ─────────────────────────────

  test('new_count label embeds count in text [obligation]', () => {
    const wrapper = mountTile(makeSummary({ new_count: 5 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-new"]').text()).toBe(
      '5 New Cards'
    )
  })

  test('leveled_up_count label embeds count in text [obligation]', () => {
    const wrapper = mountTile(makeSummary({ leveled_up_count: 3 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-strengthened"]').text()).toBe(
      '3 Cards Strengthened'
    )
  })

  test('leveled_down_count label embeds count in text [obligation]', () => {
    const wrapper = mountTile(makeSummary({ leveled_down_count: 2 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-weakened"]').text()).toBe(
      '2 Cards Weakened'
    )
  })

  test('stuck_count label embeds count in text [obligation]', () => {
    const wrapper = mountTile(makeSummary({ stuck_count: 4 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-stuck"]').text()).toBe(
      '4 Cards Stuck'
    )
  })

  // ── Pluralization [obligation] ────────────────────────────────────────────

  test('value=1 uses singular form [obligation]', () => {
    const wrapper = mountTile(makeSummary({ new_count: 1 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-new"]').text()).toBe(
      '1 New Card'
    )
  })

  test('value>1 uses plural form [obligation]', () => {
    const wrapper = mountTile(makeSummary({ new_count: 3 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-new"]').text()).toBe(
      '3 New Cards'
    )
  })

  test('stuck_count=1 uses singular form [obligation]', () => {
    const wrapper = mountTile(makeSummary({ stuck_count: 1 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-stuck"]').text()).toBe(
      '1 Card Stuck'
    )
  })

  // ── Renders tile when any stat is non-zero ────────────────────────────────

  test('tile renders when at least one count is non-zero', () => {
    const wrapper = mountTile(makeSummary({ new_count: 1 }))
    expect(wrapper.find('[data-testid="session-summary__tile"]').exists()).toBe(true)
  })

  test('renders all four stat rows when all counts are non-zero', () => {
    const wrapper = mountTile(
      makeSummary({ new_count: 1, leveled_up_count: 2, leveled_down_count: 3, stuck_count: 4 })
    )
    expect(wrapper.find('[data-testid="session-summary__tile-stat-new"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__tile-stat-strengthened"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="session-summary__tile-stat-weakened"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="session-summary__tile-stat-stuck"]').exists()).toBe(true)
  })
})
