import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/pacing-fields'
import LimitsSection from '@/views/deck/deck-settings/tab-review-pacing/limits-section.vue'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: { value: { type: Number, required: true }, min: Number, max: Number },
  emits: ['update:value'],
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

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeWrapper({ deck: deckOverrides = {}, pacingFieldsOverrides = {} } = {}) {
  const deck = { id: 1, card_count: 100, ...deckOverrides }
  const resetMaxReviewsPerDay = vi.fn()
  const resetMaxNewPerDay = vi.fn()
  const pacing_fields = {
    max_reviews_per_day: ref(10),
    max_new_per_day: ref(5),
    has_max_reviews_override: ref(false),
    has_max_new_override: ref(false),
    resetMaxReviewsPerDay,
    resetMaxNewPerDay,
    ...pacingFieldsOverrides
  }
  const wrapper = mount(LimitsSection, {
    global: {
      provide: { [deckEditorKey]: { deck }, [pacingFieldsKey]: pacing_fields },
      stubs: { UiSpinbox: SpinboxStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, pacing_fields, resetMaxReviewsPerDay, resetMaxNewPerDay }
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('LimitsSection — rendering', () => {
  test('renders the max-reviews and max-new rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__max-reviews"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-new"]').exists()).toBe(true)
  })

  test('reads its shared instance from the pacingFieldsKey injection, not by calling usePacingFields directly [obligation]', () => {
    const { wrapper, pacing_fields } = makeWrapper()
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe(String(pacing_fields.max_reviews_per_day.value))
  })

  test('caps both spinboxes at deck.card_count', () => {
    const { wrapper } = makeWrapper({ deck: { card_count: 42 } })
    const spinboxes = wrapper.findAllComponents(SpinboxStub)
    expect(spinboxes[0].props('max')).toBe(42)
    expect(spinboxes[1].props('max')).toBe(42)
  })
})

// ── writes ────────────────────────────────────────────────────────────────────

describe('LimitsSection — writes through the injected computeds', () => {
  test('bumping the max-reviews spinbox writes through max_reviews_per_day', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing_fields.max_reviews_per_day.value).toBe(11)
  })

  test('bumping the max-new spinbox writes through max_new_per_day', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing_fields.max_new_per_day.value).toBe(6)
  })
})

// ── reset wiring [obligation] ──────────────────────────────────────────────────

describe('LimitsSection — reset wiring [obligation]', () => {
  test('resetting the max-reviews row calls resetMaxReviewsPerDay [obligation]', async () => {
    const { wrapper, resetMaxReviewsPerDay } = makeWrapper({
      pacingFieldsOverrides: { has_max_reviews_override: ref(true) }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="tooltip-row__reset"]')
      .trigger('click')

    expect(resetMaxReviewsPerDay).toHaveBeenCalledOnce()
  })

  test('resetting the max-new row calls resetMaxNewPerDay [obligation]', async () => {
    const { wrapper, resetMaxNewPerDay } = makeWrapper({
      pacingFieldsOverrides: { has_max_new_override: ref(true) }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="tooltip-row__reset"]')
      .trigger('click')

    expect(resetMaxNewPerDay).toHaveBeenCalledOnce()
  })
})
