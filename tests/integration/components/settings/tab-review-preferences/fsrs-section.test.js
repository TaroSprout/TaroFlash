import { describe, test, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, useAttrs } from 'vue'
import FsrsSection from '@/components/settings/tab-review-preferences/fsrs-section.vue'
import { memberEditorKey } from '@/composables/member/editor'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const LabeledSectionStub = defineComponent({
  name: 'LabeledSection',
  props: { label: String, description: String },
  setup(_p, { slots }) {
    return () => h('div', { 'data-testid': 'labeled-section' }, slots.default?.())
  }
})

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: { value: Number, min: Number, max: Number },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h('div', {
        ...attrs,
        'data-testid': 'spinbox-stub',
        'data-value': String(props.value),
        'data-min': String(props.min),
        'data-max': String(props.max),
        onClick: () => emit('update:value', props.value + 1)
      })
  }
})

// Renders one option button per option, and exposes the current value via
// data-value so tests can assert the round-trip from stored array → key.
const SelectMenuStub = defineComponent({
  name: 'UiSelectMenu',
  props: { modelValue: { type: String, default: '' }, options: { type: Array, default: () => [] } },
  emits: ['update:modelValue'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': 'select-menu-stub',
          'data-value': props.modelValue
        },
        props.options.map((o) =>
          h(
            'button',
            {
              'data-testid': `select-menu-stub__option-${o.value}`,
              onClick: () => emit('update:modelValue', o.value)
            },
            o.label
          )
        )
      )
  }
})

const TooltipStub = defineComponent({
  name: 'UiTooltip',
  props: { text: String },
  setup(_p, { slots }) {
    return () => h('span', { 'data-testid': 'tooltip-stub' }, slots.default?.())
  }
})

const IconStub = defineComponent({
  name: 'UiIcon',
  props: { src: String },
  setup() {
    return () => h('span', { 'data-testid': 'icon-stub' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSection({
  desired_retention = 90,
  learning_steps = ['1m', '10m'],
  relearning_steps = ['10m']
} = {}) {
  const editor = {
    preferences: reactive({ study: { desired_retention, learning_steps, relearning_steps } })
  }
  const wrapper = mount(FsrsSection, {
    global: {
      stubs: {
        LabeledSection: LabeledSectionStub,
        UiSpinbox: SpinboxStub,
        UiSelectMenu: SelectMenuStub,
        UiTooltip: TooltipStub,
        UiIcon: IconStub
      },
      mocks: { $t: (k) => k },
      provide: { [memberEditorKey]: editor }
    }
  })
  return { wrapper, editor }
}

function learningSelect(wrapper) {
  return wrapper
    .find('[data-testid="tab-review-preferences__fsrs-learning-steps"]')
    .findComponent(SelectMenuStub)
}

function relearningSelect(wrapper) {
  return wrapper
    .find('[data-testid="tab-review-preferences__fsrs-relearning-steps"]')
    .findComponent(SelectMenuStub)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FsrsSection', () => {
  test('renders the fsrs container', () => {
    const { wrapper } = makeSection()
    expect(wrapper.find('[data-testid="tab-review-preferences__fsrs"]').exists()).toBe(true)
  })

  test('spinbox is bound to editor.preferences.study.desired_retention with min 70 max 97, no suffix [obligation]', () => {
    const { wrapper } = makeSection({ desired_retention: 85 })
    const spinbox = wrapper.find('[data-testid="spinbox-stub"]')
    expect(spinbox.attributes('data-value')).toBe('85')
    expect(spinbox.attributes('data-min')).toBe('70')
    expect(spinbox.attributes('data-max')).toBe('97')
    expect(spinbox.attributes('suffix')).toBeUndefined()
  })

  test('changing the spinbox updates editor.preferences.study.desired_retention', async () => {
    const { wrapper, editor } = makeSection({ desired_retention: 90 })
    await wrapper.find('[data-testid="spinbox-stub"]').trigger('click')
    expect(editor.preferences.study.desired_retention).toBe(91)
  })

  // ── keyForSteps round-trip [obligation] ─────────────────────────────────────
  // For every preset key, reading the computed off the matching stored array
  // must resolve back to that same key — the get/set halves of keyForSteps
  // must agree with each other.

  describe('learning_steps_key round-trip [obligation]', () => {
    const LEARNING_CASES = [
      ['none', []],
      ['10m', ['10m']],
      ['1m-10m', ['1m', '10m']],
      ['1m-10m-1d', ['1m', '10m', '1d']]
    ]

    test.each(LEARNING_CASES)(
      'reading learning_steps=%s resolves the select to key %s',
      (key, steps) => {
        const { wrapper } = makeSection({ learning_steps: steps })
        expect(learningSelect(wrapper).props('modelValue')).toBe(key)
      }
    )

    test.each(LEARNING_CASES)(
      'setting the learning select to key %s writes %s to editor.preferences.study.learning_steps',
      async (key, steps) => {
        const { wrapper, editor } = makeSection({ learning_steps: ['10m'] })
        await learningSelect(wrapper).vm.$emit('update:modelValue', key)
        expect(editor.preferences.study.learning_steps).toEqual(steps)
      }
    )
  })

  describe('relearning_steps_key round-trip [obligation]', () => {
    const RELEARNING_CASES = [
      ['none', []],
      ['10m', ['10m']],
      ['1m-10m', ['1m', '10m']]
    ]

    test.each(RELEARNING_CASES)(
      'reading relearning_steps=%s resolves the select to key %s',
      (key, steps) => {
        const { wrapper } = makeSection({ relearning_steps: steps })
        expect(relearningSelect(wrapper).props('modelValue')).toBe(key)
      }
    )

    test.each(RELEARNING_CASES)(
      'setting the relearning select to key %s writes %s to editor.preferences.study.relearning_steps',
      async (key, steps) => {
        const { wrapper, editor } = makeSection({ relearning_steps: ['10m'] })
        await relearningSelect(wrapper).vm.$emit('update:modelValue', key)
        expect(editor.preferences.study.relearning_steps).toEqual(steps)
      }
    )
  })

  // ── keyForSteps fallback [obligation] ───────────────────────────────────────
  // A stray array matching no preset must resolve to 'none', not throw or
  // return undefined — this is a deliberate fallback in keyForSteps(), not a bug.

  test('a learning_steps array matching no preset (e.g. ["5m"]) resolves the select to "none" [obligation]', () => {
    const { wrapper } = makeSection({ learning_steps: ['5m'] })
    expect(learningSelect(wrapper).props('modelValue')).toBe('none')
  })

  test('a relearning_steps array matching no preset (e.g. ["5m"]) resolves the select to "none" [obligation]', () => {
    const { wrapper } = makeSection({ relearning_steps: ['5m'] })
    expect(relearningSelect(wrapper).props('modelValue')).toBe('none')
  })
})
