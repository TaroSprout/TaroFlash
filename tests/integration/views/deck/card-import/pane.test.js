import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const matchMediaMock = vi.fn()
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: (...args) => matchMediaMock(...args)
}))

import Pane from '@/views/deck/card-import/pane.vue'
import { cardImportKey } from '@/views/deck/composables/card-import'

function makeDraft({ has_cards = false, layout = 'grid' } = {}) {
  return { has_cards: ref(has_cards), layout: ref(layout) }
}

function mount(draft = makeDraft(), isMobile = false) {
  matchMediaMock.mockReturnValue(ref(isMobile))
  return shallowMount(Pane, { global: { provide: { [cardImportKey]: draft } } })
}

describe('card-import/pane', () => {
  test('shows the empty state when there are no cards', () => {
    const wrapper = mount(makeDraft({ has_cards: false }))
    expect(wrapper.find('[data-testid="card-import-pane__empty"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PreviewGrid' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'PreviewList' }).exists()).toBe(false)
  })

  test('shows the grid preview by default once cards are loaded', () => {
    const wrapper = mount(makeDraft({ has_cards: true, layout: 'grid' }))
    expect(wrapper.find('[data-testid="card-import-pane__empty"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'PreviewGrid' }).exists()).toBe(true)
  })

  test('shows the list preview when layout is list on a wide screen', () => {
    const wrapper = mount(makeDraft({ has_cards: true, layout: 'list' }), false)
    expect(wrapper.findComponent({ name: 'PreviewList' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PreviewGrid' }).exists()).toBe(false)
  })

  test('a narrow screen always shows the grid preview, even when layout is list', () => {
    const wrapper = mount(makeDraft({ has_cards: true, layout: 'list' }), true)
    expect(wrapper.findComponent({ name: 'PreviewGrid' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PreviewList' }).exists()).toBe(false)
  })
})
