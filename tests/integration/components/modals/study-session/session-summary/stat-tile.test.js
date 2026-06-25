import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import StatTile from '@/components/study-session/session-summary/stat-tile.vue'
import { studyViewportKey } from '@/components/study-session/viewport-context'

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

function mountTile(summary, viewport = 'desktop') {
  return mount(StatTile, {
    props: { summary },
    global: {
      provide: {
        [studyViewportKey]: computed(() => viewport)
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StatTile', () => {
  // ── Stat values rendered correctly [obligation] ───────────────────────────

  test('renders new_count in tile-value-new [obligation]', () => {
    const wrapper = mountTile(makeSummary({ new_count: 5 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-new"]').text()).toBe('5')
  })

  test('renders leveled_up_count in tile-value-strengthened [obligation]', () => {
    const wrapper = mountTile(makeSummary({ leveled_up_count: 3 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-strengthened"]').text()).toBe(
      '3'
    )
  })

  test('renders leveled_down_count in tile-value-weakened [obligation]', () => {
    const wrapper = mountTile(makeSummary({ leveled_down_count: 2 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-weakened"]').text()).toBe('2')
  })

  test('renders stuck_count in tile-value-stuck [obligation]', () => {
    const wrapper = mountTile(makeSummary({ stuck_count: 1 }))
    expect(wrapper.find('[data-testid="session-summary__tile-value-stuck"]').text()).toBe('1')
  })

  test('renders all four stat rows', () => {
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

  test('zero counts render as "0"', () => {
    const wrapper = mountTile(makeSummary())
    expect(wrapper.find('[data-testid="session-summary__tile-value-new"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="session-summary__tile-value-strengthened"]').text()).toBe(
      '0'
    )
    expect(wrapper.find('[data-testid="session-summary__tile-value-weakened"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="session-summary__tile-value-stuck"]').text()).toBe('0')
  })

  // ── Viewport layout switching [obligation] ────────────────────────────────

  test('desktop viewport renders the tile container [obligation]', () => {
    const wrapper = mountTile(makeSummary(), 'desktop')
    expect(wrapper.find('[data-testid="session-summary__tile"]').exists()).toBe(true)
  })

  test('mobile viewport renders the tile container [obligation]', () => {
    const wrapper = mountTile(makeSummary(), 'mobile')
    expect(wrapper.find('[data-testid="session-summary__tile"]').exists()).toBe(true)
  })

  test('mobile viewport renders all four stat rows', () => {
    const wrapper = mountTile(
      makeSummary({ new_count: 2, leveled_up_count: 1, leveled_down_count: 0, stuck_count: 3 }),
      'mobile'
    )
    expect(wrapper.find('[data-testid="session-summary__tile-value-new"]').text()).toBe('2')
    expect(wrapper.find('[data-testid="session-summary__tile-value-strengthened"]').text()).toBe(
      '1'
    )
    expect(wrapper.find('[data-testid="session-summary__tile-value-weakened"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="session-summary__tile-value-stuck"]').text()).toBe('3')
  })
})
