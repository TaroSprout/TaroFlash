import { describe, test, expect, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

const { useMatchMediaMock } = vi.hoisted(() => ({
  useMatchMediaMock: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: useMatchMediaMock
}))

import DeckGridSkeleton from '@/views/dashboard/deck-grid/skeleton.vue'

const CardStub = defineComponent({
  name: 'Card',
  props: {
    size: String,
    side: String,
    shimmer: Boolean,
    cover_config: Object
  },
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'card-stub',
        'data-size': props.size,
        'data-side': props.side,
        'data-shimmer': String(props.shimmer),
        'data-cover-palette': props.cover_config?.palette,
        'data-cover-pattern': props.cover_config?.pattern
      })
  }
})

function mountSkeleton(props = {}, is_md = true) {
  useMatchMediaMock.mockReturnValue(ref(is_md))
  return shallowMount(DeckGridSkeleton, {
    props,
    global: { stubs: { Card: CardStub } }
  })
}

describe('DeckGridSkeleton (views/dashboard/deck-grid/skeleton.vue)', () => {
  test('renders the root with data-testid="deck-grid-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="deck-grid-skeleton"]').exists()).toBe(true)
  })

  test('renders 12 card stubs by default (count=12)', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(12)
  })

  test('renders exactly count card stubs when count prop is provided', () => {
    const wrapper = mountSkeleton({ count: 5 })
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(5)
  })

  test('all cards use side="cover" and shimmer=true', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAllComponents(CardStub)) {
      expect(card.props('side')).toBe('cover')
      expect(card.props('shimmer')).toBe(true)
    }
  })

  test('all cards use the DEFAULT_COVER pattern (no palette — neutral chrome)', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAllComponents(CardStub)) {
      expect(card.props('cover_config')).toEqual({
        pattern: 'diagonal-stripes'
      })
    }
  })
})
