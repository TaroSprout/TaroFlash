import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, useAttrs } from 'vue'
import DailyLimits from '@/views/deck/deck-settings/tab-review-pacing/advanced-pacing-modal/daily-limits.vue'

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: {
    value: { type: Number, required: true },
    pill_label: { type: String, default: undefined },
    pill_active: { type: Boolean, default: false }
  },
  emits: ['update:value', 'update:pill_active'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('div', { ...attrs, 'data-testid': 'ui-spinbox', 'data-value': String(props.value) }, [
        h(
          'button',
          {
            'data-testid': 'ui-spinbox__increment',
            onClick: () => emit('update:value', props.value + 1)
          },
          '+'
        )
      ])
  }
})

function makeWrapper(props = {}) {
  const deck = { id: 1, card_count: undefined, ...props.deck }
  const wrapper = mount(DailyLimits, {
    props: { deck, max_reviews: 50, max_new: 10, ...props },
    global: { stubs: { UiSpinbox: SpinboxStub } }
  })
  return { wrapper }
}

describe('DailyLimits', () => {
  test('renders both the max-reviews and max-new rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__max-reviews"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-new"]').exists()).toBe(true)
  })

  test('reviews spinbox reflects max_reviews', () => {
    const { wrapper } = makeWrapper({ max_reviews: 75 })
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe('75')
  })

  test('new-cards spinbox reflects max_new', () => {
    const { wrapper } = makeWrapper({ max_new: 25 })
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__max-new"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe('25')
  })

  test('incrementing max-reviews emits update:max_reviews', async () => {
    const { wrapper } = makeWrapper({ max_reviews: 50 })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')
    expect(wrapper.emitted('update:max_reviews')).toEqual([[51]])
  })

  test('incrementing max-new emits update:max_new', async () => {
    const { wrapper } = makeWrapper({ max_new: 10 })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')
    expect(wrapper.emitted('update:max_new')).toEqual([[11]])
  })

  test('clicking the max-reviews reset button emits reset:max_reviews [obligation]', async () => {
    const { wrapper } = makeWrapper({ has_max_reviews_override: true })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="tooltip-row__reset"]')
      .trigger('click')
    expect(wrapper.emitted('reset:max_reviews')).toHaveLength(1)
  })

  test('clicking the max-new reset button emits reset:max_new [obligation]', async () => {
    const { wrapper } = makeWrapper({ has_max_new_override: true })
    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="tooltip-row__reset"]')
      .trigger('click')
    expect(wrapper.emitted('reset:max_new')).toHaveLength(1)
  })
})
