import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import StatsPanel from '@/views/study-session/session-summary/stats-panel.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSummary(overrides = {}) {
  return {
    total: 0,
    incorrect: [],
    groups: { correct: [], new: [], strengthened: [], weakened: [], stuck: [] },
    ...overrides
  }
}

function mountPanel(summary) {
  return shallowMount(StatsPanel, { props: { summary } })
}

function entries(wrapper) {
  return wrapper.findComponent({ name: 'UiOptionsPanel' }).props('entries')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StatsPanel', () => {
  describe('correct row exemption [obligation]', () => {
    test('renders the correct row even when its group is empty', () => {
      const wrapper = mountPanel(makeSummary())
      const values = entries(wrapper).map((e) => e.value)

      expect(values).toContain('correct')
    })

    test("correct row's label is a fraction of count/total", () => {
      const summary = makeSummary({
        total: 5,
        groups: { correct: [{}, {}], new: [], strengthened: [], weakened: [], stuck: [] }
      })
      const wrapper = mountPanel(summary)
      const correct_entry = entries(wrapper).find((e) => e.value === 'correct')

      expect(correct_entry.label).toBe('2/5 Cards Correct')
    })
  })

  describe('other rows hidden when empty [obligation]', () => {
    test('hides new/strengthened/weakened/stuck rows when their groups are empty', () => {
      const wrapper = mountPanel(makeSummary())
      const values = entries(wrapper).map((e) => e.value)

      expect(values).not.toContain('new')
      expect(values).not.toContain('strengthened')
      expect(values).not.toContain('weakened')
      expect(values).not.toContain('stuck')
    })

    test('shows a row once its group has at least one entry', () => {
      const summary = makeSummary({
        groups: { correct: [], new: [{}], strengthened: [], weakened: [], stuck: [] }
      })
      const wrapper = mountPanel(summary)
      const values = entries(wrapper).map((e) => e.value)

      expect(values).toContain('new')
    })

    test('non-correct row label is a pluralized count, not a fraction', () => {
      const summary = makeSummary({
        groups: { correct: [], new: [{}, {}], strengthened: [], weakened: [], stuck: [] }
      })
      const wrapper = mountPanel(summary)
      const new_entry = entries(wrapper).find((e) => e.value === 'new')

      expect(new_entry.label).toBe('2 New Cards')
    })
  })

  test('emits select with the pressed category when the panel emits select', () => {
    const wrapper = mountPanel(makeSummary())
    wrapper.findComponent({ name: 'UiOptionsPanel' }).vm.$emit('select', 'correct')

    expect(wrapper.emitted('select')).toEqual([['correct']])
  })
})
