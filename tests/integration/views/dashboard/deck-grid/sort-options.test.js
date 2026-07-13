import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

import DeckGridSortOptions from '@/views/dashboard/deck-grid/sort-options.vue'

const OPTION_TESTIDS = [
  'deck-grid-sort-options__custom',
  'deck-grid-sort-options__date-created',
  'deck-grid-sort-options__last-updated'
]

function mount(props) {
  return shallowMount(DeckGridSortOptions, { props })
}

describe('DeckGridSortOptions — options rendered', () => {
  test('renders exactly 3 options', () => {
    const wrapper = mount()
    expect(
      OPTION_TESTIDS.every((testid) => wrapper.find(`[data-testid="${testid}"]`).exists())
    ).toBe(true)
    expect(wrapper.findAll('[data-testid^="deck-grid-sort-options__"]')).toHaveLength(3)
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
    const wrapper = mount({ selected: 'last-updated' })

    expect(
      wrapper.find('[data-testid="deck-grid-sort-options__last-updated"]').attributes('data-active')
    ).toBe('true')

    OPTION_TESTIDS.filter((testid) => testid !== 'deck-grid-sort-options__last-updated').forEach(
      (testid) => {
        expect(wrapper.find(`[data-testid="${testid}"]`).attributes('data-active')).toBe('false')
      }
    )
  })
})

describe('DeckGridSortOptions — click behavior', () => {
  test('clicking a non-selected option emits select with that key and plays snappy_button_5 [obligation]', async () => {
    const wrapper = mount({ selected: 'custom' })

    await wrapper.find('[data-testid="deck-grid-sort-options__date-created"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['date-created']])
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('clicking the currently selected option still emits select but plays digi_powerdown [obligation]', async () => {
    const wrapper = mount({ selected: 'custom' })

    await wrapper.find('[data-testid="deck-grid-sort-options__custom"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['custom']])
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })
})
