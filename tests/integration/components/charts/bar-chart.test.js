import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import BarChart from '@/components/charts/bar-chart.vue'

function makeWrapper(bars, props = {}) {
  return shallowMount(BarChart, { props: { bars, ...props } })
}

// ── Rendering ──────────────────────────────────────────────────────────────────

describe('UiBarChart — rendering', () => {
  test('renders root element', () => {
    const wrapper = makeWrapper([{ value: 5, label: 'Mon' }])

    expect(wrapper.find('[data-testid="ui-bar-chart"]').exists()).toBe(true)
  })

  test('renders one bar element per entry', () => {
    const bars = [
      { value: 3, label: 'A' },
      { value: 7, label: 'B' },
      { value: 2, label: 'C' }
    ]
    const wrapper = makeWrapper(bars)

    expect(wrapper.findAll('[data-testid="ui-bar-chart__bar"]')).toHaveLength(3)
  })
})

// ── Labels [obligation] ────────────────────────────────────────────────────────

describe('UiBarChart — labels [obligation]', () => {
  test('bar label text is rendered for each bar', () => {
    const bars = [
      { value: 5, label: 'Mon' },
      { value: 3, label: 'Tue' }
    ]
    const wrapper = makeWrapper(bars)

    const text = wrapper.text()
    expect(text).toContain('Mon')
    expect(text).toContain('Tue')
  })

  test('bar value is displayed', () => {
    const wrapper = makeWrapper([{ value: 42, label: 'Count' }])

    expect(wrapper.text()).toContain('42')
  })
})

// ── Proportional heights [obligation] ──────────────────────────────────────────

describe('UiBarChart — proportional heights [obligation]', () => {
  test('tallest bar has height equal to trackHeight', () => {
    const bars = [
      { value: 10, label: 'max' },
      { value: 5, label: 'half' }
    ]
    const wrapper = makeWrapper(bars, { trackHeight: 100 })

    // The inner div (not the outer wrapper bar div) carries the height style
    const bar_divs = wrapper.findAll('[data-testid="ui-bar-chart__bar"]')

    // First bar is the max — should have height 100px
    const max_bar_inner = bar_divs[0].find('div')
    expect(max_bar_inner.attributes('style')).toContain('height: 100px')
  })

  test('bar with half the max value has half the height', () => {
    const bars = [
      { value: 10, label: 'max' },
      { value: 5, label: 'half' }
    ]
    const wrapper = makeWrapper(bars, { trackHeight: 100 })

    const bar_divs = wrapper.findAll('[data-testid="ui-bar-chart__bar"]')
    const half_bar_inner = bar_divs[1].find('div')
    expect(half_bar_inner.attributes('style')).toContain('height: 50px')
  })

  test('all zero values still render without divide-by-zero crash', () => {
    const bars = [{ value: 0, label: 'none' }]
    // max is coerced to 1 to avoid division by zero
    const wrapper = makeWrapper(bars, { trackHeight: 100 })

    expect(wrapper.findAll('[data-testid="ui-bar-chart__bar"]')).toHaveLength(1)
  })
})

// ── Label truncation (single-line) [obligation] ────────────────────────────────

describe('UiBarChart — label is single-line (truncate) [obligation]', () => {
  test('label element has truncate class (single-line, not wrapped)', () => {
    const wrapper = makeWrapper([{ value: 5, label: 'A very long label that could wrap' }])

    const bar = wrapper.find('[data-testid="ui-bar-chart__bar"]')
    // The label span should carry the truncate Tailwind class
    const label_span = bar.findAll('span').find((s) => s.text().includes('A very long'))
    expect(label_span?.classes()).toContain('truncate')
  })
})

// ── Empty bars array ───────────────────────────────────────────────────────────

describe('UiBarChart — empty bars array', () => {
  test('empty bars renders no bar elements', () => {
    const wrapper = makeWrapper([])

    expect(wrapper.findAll('[data-testid="ui-bar-chart__bar"]')).toHaveLength(0)
  })
})
