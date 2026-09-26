import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { h, ref } from 'vue'
import PageStrip from '@/views/reader/page-strip.vue'

const { mockUsePageStrip, captured } = vi.hoisted(() => ({
  mockUsePageStrip: vi.fn(),
  captured: { onTurn: null }
}))

vi.mock('@/views/reader/composables/page-strip', () => ({
  usePageStrip: mockUsePageStrip
}))

function makeVirtualizer(items) {
  return ref({
    getTotalSize: () => 1000,
    getVirtualItems: () => items.map((index) => ({ index, start: index * 100, size: 100 }))
  })
}

beforeEach(() => {
  captured.onTurn = null
  mockUsePageStrip.mockImplementation((options) => {
    captured.onTurn = options.onTurn
    return { virtualizer: makeVirtualizer([0]), at_rest: ref(true) }
  })
})

describe('PageStrip', () => {
  test('renders one spread element per virtual item, sized to the track total', () => {
    mockUsePageStrip.mockReturnValue({ virtualizer: makeVirtualizer([0, 1]), at_rest: ref(true) })
    const wrapper = shallowMount(PageStrip, {
      props: { pageCount: 4, twoPage: false, viewportWidth: 400, spread: 0 }
    })

    expect(wrapper.find('[data-testid="page-strip__track"]').attributes('style')).toContain(
      'width: 1000px'
    )
    expect(wrapper.findAll('[data-testid="page-strip__spread"]')).toHaveLength(2)
  })

  test('single-page mode renders one slot per spread', () => {
    const wrapper = shallowMount(PageStrip, {
      props: { pageCount: 4, twoPage: false, viewportWidth: 400, spread: 0 }
    })

    const slots = wrapper.findAll('[data-testid="page-strip__slot"]')
    expect(slots).toHaveLength(1)
  })

  test('two-page mode renders a primary and secondary slot in the same spread', () => {
    const wrapper = shallowMount(PageStrip, {
      props: { pageCount: 4, twoPage: true, viewportWidth: 900, spread: 0 }
    })

    const slots = wrapper.findAll('[data-testid="page-strip__slot"]')
    expect(slots).toHaveLength(2)
  })

  test('forwards pageIndex and primary through the default slot', () => {
    const wrapper = shallowMount(PageStrip, {
      props: { pageCount: 4, twoPage: true, viewportWidth: 900, spread: 0 },
      slots: {
        default: (props) =>
          h('div', {
            'data-testid': 'slot-content',
            'data-page-index': props.pageIndex,
            'data-primary': String(props.primary)
          })
      }
    })

    const content = wrapper.findAll('[data-testid="slot-content"]')
    expect(content.map((c) => c.attributes('data-page-index'))).toEqual(['0', '1'])
    expect(content.map((c) => c.attributes('data-primary'))).toEqual(['true', 'false'])
  })

  test('emits turn when the composable calls onTurn', () => {
    const wrapper = shallowMount(PageStrip, {
      props: { pageCount: 4, twoPage: false, viewportWidth: 400, spread: 0 }
    })

    captured.onTurn(2)

    expect(wrapper.emitted('turn')).toEqual([[2]])
  })

  test('passes scroller.getElement, spread_count and item_size derived from props to the composable', () => {
    shallowMount(PageStrip, {
      props: { pageCount: 5, twoPage: true, viewportWidth: 900, spread: 1 }
    })

    const options = mockUsePageStrip.mock.calls.at(-1)[0]
    expect(options.spread_count()).toBe(3)
    expect(options.item_size()).toBe(900)
    expect(options.desired_spread()).toBe(1)
  })
})
