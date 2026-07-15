import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import StackedBar from '@/components/charts/stacked-bar.vue'

function makeWrapper(segments, props = {}) {
  return shallowMount(StackedBar, { props: { segments, ...props } })
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('UiStackedBar — rendering', () => {
  test('renders the root element', () => {
    const wrapper = makeWrapper([{ value: 5, colorClass: 'bg-green-500' }])

    expect(wrapper.find('[data-testid="ui-stacked-bar"]').exists()).toBe(true)
  })

  test('renders one segment per non-zero entry', () => {
    const segments = [
      { value: 3, colorClass: 'bg-red-500' },
      { value: 7, colorClass: 'bg-blue-500' }
    ]
    const wrapper = makeWrapper(segments)

    expect(wrapper.findAll('[data-testid="ui-stacked-bar__segment"]')).toHaveLength(2)
  })
})

// ── Zero-value segments skipped [obligation] ──────────────────────────────────

describe('UiStackedBar — skips zero-value segments [obligation]', () => {
  test('segment with value=0 is not rendered', () => {
    const segments = [
      { value: 0, colorClass: 'bg-red-500', key: 'a' },
      { value: 5, colorClass: 'bg-green-500', key: 'b' }
    ]
    const wrapper = makeWrapper(segments)

    expect(wrapper.findAll('[data-testid="ui-stacked-bar__segment"]')).toHaveLength(1)
  })

  test('all zero segments → no segments rendered', () => {
    const segments = [
      { value: 0, colorClass: 'bg-red-500' },
      { value: 0, colorClass: 'bg-blue-500' }
    ]
    const wrapper = makeWrapper(segments)

    expect(wrapper.findAll('[data-testid="ui-stacked-bar__segment"]')).toHaveLength(0)
  })

  test('mix of zero and non-zero — only non-zero rendered', () => {
    const segments = [
      { value: 0, colorClass: 'bg-red-500', key: 'zero' },
      { value: 10, colorClass: 'bg-green-500', key: 'ten' },
      { value: 0, colorClass: 'bg-blue-500', key: 'also-zero' },
      { value: 5, colorClass: 'bg-yellow-500', key: 'five' }
    ]
    const wrapper = makeWrapper(segments)

    expect(wrapper.findAll('[data-testid="ui-stacked-bar__segment"]')).toHaveLength(2)
  })
})

// ── Proportional widths ────────────────────────────────────────────────────────

describe('UiStackedBar — proportional widths', () => {
  test('segment width is proportional to its share of the total', () => {
    const segments = [
      { value: 25, colorClass: 'bg-red-500', key: 'a' },
      { value: 75, colorClass: 'bg-green-500', key: 'b' }
    ]
    const wrapper = makeWrapper(segments)
    const rendered = wrapper.findAll('[data-testid="ui-stacked-bar__segment"]')

    expect(rendered[0].attributes('style')).toContain('width: 25%')
    expect(rendered[1].attributes('style')).toContain('width: 75%')
  })

  test('single segment fills 100%', () => {
    const wrapper = makeWrapper([{ value: 42, colorClass: 'bg-green-500' }])

    const segment = wrapper.find('[data-testid="ui-stacked-bar__segment"]')
    expect(segment.attributes('style')).toContain('width: 100%')
  })
})

// ── Empty segments ─────────────────────────────────────────────────────────────

describe('UiStackedBar — empty segments array', () => {
  test('empty segments renders no segment elements', () => {
    const wrapper = makeWrapper([])

    expect(wrapper.findAll('[data-testid="ui-stacked-bar__segment"]')).toHaveLength(0)
  })
})
