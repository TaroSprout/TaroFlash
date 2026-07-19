import { describe, test, expect } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ReviewInboxSkeleton from '@/views/dashboard/review-inbox/skeleton.vue'

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
        'data-shimmer': String(props.shimmer)
      })
  }
})

function mountSkeleton(props = {}) {
  return shallowMount(ReviewInboxSkeleton, {
    props,
    global: { stubs: { Card: CardStub } }
  })
}

describe('ReviewInboxSkeleton (views/dashboard/review-inbox/skeleton.vue) [obligation]', () => {
  test('renders the root with data-testid="review-inbox-skeleton"', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.find('[data-testid="review-inbox-skeleton"]').exists()).toBe(true)
  })

  test('renders 6 item pairs by default (count=6)', () => {
    const wrapper = mountSkeleton()
    expect(wrapper.findAll('[data-testid="review-inbox-skeleton__item"]')).toHaveLength(6)
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(6)
    expect(wrapper.findAll('[data-testid="review-inbox-skeleton__label"]')).toHaveLength(6)
  })

  test('renders exactly count item pairs when count prop is provided', () => {
    const wrapper = mountSkeleton({ count: 3 })
    expect(wrapper.findAll('[data-testid="review-inbox-skeleton__item"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="card-stub"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="review-inbox-skeleton__label"]')).toHaveLength(3)
  })

  test('renders 1 item pair when count=1', () => {
    const wrapper = mountSkeleton({ count: 1 })
    expect(wrapper.findAll('[data-testid="review-inbox-skeleton__item"]')).toHaveLength(1)
  })

  test('all cards use side="cover" and shimmer=true', () => {
    const wrapper = mountSkeleton()
    for (const card of wrapper.findAllComponents(CardStub)) {
      expect(card.props('side')).toBe('cover')
      expect(card.props('shimmer')).toBe(true)
    }
  })
})
