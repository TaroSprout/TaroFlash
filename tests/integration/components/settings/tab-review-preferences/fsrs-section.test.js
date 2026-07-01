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

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSection(desired_retention = 90) {
  const editor = { preferences: reactive({ study: { desired_retention } }) }
  const wrapper = mount(FsrsSection, {
    global: {
      stubs: { LabeledSection: LabeledSectionStub, UiSpinbox: SpinboxStub },
      mocks: { $t: (k) => k },
      provide: { [memberEditorKey]: editor }
    }
  })
  return { wrapper, editor }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FsrsSection', () => {
  test('renders the fsrs container', () => {
    const { wrapper } = makeSection()
    expect(wrapper.find('[data-testid="tab-review-preferences__fsrs"]').exists()).toBe(true)
  })

  test('spinbox is bound to editor.preferences.study.desired_retention with min 70 max 97, no suffix [obligation]', () => {
    const { wrapper } = makeSection(85)
    const spinbox = wrapper.find('[data-testid="spinbox-stub"]')
    expect(spinbox.attributes('data-value')).toBe('85')
    expect(spinbox.attributes('data-min')).toBe('70')
    expect(spinbox.attributes('data-max')).toBe('97')
    expect(spinbox.attributes('suffix')).toBeUndefined()
  })

  test('changing the spinbox updates editor.preferences.study.desired_retention', async () => {
    const { wrapper, editor } = makeSection(90)
    await wrapper.find('[data-testid="spinbox-stub"]').trigger('click')
    expect(editor.preferences.study.desired_retention).toBe(91)
  })
})
