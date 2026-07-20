import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/use-pacing-fields'
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

function makeField({ value = 0, overridden = false, reset = vi.fn() } = {}) {
  return { value: ref(value), overridden: ref(overridden), reset }
}

function makeWrapper({ deck: deckOverrides = {}, fieldOverrides = {} } = {}) {
  const deck = { id: 1, card_count: 100, ...deckOverrides }
  const max_reviews_per_day = makeField({ value: 10 })
  const max_new_per_day = makeField({ value: 5 })
  const pacing_fields = {
    fields: {
      max_reviews_per_day,
      max_new_per_day,
      ...fieldOverrides
    }
  }
  const wrapper = mount(LimitsSection, {
    global: {
      provide: { [deckEditorKey]: { deck }, [pacingFieldsKey]: pacing_fields },
      stubs: { UiSpinbox: SpinboxStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, max_reviews_per_day, max_new_per_day }
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('LimitsSection — rendering', () => {
  test('renders the max-reviews and max-new rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__max-reviews"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-new"]').exists()).toBe(true)
  })

  test('reads its shared instance from the pacingFieldsKey injection, not by calling usePacingFields directly [obligation]', () => {
    const { wrapper, max_reviews_per_day } = makeWrapper()
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-value')).toBe(String(max_reviews_per_day.value.value))
  })

  test('leaves both spinboxes unbounded above, so a limit may exceed deck.card_count', () => {
    const { wrapper } = makeWrapper({ deck: { card_count: 42 } })
    const spinboxes = wrapper.findAllComponents(SpinboxStub)
    expect(spinboxes[0].props('max')).toBeUndefined()
    expect(spinboxes[1].props('max')).toBeUndefined()
  })
})

// ── writes ────────────────────────────────────────────────────────────────────

describe('LimitsSection — writes through the injected computeds', () => {
  test('bumping the max-reviews spinbox writes through fields.max_reviews_per_day.value', async () => {
    const { wrapper, max_reviews_per_day } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(max_reviews_per_day.value.value).toBe(11)
  })

  test('bumping the max-new spinbox writes through fields.max_new_per_day.value', async () => {
    const { wrapper, max_new_per_day } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(max_new_per_day.value.value).toBe(6)
  })
})

// ── reset wiring [obligation] ──────────────────────────────────────────────────

describe('LimitsSection — reset wiring [obligation]', () => {
  test('resetting the max-reviews row calls fields.max_reviews_per_day.reset [obligation]', async () => {
    const resetMaxReviewsPerDay = vi.fn()
    const { wrapper } = makeWrapper({
      fieldOverrides: {
        max_reviews_per_day: makeField({ overridden: true, reset: resetMaxReviewsPerDay })
      }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-reviews"] [data-testid="field-row__reset"]')
      .trigger('click')

    expect(resetMaxReviewsPerDay).toHaveBeenCalledOnce()
  })

  test('resetting the max-new row calls fields.max_new_per_day.reset [obligation]', async () => {
    const resetMaxNewPerDay = vi.fn()
    const { wrapper } = makeWrapper({
      fieldOverrides: {
        max_new_per_day: makeField({ overridden: true, reset: resetMaxNewPerDay })
      }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-new"] [data-testid="field-row__reset"]')
      .trigger('click')

    expect(resetMaxNewPerDay).toHaveBeenCalledOnce()
  })
})
