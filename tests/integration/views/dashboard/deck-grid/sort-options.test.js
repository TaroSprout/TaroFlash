import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import DeckGridSortOptions from '@/views/dashboard/deck-grid/sort-options.vue'

const OPTION_TESTIDS = [
  'deck-grid-sort-options__custom',
  'deck-grid-sort-options__date-created',
  'deck-grid-sort-options__last-updated',
  'deck-grid-sort-options__last-studied'
]

function mount(props) {
  return shallowMount(DeckGridSortOptions, { props })
}

describe('DeckGridSortOptions — options rendered', () => {
  test('renders exactly 4 options', () => {
    const wrapper = mount()
    expect(
      OPTION_TESTIDS.every((testid) => wrapper.find(`[data-testid="${testid}"]`).exists())
    ).toBe(true)
    expect(wrapper.findAll('[data-testid^="deck-grid-sort-options__"]')).toHaveLength(4)
  })
})

describe('DeckGridSortOptions — selected default', () => {
  test('defaults to custom when selected is omitted', () => {
    const wrapper = mount()
    expect(
      wrapper.find('[data-testid="deck-grid-sort-options__custom"]').attributes('data-active')
    ).toBe('true')
  })

  test('only custom has data-active=true by default, others are false', () => {
    const wrapper = mount()
    const others = OPTION_TESTIDS.filter((testid) => testid !== 'deck-grid-sort-options__custom')
    others.forEach((testid) => {
      expect(wrapper.find(`[data-testid="${testid}"]`).attributes('data-active')).toBe('false')
    })
  })
})

describe('DeckGridSortOptions — selected prop drives data-active', () => {
  test('marks only the matching option as data-active=true', () => {
    const wrapper = mount({ selected: 'last-studied' })

    expect(
      wrapper.find('[data-testid="deck-grid-sort-options__last-studied"]').attributes('data-active')
    ).toBe('true')

    OPTION_TESTIDS.filter((testid) => testid !== 'deck-grid-sort-options__last-studied').forEach(
      (testid) => {
        expect(wrapper.find(`[data-testid="${testid}"]`).attributes('data-active')).toBe('false')
      }
    )
  })
})
